import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

import "../css/Dashboard.css";
import icon1 from "./img/erp_dashboard_production_clean.png";
import icon2 from "./img/erp_dashboard_quality_clean.png";
import icon3 from "./img/erp_dashboard_alert_clean.png";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const API_URL = "http://localhost:8080";

// 막대 안 수량 라벨 플러그인
const customDataLabels = {
    id: "dashboardDataLabels",
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "12px sans-serif";

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            if (!chart.isDatasetVisible(datasetIndex)) return;
            const meta = chart.getDatasetMeta(datasetIndex);

            meta.data.forEach((bar, index) => {
                const value = Number(dataset.data[index]);
                if (!Number.isFinite(value) || value <= 0) return;
                const height = Math.abs(bar.base - bar.y);
                if (height < 20) return;

                ctx.fillStyle = "#ffffff";
                ctx.fillText(
                    value.toLocaleString(),
                    bar.x,
                    (bar.base + bar.y) / 2
                );
            });
        });
        ctx.restore();
    }
};

function createEmptyStats() {
    return {
        passCount: 0,
        rejectCount: 0,
        totalCount: 0,
        globalRejectCount: 0,
        globalTotalCount: 0,
        anomalyCount: 0
    };
}

function ProgressBar({ value, color }) {
    return (
        <div
            style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#eee",
                borderRadius: "4px",
                overflow: "hidden",
                marginTop: "10px"
            }}
        >
            <div
                style={{
                    width: `${Math.min(Math.max(value, 0), 100)}%`,
                    height: "100%",
                    backgroundColor: color,
                    transition: "width 0.4s ease"
                }}
            />
        </div>
    );
}

