import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import axios from "axios";
import "../css/report.css";

export default function ReportPage() {
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const chartInstance1 = useRef(null);
  const chartInstance2 = useRef(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodType, setPeriodType] = useState("일별");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDataAndInitChart();

    return () => {
      if (chartInstance1.current) chartInstance1.current.destroy();
      if (chartInstance2.current) chartInstance2.current.destroy();
    };
  }, []);

  const fetchDataAndInitChart = async (customStart, customEnd) => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8080/mask/filling-packagings");
      const rawData = response.data;

      if (!rawData || rawData.length === 0) {
        renderCharts({ labels: [], passData: [], rateData: [], totalPass: 0, totalFail: 0 });
        return;
      }

      let reqStart = customStart;
      let reqEnd = customEnd;

      if (!reqStart || !reqEnd) {
        const dates = rawData
          .map((item) => extractFullTimestamp(item.timestamp || item.created_at || item.createdAt))
          .filter(Boolean)
          .sort();

        if (dates.length > 0) {
          reqStart = dates[0].split(" ")[0];
          reqEnd = dates[dates.length - 1].split(" ")[0];

          setStartDate(reqStart);
          setEndDate(reqEnd);
        }
      }

      // 시간대별(구간별) 집계 데이터 생성
      const intervalSummary = processIntervalData(rawData, reqStart, reqEnd);
      renderCharts(intervalSummary);
    } catch (error) {
      console.error("데이터 조회 실패:", error);
      renderCharts({ labels: [], passData: [], rateData: [], totalPass: 0, totalFail: 0 });
    } finally {
      setLoading(false);
    }
  };

  const extractFullTimestamp = (rawDate) => {
    if (!rawDate) return null;
    let str = rawDate.toString().replace("T", " ");
    if (str.includes(".")) {
      str = str.split(".")[0];
    }
    return str;
  };

  // [핵심 Logic] 초단위 데이터를 시간대/분 단위 구간(Interval)으로 그룹핑
  const processIntervalData = (dtoList, start, end) => {
    const intervalMap = {};
    let totalPass = 0;
    let totalFail = 0;

    dtoList.forEach((item) => {
      const timeStr = extractFullTimestamp(item.timestamp || item.created_at || item.createdAt);
      if (!timeStr) return;

      const dateOnly = timeStr.split(" ")[0];
      if (start && dateOnly < start) return;
      if (end && dateOnly > end) return;

      // 1. 시간 단위 키 생성 ("2023-01-12 23:00" 형태 - 시 단위 집계)
      // 만약 10분 단위 집계를 원하시면 timeStr.substring(0, 15) + "0" 으로 변경 가능
      const timeKey = timeStr.substring(0, 13) + ":00"; 

      if (!intervalMap[timeKey]) {
        intervalMap[timeKey] = { passCount: 0, failCount: 0 };
      }

      const disposition = (item.finalDisposition || item.final_disposition || "").toString().toUpperCase();
      const isPass = disposition.includes("ACCEPTED") || disposition.includes("PASS") || disposition.includes("OK");

      if (isPass) {
        intervalMap[timeKey].passCount += 1;
        totalPass += 1;
      } else {
        intervalMap[timeKey].failCount += 1;
        totalFail += 1;
      }
    });

    const labels = Object.keys(intervalMap).sort();
    
    // 해당 시간대에 생산된 양품 수량
    const passData = labels.map((key) => intervalMap[key].passCount);

    // 해당 시간대의 구간 불량률 (%)
    const rateData = labels.map((key) => {
      const pass = intervalMap[key].passCount;
      const fail = intervalMap[key].failCount;
      const total = pass + fail;
      return total > 0 ? Number(((fail / total) * 100).toFixed(2)) : 0;
    });

    return { labels, passData, rateData, totalPass, totalFail };
  };

  const handleSearch = () => {
    fetchDataAndInitChart(startDate, endDate);
  };

  // [차트 렌더링: 막대 + 꺾은선 콤보 차트]
  const renderCharts = ({ labels, passData, rateData, totalPass, totalFail }) => {
    if (chartRef1.current) {
      if (chartInstance1.current) chartInstance1.current.destroy();

      const hasData = labels && labels.length > 0;

      chartInstance1.current = new Chart(chartRef1.current, {
        data: {
          labels: hasData ? labels : ["조회 데이터 없음"],
          datasets: [
            {
              type: "bar", // 생산량은 시간대별 막대(Bar)로 표시
              label: "시간당 생산량 (EA)",
              data: hasData ? passData : [0],
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "#3b82f6",
              borderRadius: 4,
              yAxisID: "y",
            },
            {
              type: "line", // 불량률은 꺾은선(Line)으로 표시
              label: "시간당 불량률 (%)",
              data: hasData ? rateData : [0],
              borderColor: "#ef4444",
              backgroundColor: "#ef4444",
              borderDash: [3, 3],
              tension: 0.2,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                autoSkip: true,
                maxTicksLimit: 15,
              },
            },
            y: {
              type: "linear",
              position: "left",
              beginAtZero: true,
              title: { display: true, text: "시간당 생산량 (EA)" },
            },
            y1: {
              type: "linear",
              position: "right",
              beginAtZero: true,
              suggestedMax: 5,
              grid: { drawOnChartArea: false },
              title: { display: true, text: "불량률 (%)" },
            },
          },
        },
      });
    }

    if (chartRef2.current) {
      if (chartInstance2.current) chartInstance2.current.destroy();

      const hasData = totalPass > 0 || totalFail > 0;

      chartInstance2.current = new Chart(chartRef2.current, {
        type: "doughnut",
        data: {
          labels: hasData ? ["양품 (ACCEPTED)", "불량 (REJECTED)"] : ["데이터 없음"],
          datasets: [
            {
              data: hasData ? [totalPass, totalFail] : [1],
              backgroundColor: hasData ? ["#22c55e", "#ef4444"] : ["#e5e7eb"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }
  };

  return (
    <div className="report-page">
      <div className="report-toolbar">
        <span>기간</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span>~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <div className="period-btn-group">
          {["일별", "주별", "월별"].map((type) => (
            <button
              key={type}
              className={`period-btn ${periodType === type ? "active" : ""}`}
              onClick={() => setPeriodType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <button className="primary" onClick={handleSearch} disabled={loading}>
          {loading ? "조회 중..." : "조회"}
        </button>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <h3>시간대별 구간 생산량 및 불량률 추이</h3>
          <div className="chart-wrapper">
            <canvas ref={chartRef1}></canvas>
          </div>
        </div>

        <div className="report-card">
          <h3>전체 양품 / 불량 비율</h3>
          <div className="chart-wrapper">
            <canvas ref={chartRef2}></canvas>
          </div>
        </div>
      </div>

      <div className="report-card mt-16">
        <h3>원인 후보 분석 (정상 vs 불량 공정조건 비교)</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>공정조건</th>
              <th>정상 평균</th>
              <th>불량 평균</th>
              <th>차이</th>
              <th>확인 우선도</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="report-empty-state">
                {loading ? "데이터를 불러오는 중입니다..." : "비교할 데이터가 없습니다"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}