import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import axios from "axios";
import "../css/report.css";

// ==========================================
// 1. 상단 메인 추이 차트 옵션 (생산량 & 불량률 이중 꺾은선)
// ==========================================
const getComboChartConfig = ({ labels, passData, rateData }) => {
    const hasData = Array.isArray(labels) && labels.length > 0;
    const itemCount = hasData ? labels.length : 0;

    return {
        type: "line",

        data: {
            labels: hasData ? labels : [],

            datasets: [
                {
                    type: "line",
                    label: "양품 수량 (EA)",
                    data: hasData ? passData : [],

                    borderColor: "#2563eb",
                    backgroundColor: "#2563eb",
                    borderWidth: 2,

                    pointRadius: itemCount > 30 ? 0 : 3,
                    pointHoverRadius: 5,
                    pointHitRadius: 10,

                    tension: 0.1,
                    fill: false,

                    yAxisID: "y", // 좌측 Y축
                    order: 2
                },
                {
                    type: "line",
                    label: "미합격 비율 (%)",
                    data: hasData ? rateData : [],

                    borderColor: "#ef4444",
                    backgroundColor: "#ef4444",
                    borderWidth: 2,

                    pointRadius: itemCount > 30 ? 0 : 3,
                    pointHoverRadius: 5,
                    pointHitRadius: 10,

                    tension: 0.1,
                    fill: false,

                    yAxisID: "y1", // 우측 Y축
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

                // 좌측 Y축: 양품 수량 (EA)
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
                        maxTicksLimit: 6,
                        callback: (value) => value.toLocaleString()
                    }
                },

                // 우측 Y축: 미합격 비율 (%)
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
                        callback: (value) => `${value}%`
                    }
                }
            }
        }
    };
};

// ==========================================
// 2. 메인 컴포넌트 (ReportPage)
// ==========================================
export default function ReportPage() {
    const chartRef1 = useRef(null);
    const chartInstance1 = useRef(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [periodType, setPeriodType] = useState("일별");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSummaryData("일별", startDate, endDate);

        return () => {
            if (chartInstance1.current) chartInstance1.current.destroy();
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
                renderCharts({ labels: [], passData: [], rateData: [] });
                return;
            }

            const labels = summaryList.map((item) => item.timeGroup);
            const passData = summaryList.map((item) => item.passCount);
            const rateData = summaryList.map((item) => item.defectRate);

            renderCharts({ labels, passData, rateData });
        } catch (error) {
            console.error("차트 데이터 조회 실패:", error);
            renderCharts({ labels: [], passData: [], rateData: [] });
        } finally {
            setLoading(false);
        }
    };

    // 차트 생성 및 인스턴스 관리
    const renderCharts = ({ labels, passData, rateData }) => {
        if (chartRef1.current) {
            if (chartInstance1.current) chartInstance1.current.destroy();
            chartInstance1.current = new Chart(
                chartRef1.current,
                getComboChartConfig({ labels, passData, rateData })
            );
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

                    <button
                        className="primary-btn"
                        onClick={() => fetchSummaryData(periodType, startDate, endDate)}
                        disabled={loading}
                    >
                        {loading ? "조회 중..." : "조회"}
                    </button>
                </div>
            </div>

            {/* 1. 상단 메인 추이 차트 */}
            <div className="report-card">
                <h3>{periodType} 기준 생산량 및 불량률 추이</h3>
                <div className="chart-wrapper-large">
                    <canvas ref={chartRef1}></canvas>
                </div>
            </div>

        </div>
    );
}