export default function Dashboard() {
    const [latestBatch, setLatestBatch] = useState(null);
    const [stats, setStats] = useState(createEmptyStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    // 차트 상태
    const [filterOption, setFilterOption] = useState("nowLot");
    const [chartRows, setChartRows] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState("");

    // 차트 데이터 단독 조회 함수 (필터 전환 시 초고속 갱신)
    const fetchChartData = useCallback(async (option, batchId, signal) => {
        setChartLoading(true);
        setChartError("");
        try {
            let res;
            if (option === "recentLot") {
                // 백엔드 Repository의 findRecent5LotSummary 직접 호출
                res = await axios.get(`${API_URL}/mask/filling-packagings/summary`, {
                    signal,
                    params: { groupBy: "recent5" }
                });
            } else {
                if (!batchId) {
                    setChartRows([]);
                    setChartLoading(false);
                    return;
                }
                res = await axios.get(`${API_URL}/mask/filling-packagings/summary`, {
                    signal,
                    params: { groupBy: "15min", batchId }
                });
            }

            const rows = Array.isArray(res.data)
                ? res.data.map(item => ({
                      timeGroup: item.timeGroup != null ? String(item.timeGroup) : "",
                      passCount: Number(item.passCount) || 0,
                      failCount: Number(item.failCount) || 0
                  }))
                : [];
            setChartRows(rows);
        } catch (err) {
            if (!axios.isCancel(err) && !signal?.aborted) {
                setChartError(
                    err.response
                        ? `차트 조회 실패: HTTP ${err.response.status}`
                        : err.message || "차트 데이터를 불러오지 못했습니다."
                );
            }
        } finally {
            if (!signal?.aborted) {
                setChartLoading(false);
            }
        }
    }, []);

    // 전체 대시보드 로딩 (최신 배치 확인 후 KPI + 차트 데이터 병렬 동시 호출)
    useEffect(() => {
        const controller = new AbortController();

        async function fetchDashboard() {
            setLoading(true);
            setError("");
            setLatestBatch(null);
            setStats(createEmptyStats());

            try {
                // 1. 최신 LOT 조회
                const batchResponse = await axios.get(`${API_URL}/mask/batches`, {
                    signal: controller.signal,
                    params: { page: 0 }
                });
                if (controller.signal.aborted) return;

                const batchData = batchResponse.data;
                const latest = batchData?.content?.[0] ?? null;
                setLatestBatch(latest);

                if (!latest || !latest.batchId) {
                    setLoading(false);
                    return;
                }

                const batchId = latest.batchId;
                const signal = controller.signal;

                // 2. 상단 KPI 통계 + 차트 데이터를 병렬로 동시 호출 (6개 API → 1개 통합 쿼리)
                const [statsResponse] = await Promise.all([
                    axios.get(`${API_URL}/mask/filling-packagings/dashboard-stats`, {
                        signal: controller.signal,
                        params: { batchId }
                    }),
                    fetchChartData(filterOption, batchId, signal)
                ]);

                if (controller.signal.aborted) return;

                const s = statsResponse.data;
                setStats({
                    passCount: Number(s.passCount) || 0,
                    rejectCount: Number(s.rejectCount) || 0,
                    totalCount: Number(s.totalCount) || 0,
                    globalRejectCount: Number(s.globalRejectCount) || 0,
                    globalTotalCount: Number(s.globalTotalCount) || 0,
                    anomalyCount: Number(s.anomalyCount) || 0
                });
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(
                        err.response
                            ? `조회에 실패했습니다. 응답 코드: ${err.response.status}`
                            : err.request
                                ? "서버에 연결하지 못했습니다. 스프링 실행 상태를 확인해 주세요."
                                : err.message || "데이터 조회에 실패했습니다."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchDashboard();
        return () => controller.abort();
    }, [reload, fetchChartData]);

    // 필터 변경 처리 (최신 LOT 15분 <-> 최근 LOT 5개)
    function handleFilterChange(newOption) {
        setFilterOption(newOption);
        if (latestBatch?.batchId) {
            fetchChartData(newOption, latestBatch.batchId);
        }
    }

    const latestBatchId = latestBatch?.batchId ?? "";
    const isRecentLot = filterOption === "recentLot";

    const targetUnits =
        latestBatch?.targetUnits == null ? null : Number(latestBatch.targetUnits);
    const targetRate =
        Number.isFinite(targetUnits) && targetUnits > 0
            ? (stats.passCount / targetUnits) * 100
            : null;

    const latestDefectRate =
        stats.totalCount > 0 ? (stats.rejectCount / stats.totalCount) * 100 : null;
    const globalDefectRate =
        stats.globalTotalCount > 0
            ? (stats.globalRejectCount / stats.globalTotalCount) * 100
            : null;

    const defectRateDifference =
        latestDefectRate !== null && globalDefectRate !== null
            ? latestDefectRate - globalDefectRate
            : null;
    const differenceText =
        defectRateDifference === null
            ? "-"
            : `${defectRateDifference > 0 ? "+" : ""}${defectRateDifference.toFixed(2)}`;

    const ready = !loading && !error && latestBatch !== null;
    function showCount(value) {
        return ready ? value.toLocaleString() : "-";
    }

    // Chart.js 데이터 및 옵션 설정
    const chartData = useMemo(
        () => ({
            labels: chartRows.map(item => item.timeGroup),
            datasets: [
                {
                    label: "미합격 수량(미판정 포함)",
                    data: chartRows.map(item => item.failCount),
                    backgroundColor: "#ef4444",
                    barPercentage: 0.6
                },
                {
                    label: "양품 수량",
                    data: chartRows.map(item => item.passCount),
                    backgroundColor: "#3b82f6",
                    barPercentage: 0.6
                }
            ]
        }),
        [chartRows]
    );

    const chartOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { position: "top" },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const count = Number(context.raw);
                            return `${context.dataset.label}: ${count.toLocaleString()}개`;
                        },
                        footer(items) {
                            if (items.length === 0) return "";
                            const row = chartRows[items[0].dataIndex];
                            if (!row) return "";
                            const total = row.passCount + row.failCount;
                            if (total === 0) return "포장 기록 없음";
                            const rate = (row.failCount / total) * 100;
                            return [
                                `전체: ${total.toLocaleString()}개`,
                                `미합격 비율: ${rate.toFixed(2)}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    title: {
                        display: true,
                        text: isRecentLot
                            ? "최근 LOT — 시작시간 기준"
                            : "포장·검사시간 — 15분 단위"
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: "수량(개)" }
                }
            }
        }),
        [chartRows, isRecentLot]
    );

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "16px"
                }}
            >
                <div>
                    <h2 style={{ margin: "0 0 8px" }}>대시보드</h2>
                    <p style={{ margin: 0, color: "#64748b" }}>
                        {loading
                            ? "조회 중입니다…"
                            : latestBatchId
                                ? `시작시간 기준 최신 LOT: ${latestBatchId}`
                                : "조회할 생산 LOT가 없습니다."}
                    </p>
                </div>

                <button
                    type="button"
                    disabled={loading}
                    onClick={() => setReload(v => v + 1)}
                >
                    새로고침
                </button>
            </div>

            {error && (
                <p
                    role="alert"
                    style={{
                        padding: "16px",
                        color: "#b91c1c",
                        backgroundColor: "#fef2f2",
                        borderRadius: "8px"
                    }}
                >
                    {error}
                </p>
            )}

            {/* 상단 KPI 요약 카드 */}
            <div className="row">
                {/* 1. 양품 생산량 */}
                <div className="dash_board1">
                    <div>
                        <img className="icon" src={icon1} alt="생산량 아이콘" />
                    </div>
                    <div className="db1_content">
                        <div className="db1_text_box">
                            <div>
                                <p className="db_content_semititle">양품 생산량</p>
                                <span className="db_content_num">{showCount(stats.passCount)}</span>
                                <span> 파우치</span>
                            </div>
                            <div>
                                <p className="db_content_semititle">목표 대비</p>
                                <span className="db_content_num" style={{ color: "#3b82f6" }}>
                                    {ready && targetRate !== null ? targetRate.toFixed(1) : "-"}
                                </span>
                                <span> %</span>
                            </div>
                        </div>
                        <ProgressBar value={ready ? targetRate ?? 0 : 0} color="#3b82f6" />
                    </div>
                </div>

                {/* 2. 불량 건수 */}
                <div className="dash_board1">
                    <div>
                        <img className="icon" src={icon2} alt="품질 아이콘" />
                    </div>
                    <div className="db1_content">
                        <div className="db1_text_box">
                            <div>
                                <p className="db_content_semititle">불량 건수</p>
                                <span className="db_content_num">{showCount(stats.rejectCount)}</span>
                                <span> 파우치</span>
                            </div>
                            <div>
                                <p className="db_content_semititle">전체 불량률 대비</p>
                                <span
                                    className="db_content_num"
                                    style={{
                                        color: defectRateDifference > 0 ? "#ef4444" : "#22c55e"
                                    }}
                                >
                                    {ready ? differenceText : "-"}
                                </span>
                                <span> %p</span>
                            </div>
                        </div>
                        <ProgressBar value={ready ? latestDefectRate ?? 0 : 0} color="#ef4444" />
                        <p style={{ fontSize: "12px", color: "#64748b" }}>
                            최신 LOT 불량률:{" "}
                            {ready && latestDefectRate !== null
                                ? `${latestDefectRate.toFixed(2)}%`
                                : "-"}
                            {" · "}전체 포장 기록 기준
                        </p>
                    </div>
                </div>

                {/* 3. 이상 발생 이력 */}
                <div className="dash_board1">
                    <div>
                        <img className="icon" src={icon3} alt="알림 아이콘" />
                    </div>
                    <div className="db1_content">
                        <div className="db1_text_box">
                            <div>
                                <p className="db_content_semititle">이상 발생 이력</p>
                                <span className="db_content_num">{showCount(stats.anomalyCount)}</span>
                                <span> 건</span>
                            </div>
                        </div>
                        <p style={{ fontSize: "12px", color: "#64748b" }}>
                            최신 LOT 기준 · 확인 여부 전체 포함
                        </p>
                    </div>
                </div>
            </div>

            {/* 하단 차트 및 공정 바로가기 */}
            <div className="row2">
                <div className="dash_board2">
                    <div className="db2_header">
                        <div className="db2_title">생산 및 품질 추이</div>
                        <select
                            aria-label="차트 조회 기준"
                            value={filterOption}
                            onChange={e => handleFilterChange(e.target.value)}
                        >
                            <option value="nowLot">최신 LOT 15분 간격</option>
                            <option value="recentLot">최근 LOT 5개</option>
                        </select>
                    </div>

                    <div>
                        {loading || chartLoading ? (
                            <div
                                role="status"
                                style={{
                                    minHeight: "350px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#64748b"
                                }}
                            >
                                차트 데이터를 불러오는 중입니다…
                            </div>
                        ) : chartError ? (
                            <div role="alert" style={{ padding: "20px", color: "#b91c1c" }}>
                                <p>{chartError}</p>
                                <button
                                    type="button"
                                    onClick={() => fetchChartData(filterOption, latestBatchId)}
                                >
                                    다시 조회
                                </button>
                            </div>
                        ) : chartRows.length === 0 ? (
                            <div
                                style={{
                                    minHeight: "350px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#64748b"
                                }}
                            >
                                조회할 차트 데이터가 없습니다.
                            </div>
                        ) : (
                            <div>
                                <p
                                    style={{
                                        margin: "12px 0",
                                        color: "#64748b",
                                        fontSize: "12px"
                                    }}
                                >
                                    {isRecentLot
                                        ? "시작시간 기준 최근 5개 LOT입니다. 포장 기록이 없는 LOT는 0건으로 표시합니다."
                                        : "각 시각의 00분·15분·30분·45분을 기준으로 집계합니다. 기록이 있는 구간만 표시합니다."}
                                </p>

                                <div style={{ width: "100%", height: "450px" }}>
                                    <Bar
                                        data={chartData}
                                        options={chartOptions}
                                        plugins={[customDataLabels]}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <Link to="/process" className="link_box">
                    <div className="dash_board2">
                        <div className="db2_title">공정 현황</div>
                        <p>공정 모니터링에서 진행 상태를 확인하세요.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}