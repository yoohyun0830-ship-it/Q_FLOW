import { useEffect, useState } from "react";
import axios from "axios";

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

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const API_URL = "http://localhost:8080";

// 막대 안에 수량 표시
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

                // 작은 막대는 툴팁으로 수량 확인
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

// 서버 집계 응답 확인
function readSummary(data) {
    if (!Array.isArray(data)) {
        throw new Error("차트 집계 응답이 배열인지 확인해 주세요.");
    }

    return data.map(item => {
        if (
            item.passCount == null ||
            item.failCount == null
        ) {
            throw new Error("차트 집계 수량이 누락되었습니다.");
        }

        const passCount = Number(item.passCount);
        const failCount = Number(item.failCount);

        if (
            !Number.isSafeInteger(passCount) ||
            !Number.isSafeInteger(failCount) ||
            passCount < 0 ||
            failCount < 0
        ) {
            throw new Error("차트 집계 수량을 확인해 주세요.");
        }

        return {
            timeGroup:
                item.timeGroup == null
                    ? null
                    : String(item.timeGroup),
            passCount,
            failCount
        };
    });
}

export default function DashboardChart({
    batchId,
    filterOption
}) {
    const [summaryRows, setSummaryRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    const isRecentLot = filterOption === "recentLot";

    useEffect(() => {
        const controller = new AbortController();

        async function fetchChart() {
            setLoading(true);
            setError("");
            setSummaryRows([]);

            try {
                if (isRecentLot) {
                    // 시작시간 내림차순 LOT 목록과 LOT별 집계 조회
                    const [batchResponse, summaryResponse] =
                        await Promise.all([
                            axios.get(`${API_URL}/mask/batches`, {
                                signal: controller.signal,
                                params: {
                                    page: 0
                                }
                            }),

                            axios.get(
                                `${API_URL}/mask/filling-packagings/summary`,
                                {
                                    signal: controller.signal,
                                    params: {
                                        groupBy: "lot"
                                    }
                                }
                            )
                        ]);

                    if (controller.signal.aborted) return;

                    const batchData = batchResponse.data;

                    if (!Array.isArray(batchData?.content)) {
                        throw new Error(
                            "생산 LOT의 페이지 응답 형식을 확인해 주세요."
                        );
                    }

                    // 서버가 최신순으로 보내준 LOT 중 최근 5개
                    const recentBatches = batchData.content.slice(0, 5);

                    if (recentBatches.some(item => !item.batchId)) {
                        throw new Error("생산 LOT 번호가 누락되었습니다.");
                    }

                    const summaries = readSummary(summaryResponse.data);

                    const summaryMap = new Map(
                        summaries.map(item => [
                            item.timeGroup,
                            item
                        ])
                    );

                    // 차트는 오래된 LOT → 최신 LOT 순서로 표시
                    const rows = [...recentBatches]
                        .reverse()
                        .map(batch => {
                            const lotId = String(batch.batchId);
                            const summary = summaryMap.get(lotId);

                            return {
                                timeGroup: lotId,
                                passCount: summary?.passCount ?? 0,
                                failCount: summary?.failCount ?? 0
                            };
                        });

                    setSummaryRows(rows);
                } else {
                    const targetBatchId = String(batchId ?? "").trim();

                    if (!targetBatchId) return;

                    const response = await axios.get(
                        `${API_URL}/mask/filling-packagings/summary`,
                        {
                            signal: controller.signal,
                            params: {
                                groupBy: "15min",
                                batchId: targetBatchId
                            }
                        }
                    );

                    if (controller.signal.aborted) return;

                    const rows = readSummary(response.data);

                    if (rows.some(item => !item.timeGroup)) {
                        throw new Error(
                            "집계 시간에 값이 없는 데이터가 있습니다."
                        );
                    }

                    // 시간별 그룹과 수량은 서버 집계 결과를 그대로 사용
                    setSummaryRows(rows);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(
                        err.response
                            ? `차트 조회에 실패했습니다. 응답 코드: ${err.response.status}`
                            : err.request
                                ? "서버에 연결하지 못했습니다."
                                : err.message || "차트를 불러오지 못했습니다."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchChart();

        return () => controller.abort();
    }, [batchId, isRecentLot, reload]);

    const data = {
        labels: summaryRows.map(item => item.timeGroup),

        datasets: [
            {
                label: "미합격 수량(미판정 포함)",
                data: summaryRows.map(item => item.failCount),
                backgroundColor: "#ef4444",
                barPercentage: 0.6
            },
            {
                label: "양품 수량",
                data: summaryRows.map(item => item.passCount),
                backgroundColor: "#3b82f6",
                barPercentage: 0.6
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
            mode: "index",
            intersect: false
        },

        plugins: {
            legend: {
                position: "top"
            },

            tooltip: {
                callbacks: {
                    label(context) {
                        const count = Number(context.raw);

                        return (
                            `${context.dataset.label}: ` +
                            `${count.toLocaleString()}개`
                        );
                    },

                    footer(items) {
                        if (items.length === 0) return "";

                        const row = summaryRows[items[0].dataIndex];

                        if (!row) return "";

                        const total = row.passCount + row.failCount;

                        if (total === 0) {
                            return "포장 기록 없음";
                        }

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
                grid: {
                    display: false
                },
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
                ticks: {
                    precision: 0
                },
                title: {
                    display: true,
                    text: "수량(개)"
                }
            }
        }
    };

    if (loading) {
        return (
            <div
                role="status"
                style={{
                    minHeight: "350px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                차트 데이터를 불러오는 중입니다…
            </div>
        );
    }

    if (error) {
        return (
            <div
                role="alert"
                style={{
                    padding: "20px",
                    color: "#b91c1c"
                }}
            >
                <p>{error}</p>

                <button
                    type="button"
                    onClick={() => setReload(value => value + 1)}
                >
                    다시 조회
                </button>
            </div>
        );
    }

    if (summaryRows.length === 0) {
        return (
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
        );
    }

    return (
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
                    data={data}
                    options={options}
                    plugins={[customDataLabels]}
                />
            </div>
        </div>
    );
}