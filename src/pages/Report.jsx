import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import axios from "axios";
import "../css/report.css";

// ==========================================
// 차트 옵션 생성 헬퍼 함수
// ==========================================
const getComboChartConfig = ({ labels, passData, rateData }) => {
  const hasData = labels && labels.length > 0;

  // 불량률 꺾은선 그래프가 막대 그래프 상단으로 깔끔하게 떠오르도록 Y2 축 최대값 동적 계산
  const maxRate = hasData ? Math.max(...rateData, 0) : 0;
  const calculatedY1Max = maxRate > 0 ? Math.ceil(maxRate * 2.5) : 10;

  return {
    data: {
      labels: hasData ? labels : ["조회 데이터 없음"],
      datasets: [
        {
          type: "bar",
          label: "생산량 (EA)",
          data: hasData ? passData : [0],

          backgroundColor: "rgba(59, 130, 246, 0.25)", // 기존 0.75 -> 0.25로 연하게 변경
          borderColor: "#2563eb",                      // 테두리 선은 또렷한 파란색 유감없이 유지
          borderWidth: 1.5,                            // 테두리를 1.5px로 살짝 두껍게 설정
          borderRadius: 6,
          barThickness: 36,
          yAxisID: "y",
          datalabels: {
            color: "#0f172a", // 아주 진한 슬레이트 블랙 (또는 "#000000")
            anchor: "end",    // 막대 끝부분에 위치
            align: "top",     // 막대 상단 바깥쪽으로 띄우기 (막대 색상과 완전히 분리하여 더 잘 보이게 설정)
            font: {
              weight: "bold", // 글자 두께 굵게
              size: 13,       // 폰트 크기
            },
          },
        },
        {
          type: "line",
          label: "불량률 (%)",
          data: hasData ? rateData : [0],
          borderColor: "#ef4444",
          backgroundColor: "#ef4444",
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [4, 4],
          tension: 0.3,
          yAxisID: "y1",
          datalabels: {
            color: "#0f172a", // 아주 진한 슬레이트 블랙 (또는 "#000000")
            anchor: "end",    // 막대 끝부분에 위치
            align: "top",     // 막대 상단 바깥쪽으로 띄우기 (막대 색상과 완전히 분리하여 더 잘 보이게 설정)
            font: {
              weight: "bold", // 글자 두께 굵게
              size: 13,       // 폰트 크기
            },
          },
          
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // 창 크기 조절 시 비율 깨짐 방지 핵심
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { position: "top", align: "end" },
        tooltip: {
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}${ctx.datasetIndex === 1 ? "%" : " EA"}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        },
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          title: { display: true, text: "생산량 (EA)", font: { size: 12, weight: "bold" } },
        },
        y1: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          min: 0,
          max: calculatedY1Max, // 동적 최대값 적용으로 꺾은선과 막대 겹침 문제 해결
          grid: { drawOnChartArea: false },
          title: { display: true, text: "불량률 (%)", font: { size: 12, weight: "bold" } },
          ticks: { callback: (val) => `${val}%` },
        },
      },
    },
  };
};

const getDoughnutChartConfig = ({ totalPass, totalFail }) => {
  const hasData = totalPass > 0 || totalFail > 0;

  return {
    type: "doughnut",
    data: {
      labels: hasData ? ["양품 (ACCEPTED)", "불량 (REJECTED)"] : ["데이터 없음"],
      datasets: [
        {
          data: hasData ? [totalPass, totalFail] : [1],
          backgroundColor: hasData ? ["#22c55e", "#ef4444"] : ["#e5e7eb"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  };
};

// ==========================================
// 메인 컴포넌트
// ==========================================
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
    fetchSummaryData("일별", startDate, endDate);

    return () => {
      if (chartInstance1.current) chartInstance1.current.destroy();
      if (chartInstance2.current) chartInstance2.current.destroy();
    };
  }, []);

  // API 수신 및 차트 데이터 갱신
  const fetchSummaryData = async (type = periodType, start = startDate, end = endDate) => {
    try {
      setLoading(true);

      let groupBy = "daily";
      if (type === "시간별") groupBy = "hourly";
      if (type === "LOT별") groupBy = "lot";

      const response = await axios.get("http://localhost:8080/mask/filling-packagings/summary", {
        params: { groupBy, startDate: start, endDate: end },
      });

      const summaryList = response.data;

      if (!summaryList || summaryList.length === 0) {
        renderCharts({ labels: [], passData: [], rateData: [], totalPass: 0, totalFail: 0 });
        return;
      }

      const labels = summaryList.map((item) => item.timeGroup);
      const passData = summaryList.map((item) => item.passCount);
      const rateData = summaryList.map((item) => item.defectRate);

      const totalPass = passData.reduce((acc, cur) => acc + cur, 0);
      const totalFail = summaryList.map((item) => item.failCount).reduce((acc, cur) => acc + cur, 0);

      renderCharts({ labels, passData, rateData, totalPass, totalFail });
    } catch (error) {
      console.error("차트 데이터 조회 실패:", error);
      renderCharts({ labels: [], passData: [], rateData: [], totalPass: 0, totalFail: 0 });
    } finally {
      setLoading(false);
    }
  };

  // 차트 생성 및 인스턴스 관리
  const renderCharts = ({ labels, passData, rateData, totalPass, totalFail }) => {
    if (chartRef1.current) {
      if (chartInstance1.current) chartInstance1.current.destroy();
      chartInstance1.current = new Chart(chartRef1.current, getComboChartConfig({ labels, passData, rateData }));
    }

    if (chartRef2.current) {
      if (chartInstance2.current) chartInstance2.current.destroy();
      chartInstance2.current = new Chart(chartRef2.current, getDoughnutChartConfig({ totalPass, totalFail }));
    }
  };

  return (
    <div className="report-page">
      {/* 툴바 */}
      <div className="report-toolbar">
        <div className="toolbar-left">
          <span>조회 기간:</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span>~</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="toolbar-right">
          <div className="period-btn-group">
            {["일별", "시간별", "LOT별"].map((type) => (
              <button
                key={type}
                className={`period-btn ${periodType === type ? "active" : ""}`}
                onClick={() => {
                  setPeriodType(type);
                  fetchSummaryData(type, startDate, endDate);
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <button className="primary-btn" onClick={() => fetchSummaryData(periodType, startDate, endDate)} disabled={loading}>
            {loading ? "조회 중..." : "조회"}
          </button>
        </div>
      </div>

      {/* 1. 상단 메인 추이 차트 (100% 가로 전체 폭 활용) */}
      <div className="report-card">
        <h3>{periodType} 기준 생산량 및 불량률 추이</h3>
        <div className="chart-wrapper-large">
          <canvas ref={chartRef1}></canvas>
        </div>
      </div>

      {/* 2. 하단 2분할 영역 (도넛 차트 & 분석 테이블) */}
      <div className="report-bottom-grid">
        <div className="report-card">
          <h3>전체 양품 / 불량 비율</h3>
          <div className="chart-wrapper-small">
            <canvas ref={chartRef2}></canvas>
          </div>
        </div>

        <div className="report-card">
          <h3>원인 후보 분석 (정상 vs 불량 공정조건 비교)</h3>
          <div className="table-wrapper">
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
      </div>
    </div>
  );
}