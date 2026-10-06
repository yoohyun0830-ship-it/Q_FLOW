import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import axios from "axios";
import "../css/report.css";

// ==========================================
// 차트 옵션 생성 헬퍼 함수
// ==========================================
const getComboChartConfig = ({ labels, passData, rateData }) => {
    const hasData = Array.isArray(labels) && labels.length > 0;
    const itemCount = hasData ? labels.length : 0;

    return {
        type: "bar",

        data: {
            labels: hasData ? labels : [],

            datasets: [
                {
                    type: "bar",
                    label: "양품 수량 (EA)",
                    data: hasData ? passData : [],

                    backgroundColor: "rgba(59, 130, 246, 0.45)",
                    borderColor: "#2563eb",
                    borderWidth: 1,
                    borderRadius: 3,

                    // 너비를 고정하지 않고 항목 간격에 맞춰 조절
                    maxBarThickness: 32,
                    categoryPercentage: 0.8,
                    barPercentage: 0.8,

                    yAxisID: "y",
                    order: 2
                },
                {
                    type: "line",

                    // 현재 SQL은 양품 외의 값과 미판정까지 포함
                    label: "미합격 비율 (%)",
                    data: hasData ? rateData : [],

                    borderColor: "#ef4444",
                    backgroundColor: "#ef4444",
                    borderWidth: 2,

                    // 항목이 많으면 점을 숨기고 선만 표시
                    pointRadius: itemCount > 30 ? 0 : 3,
                    pointHoverRadius: 5,
                    pointHitRadius: 10,

                    tension: 0,
                    fill: false,

                    yAxisID: "y1",
                    order: 1
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                // 등록되어 있는 경우에도 숫자 라벨을 표시하지 않음
                datalabels: false,

                legend: {
                          position: "bottom"
                      },

                tooltip: {
                    enabled: true,
                    padding: 12,

                    callbacks: {
                        label(context) {
                            const value = context.parsed.y;

                            if (value === null || value === undefined) {
                                return `${context.dataset.label}: -`;
                            }

                            if (context.dataset.yAxisID === "y1") {
                                return `미합격 비율: ${value.toFixed(2)}%`;
                            }

                            return `양품 수량: ${value.toLocaleString()} EA`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 8,
                        minRotation: 0,
                        maxRotation: 45,
                        font: {
                            size: 11
                        }
                    }
                },

                y: {
                    type: "linear",
                    position: "left",
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: "양품 수량 (EA)"
                    },

                    ticks: {
                        precision: 0,
                        maxTicksLimit: 6
                    }
                },

                y1: {
                    type: "linear",
                    position: "right",
                    beginAtZero: true,

                    grid: {
                        drawOnChartArea: false
                    },

                    title: {
                        display: true,
                        text: "미합격 비율 (%)"
                    },

                    ticks: {
                        maxTicksLimit: 6,
                        callback: value => `${value}%`
                    }
                }
            }
        }
    };
};

const getDoughnutChartConfig = ({ totalPass, totalFail }) => {
  const hasData = totalPass > 0 || totalFail > 0;

  return {
    type: "doughnut",
    data: {
      labels: hasData ? ["양품 (ACCEPTED)", "미합격(미판정 포함)"] : ["데이터 없음"],
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