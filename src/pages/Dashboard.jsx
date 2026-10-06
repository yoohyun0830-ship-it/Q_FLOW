import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import "../css/Dashboard.css";

import icon1 from "./img/erp_dashboard_production_clean.png";
import icon2 from "./img/erp_dashboard_quality_clean.png";
import icon3 from "./img/erp_dashboard_alert_clean.png";

import DashboardChart from "./DashboardChart";

const API_URL = "http://localhost:8080";

// 페이지 응답에서 조건에 맞는 전체 건수만 사용
async function loadCount(path, conditions, signal) {
    const response = await axios.get(`${API_URL}${path}`, {
        signal,
        params: {
            ...conditions,
            page: 0
        }
    });

    const data = response.data;

    if (
        !Array.isArray(data?.content) ||
        !Number.isSafeInteger(data.totalElements) ||
        data.totalElements < 0
    ) {
        throw new Error("목록 API의 페이지 응답 형식을 확인해 주세요.");
    }

    return data.totalElements;
}

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

    const [filterOption, setFilterOption] = useState("nowLot");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchDashboard() {
            setLoading(true);
            setError("");
            setLatestBatch(null);
            setStats(createEmptyStats());

            try {
                // 현재 Repository는 startTime DESC로 정렬함
                const batchResponse = await axios.get(
                    `${API_URL}/mask/batches`,
                    {
                        signal: controller.signal,
                        params: {
                            page: 0
                        }
                    }
                );

                if (controller.signal.aborted) return;

                const batchData = batchResponse.data;

                if (!Array.isArray(batchData?.content)) {
                    throw new Error(
                        "생산 LOT의 페이지 응답 형식을 확인해 주세요."
                    );
                }

                // 첫 번째 항목이 시작시간 기준 최신 LOT
                const latest = batchData.content[0] ?? null;

                if (!latest) return;

                if (!latest.batchId) {
                    throw new Error("생산 LOT 번호를 확인해 주세요.");
                }

                const batchId = latest.batchId;
                const signal = controller.signal;

                const [
                    passCount,
                    rejectCount,
                    totalCount,
                    globalRejectCount,
                    globalTotalCount,
                    anomalyCount
                ] = await Promise.all([
                    // 최신 LOT의 전체 양품 건수
                    loadCount(
                        "/mask/filling-packagings",
                        {
                            batchId,
                            finalDisposition: "합격"
                        },
                        signal
                    ),

                    // 최신 LOT의 전체 불량 건수
                    loadCount(
                        "/mask/filling-packagings",
                        {
                            batchId,
                            finalDisposition: "불합격"
                        },
                        signal
                    ),

                    // 최신 LOT의 전체 포장 기록 건수
                    loadCount(
                        "/mask/filling-packagings",
                        { batchId },
                        signal
                    ),

                    // 모든 LOT의 불량 건수
                    loadCount(
                        "/mask/filling-packagings",
                        {
                            finalDisposition: "불합격"
                        },
                        signal
                    ),

                    // 모든 LOT의 포장 기록 건수
                    loadCount(
                        "/mask/filling-packagings",
                        {},
                        signal
                    ),

                    // 최신 LOT의 이상 발생 이력 건수
                    loadCount(
                        "/mask/anomaly-events",
                        { batchId },
                        signal
                    )
                ]);

                if (controller.signal.aborted) return;

                setLatestBatch(latest);
                setStats({
                    passCount,
                    rejectCount,
                    totalCount,
                    globalRejectCount,
                    globalTotalCount,
                    anomalyCount
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
    }, [reload]);

    const latestBatchId = latestBatch?.batchId ?? "";

    const targetUnits =
        latestBatch?.targetUnits == null
            ? null
            : Number(latestBatch.targetUnits);

    const targetRate =
        Number.isFinite(targetUnits) && targetUnits > 0
            ? (stats.passCount / targetUnits) * 100
            : null;

    // 불량률 = 불량 건수 / 전체 포장 기록 건수
    const latestDefectRate =
        stats.totalCount > 0
            ? (stats.rejectCount / stats.totalCount) * 100
            : null;

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
                    <h2 style={{ margin: "0 0 8px" }}>
                        대시보드
                    </h2>

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
                    onClick={() => setReload(value => value + 1)}
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

            <div className="row">
                {/* 최신 LOT의 양품 수량 */}
                <div className="dash_board1">
                    <div>
                        <img
                            className="icon"
                            src={icon1}
                            alt="생산량 아이콘"
                        />
                    </div>

                    <div className="db1_content">
                        <div className="db1_text_box">
                            <div>
                                <p className="db_content_semititle">
                                    양품 생산량
                                </p>
                                <span className="db_content_num">
                                    {showCount(stats.passCount)}
                                </span>
                                <span> 파우치</span>
                            </div>

                            <div>
                                <p className="db_content_semititle">
                                    목표 대비
                                </p>
                                <span
                                    className="db_content_num"
                                    style={{ color: "#3b82f6" }}
                                >
                                    {ready && targetRate !== null
                                        ? targetRate.toFixed(1)
                                        : "-"}
                                </span>
                                <span> %</span>
                            </div>
                        </div>

                        <ProgressBar
                            value={ready ? targetRate ?? 0 : 0}
                            color="#3b82f6"
                        />
                    </div>
                </div>

                {/* 최신 LOT의 불량 수량 */}
                <div className="dash_board1">
                    <div>
                        <img
                            className="icon"
                            src={icon2}
                            alt="품질 아이콘"
                        />
                    </div>

                    <div className="db1_content">
                        <div className="db1_text_box">
                            <div>
                                <p className="db_content_semititle">
                                    불량 건수
                                </p>
                                <span className="db_content_num">
                                    {showCount(stats.rejectCount)}
                                </span>
                                <span> 파우치</span>
                            </div>

                            <div>
                                <p className="db_content_semititle">
                                    전체 불량률 대비
                                </p>
                                <span
                                    className="db_content_num"
                                    style={{
                                        color:
                                            defectRateDifference > 0
                                                ? "#ef4444"
                                                : "#22c55e"
                                    }}
                                >
                                    {ready ? differenceText : "-"}
                                </span>
                                <span> %p</span>
                            </div>
                        </div>

                        <ProgressBar
                            value={ready ? latestDefectRate ?? 0 : 0}
                            color="#ef4444"
                        />

                        <p style={{ fontSize: "12px", color: "#64748b" }}>
                            최신 LOT 불량률:{" "}
                            {ready && latestDefectRate !== null
                                ? `${latestDefectRate.toFixed(2)}%`
                                : "-"}
                            {" · "}전체 포장 기록 기준
                        </p>
                    </div>
                </div>

                {/* 최신 LOT의 이상 발생 건수 */}
                <div className="dash_board1">
                    <div>
                        <img
                            className="icon"
                            src={icon3}
                            alt="알림 아이콘"
                        />
                    </div>

                    <div className="db1_content">
                        <div className="db1_text_box">
                            <div>
                                <p className="db_content_semititle">
                                    이상 발생 이력
                                </p>
                                <span className="db_content_num">
                                    {showCount(stats.anomalyCount)}
                                </span>
                                <span> 건</span>
                            </div>
                        </div>

                        <p style={{ fontSize: "12px", color: "#64748b" }}>
                            최신 LOT 기준 · 확인 여부 전체 포함
                        </p>
                    </div>
                </div>
            </div>

            <div className="row2">
                <div className="dash_board2">
                    <div className="db2_header">
                        <div className="db2_title">
                            생산 및 품질 추이
                        </div>

                        <select
                            aria-label="차트 조회 기준"
                            value={filterOption}
                            onChange={e => setFilterOption(e.target.value)}
                        >
                            <option value="nowLot">
                                최신 LOT 15분 간격
                            </option>
                            <option value="recentLot">
                                최근 LOT 5개
                            </option>
                        </select>
                    </div>

                    <div>
                        {loading ? (
                            <p>조회 중입니다…</p>
                        ) : error ? (
                            <p>데이터 조회 후 차트를 표시합니다.</p>
                        ) : !latestBatchId ? (
                            <p>조회할 생산 LOT가 없습니다.</p>
                        ) : (
                            <DashboardChart
                                key={`${latestBatchId}:${reload}`}
                                batchId={latestBatchId}
                                filterOption={filterOption}
                            />
                        )}
                    </div>
                </div>

                <Link to="/process" className="link_box">
                    <div className="dash_board2">
                        <div className="db2_title">
                            공정 현황
                        </div>

                        <p>
                            공정 모니터링에서 진행 상태를 확인하세요.
                        </p>
                    </div>
                </Link>
            </div>
        </div>
    );
}