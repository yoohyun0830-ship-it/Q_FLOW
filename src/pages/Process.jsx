import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { processMonitorApi as api } from "../api/manufacturingApi";
import "../css/Process.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
);

// 공정 순서
const STEPS = [
    "원료 칭량",
    "가열/혼합",
    "냉각",
    "벌크 검사",
    "최종 포장 검사"
];

// 공정별 측정항목
const METRICS = [
    { key: "tank_temp_c", label: "탱크 온도", unit: "℃" },
    { key: "homomixer_rpm", label: "호모믹서 RPM", unit: "rpm" },
    { key: "vacuum_kpa", label: "진공도", unit: "kPa" },
    { key: "cooling_valve_pct", label: "냉각 밸브 개도", unit: "%" },
    { key: "paddle_rpm", label: "교반 RPM", unit: "rpm" },
    { key: "ph_level", label: "pH", unit: "" },
    { key: "bulk_viscosity_cps", label: "점도", unit: "cP" },
    { key: "motor_torque_pct", label: "모터 토크", unit: "%" }
];

const MATERIAL_METRICS = [
    { key: "targetQtyKg", label: "목표 칭량량", unit: "kg" },
    { key: "actualQtyKg", label: "실제 칭량량 (목표 비교)", unit: "kg" },
    { key: "weightDifferenceKg", label: "칭량 오차량", unit: "kg" },
    { key: "weightErrorPct", label: "칭량 오차율", unit: "%" }
];

const BULK_METRICS = [
    { key: "ph_level", label: "측정 pH", unit: "" },
    { key: "bulk_viscosity_cps", label: "측정 점도", unit: "cP" },
    { key: "specific_gravity", label: "비중", unit: "" }
];

const PACKAGING_METRICS = [
    { key: "sheet_dry_weight_g", label: "시트 중량", unit: "g" },
    { key: "pouch_tare_weight_g", label: "파우치 중량", unit: "g" },
    { key: "essence_net_weight_g", label: "에센스 순중량", unit: "g" },
    { key: "gross_total_weight_g", label: "총중량", unit: "g" },
    { key: "fill_weight_1st_g", label: "1차 충진량 (2차 비교)", unit: "g" },
    { key: "fill_weight_2nd_g", label: "2차 충진량 (1차 비교)", unit: "g" },
    {
        key: "upper_seal_temp_c",
        label: "상부 실링온도 (하부 비교)",
        unit: "℃"
    },
    {
        key: "lower_seal_temp_c",
        label: "하부 실링온도 (상부 비교)",
        unit: "℃"
    },
    { key: "seal_pressure_bar", label: "실링 압력", unit: "bar" },
    { key: "n2_residual_o2_pct", label: "잔존산소율", unit: "%" }
];

const PROCESS_METRICS = {
    "원료 칭량": MATERIAL_METRICS,
    "가열/혼합": METRICS,
    "냉각": METRICS,
    "벌크 검사": BULK_METRICS,
    "최종 포장 검사": PACKAGING_METRICS
};

const ALL_METRICS = [
    ...new Map(
        Object.values(PROCESS_METRICS)
            .flat()
            .map((item) => [item.key, item])
    ).values()
];

const EMPTY = {
    lot: null,
    executions: [],
    alarms: []
};

function numericMeasurement(value) {
    if (
        value === null
        || value === undefined
        || value === ""
        || !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return Number(value);
}

function normalizeMeasurements(rows, executions) {
    const names = new Map(
        executions.map((row) => [
            String(row.execution_id),
            row.process_code
        ])
    );

    return rows.map((row) => {
        const process = row.measurementProcess
            || names.get(String(row.execution_id ?? row.executionId));

        const target = numericMeasurement(row.targetQtyKg);
        const actual = numericMeasurement(row.actualQtyKg);
        const difference = target !== null && actual !== null
            ? actual - target
            : null;

        return {
            ...row,
            measurementProcess: process,
            ph_level: process === "벌크 검사"
                ? row.ph_measured
                : row.ph_level,
            bulk_viscosity_cps: process === "벌크 검사"
                ? row.viscosity_measured
                : row.bulk_viscosity_cps,
            weightDifferenceKg: difference,
            weightErrorPct: difference !== null && target > 0
                ? difference / target * 100
                : null
        };
    }).filter((row) => PROCESS_METRICS[row.measurementProcess]);
}

function dateText(value) {
    return value
        ? String(value).replace("T", " ").slice(0, 19)
        : "-";
}

function numberText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return Number(value).toLocaleString("ko-KR", {
        maximumFractionDigits: 3
    });
}

function errorText(error) {
    const status = error.response?.status;

    if (status === 401) {
        return "로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
    }

    if (status === 403) {
        return "처리 권한이 없습니다. 해당 공정의 담당 관리자 계정으로 로그인해 주세요.";
    }

    const body = error.response?.data;

    if (typeof body === "string" && body.length < 500) {
        return body;
    }

    if (body?.detail || body?.message) {
        return body.detail || body.message;
    }

    if (status === 400) {
        return "입력값을 확인해 주세요.";
    }

    if (status === 404) {
        return "요청한 LOT·공정·알람·사용자를 찾을 수 없습니다.";
    }

    if (status === 409) {
        return "현재 상태에서는 처리할 수 없습니다. 검사·알람 조건을 확인해 주세요.";
    }

    return error.message || "요청에 실패했습니다.";
}

function isPending(alarm) {
    if (alarm.severity === "정상") {
        return false;
    }

    if (alarm.severity === "주의") {
        return !["확인됨", "조치완료"].includes(alarm.actionStatus);
    }

    if (alarm.severity === "심각") {
        return (
            alarm.actionStatus !== "조치완료"
            || !alarm.actionNote?.trim()
        );
    }

    return true;
}

function Badge({ value }) {
    let tone = "gray";

    if (
        ["완료", "확인됨", "조치완료", "정상", "합격", "폐기완료"]
            .includes(value)
    ) {
        tone = "green";
    } else if (value === "진행중") {
        tone = "blue";
    } else if (["주의", "폐기대기"].includes(value)) {
        tone = "yellow";
    } else if (["심각", "미확인", "불합격", "폐기"].includes(value)) {
        tone = "red";
    }

    return (
        <span className={`pm-badge pm-${tone}`}>
            {value || "대기"}
        </span>
    );
}

// 알람 확인·조치 입력
function AlarmDialog({
    alarm,
    users,
    busy,
    error,
    onClose,
    onSave
}) {
    const dialog = useRef(null);
    const [userId, setUserId] = useState("");
    const [actionType, setActionType] = useState("PROCESS_ADJUST");
    const [note, setNote] = useState("");
    const [remarks, setRemarks] = useState("");

    const supported = ["주의", "심각"].includes(alarm.severity);
    const needsConfirm = supported && alarm.actionStatus === "미확인";
    const needsAction = (
        alarm.severity === "심각"
        && alarm.actionStatus === "확인됨"
    );

    const actionOptions = [
        ["PROCESS_ADJUST", "공정 조건 조정"],
        ["EQUIPMENT_CHECK", "설비 점검"],
        ["REINSPECTION", "재검사"],
        ["PRODUCTION_PAUSE", "생산 일시정지"],
        ["OTHER", "기타"]
    ];

    useEffect(() => {
        const element = dialog.current;
        element.showModal();

        return () => element.close();
    }, []);

    const cannotSubmit = (
        busy
        || !userId
        || (!needsConfirm && !needsAction)
        || (
            needsAction
            && (
                !note.trim()
                || (actionType === "OTHER" && !remarks.trim())
            )
        )
    );

    return (
        <dialog
            ref={dialog}
            className="pm-dialog"
            aria-labelledby="pm-dialog-title"
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) onClose();
            }}
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (cannotSubmit) return;

                    onSave(alarm, {
                        userId: Number(userId),
                        actionType,
                        actionNote: note.trim(),
                        actionRemarks: actionType === "OTHER"
                            ? remarks.trim()
                            : null
                    });
                }}
            >
                <div className="pm-heading">
                    <h2 id="pm-dialog-title">
                        {needsAction ? "심각 알람 조치" : "알람 확인"}
                    </h2>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        ×
                    </button>
                </div>

                <div className="pm-alarm-info">
                    <Badge value={alarm.severity} />
                    <span>알람번호 {alarm.anomalyId}</span>
                    <dl>
                        <dt>공정</dt>
                        <dd>{alarm.processCode || "-"}</dd>
                        <dt>이상 유형</dt>
                        <dd>{alarm.anomalyType || "-"}</dd>
                        <dt>현재 상태</dt>
                        <dd>{alarm.actionStatus || "-"}</dd>
                        <dt>측정값</dt>
                        <dd>{numberText(alarm.measuredValue)}</dd>
                        <dt>메시지</dt>
                        <dd>{alarm.alarmMessage || "-"}</dd>
                    </dl>
                </div>

                <label className="pm-field">
                    {needsAction ? "조치 담당자" : "확인 담당자"}
                    <select
                        required
                        value={userId}
                        disabled={busy}
                        onChange={(event) => setUserId(event.target.value)}
                    >
                        <option value="">담당자를 선택하세요</option>
                        {users.map((user) => (
                            <option key={user.userId} value={user.userId}>
                                {user.userName} ({user.userId})
                            </option>
                        ))}
                    </select>
                </label>

                {needsConfirm && alarm.severity === "심각" && (
                    <p className="pm-muted">
                        먼저 알람을 확인해 주세요.
                        확인 처리 후 조치 종류와 내용을 입력할 수 있습니다.
                    </p>
                )}

                {needsAction && (
                    <>
                        <label className="pm-field">
                            조치 종류
                            <select
                                value={actionType}
                                disabled={busy}
                                onChange={(event) => {
                                    setActionType(event.target.value);
                                }}
                            >
                                {actionOptions.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="pm-field">
                            조치내용
                            <textarea
                                required
                                rows={5}
                                value={note}
                                disabled={busy}
                                onChange={(event) => setNote(event.target.value)}
                                placeholder="실제로 수행한 조치 내용을 입력하세요."
                            />
                        </label>

                        {actionType === "OTHER" && (
                            <label className="pm-field">
                                기타 조치 비고
                                <textarea
                                    required
                                    rows={3}
                                    value={remarks}
                                    disabled={busy}
                                    onChange={(event) => {
                                        setRemarks(event.target.value);
                                    }}
                                />
                            </label>
                        )}
                    </>
                )}

                {!needsConfirm && !needsAction && (
                    <p className="pm-muted">
                        현재 상태에서는 추가 처리할 수 없습니다.
                        목록을 새로 조회해 주세요.
                    </p>
                )}

                {error && <p className="pm-error" role="alert">{error}</p>}

                <div className="pm-actions">
                    <button type="button" disabled={busy} onClick={onClose}>
                        취소
                    </button>
                    <button
                        type="submit"
                        className="pm-primary"
                        disabled={cannotSubmit}
                    >
                        {busy
                            ? "처리 중…"
                            : needsAction ? "조치 완료" : "확인 처리"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

// 벌크 검사 승인
function BulkQcApprovalDialog({
    execution,
    users,
    busy,
    error,
    onClose,
    onApprove
}) {
    const dialog = useRef(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [qcId, setQcId] = useState(execution.finalQcId || "");
    const [userId, setUserId] = useState("");

    const selected = records.find((item) => item.qc_id === qcId);
    const result = selected?.overall_qc_result;
    const canApprove = ["합격", "불합격"].includes(result);

    useEffect(() => {
        const element = dialog.current;
        element.showModal();

        return () => element.close();
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setLoadError("");

        api.bulkQcResults(execution.execution_id, controller.signal)
            .then((rows) => {
                if (!controller.signal.aborted) setRecords(rows);
            })
            .catch((failure) => {
                if (!controller.signal.aborted) {
                    setLoadError(errorText(failure));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [execution.execution_id]);

    return (
        <dialog
            ref={dialog}
            className="pm-dialog"
            aria-labelledby="pm-qc-title"
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) onClose();
            }}
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (busy || loading || !canApprove || !userId) return;

                    if (window.confirm(
                        `검사 ${qcId}의 "${result}" 결과를 최종 검사 결과로 승인할까요?`
                    )) {
                        onApprove(qcId, Number(userId));
                    }
                }}
            >
                <div className="pm-heading">
                    <h2 id="pm-qc-title">벌크 검사 결과 승인</h2>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        ×
                    </button>
                </div>

                <p className="pm-muted">
                    LOT: {execution.batchId}
                    <br />
                    벌크 검사 실행번호: {execution.execution_id}
                    <br />
                    현재 승인된 검사: {execution.finalQcId || "없음"}
                </p>

                {loading && <p role="status">검사 결과를 조회하고 있습니다…</p>}
                {loadError && (
                    <p className="pm-error" role="alert">{loadError}</p>
                )}
                {!loading && !loadError && records.length === 0 && (
                    <p className="pm-error">
                        이 실행번호에 연결된 검사 결과가 없습니다.
                        검사 기록의 공정 실행번호를 확인해 주세요.
                    </p>
                )}

                <label className="pm-field">
                    최종 승인할 검사 결과
                    <select
                        required
                        value={qcId}
                        disabled={busy || loading || Boolean(loadError)}
                        onChange={(event) => setQcId(event.target.value)}
                    >
                        <option value="">검사 결과를 선택하세요</option>
                        {records.map((item) => (
                            <option key={item.qc_id} value={item.qc_id}>
                                {item.qc_id}
                                {" · "}
                                {item.overall_qc_result || "미판정"}
                                {" · "}
                                {dateText(item.sample_time)}
                            </option>
                        ))}
                    </select>
                </label>

                {selected && (
                    <div className="pm-alarm-info">
                        <dl>
                            <dt>검사번호</dt>
                            <dd>{selected.qc_id}</dd>
                            <dt>검사시간</dt>
                            <dd>{dateText(selected.sample_time)}</dd>
                            <dt>측정 pH</dt>
                            <dd>{numberText(selected.ph_measured)}</dd>
                            <dt>측정 점도</dt>
                            <dd>{numberText(selected.viscosity_measured)}</dd>
                            <dt>측정 비중</dt>
                            <dd>{numberText(selected.specific_gravity)}</dd>
                            <dt>외관</dt>
                            <dd>{selected.appearance_code || "-"}</dd>
                            <dt>종합 결과</dt>
                            <dd><Badge value={result || "미판정"} /></dd>
                            <dt>검사 비고</dt>
                            <dd>{selected.qc_notes_code || "-"}</dd>
                        </dl>
                    </div>
                )}

                <label className="pm-field">
                    승인 담당자
                    <select
                        required
                        value={userId}
                        disabled={busy}
                        onChange={(event) => setUserId(event.target.value)}
                    >
                        <option value="">담당자를 선택하세요</option>
                        {users.map((user) => (
                            <option key={user.userId} value={user.userId}>
                                {user.userName} ({user.userId})
                            </option>
                        ))}
                    </select>
                </label>

                {selected && !canApprove && (
                    <p className="pm-error">
                        합격 또는 불합격으로 판정된 검사만 승인할 수 있습니다.
                    </p>
                )}
                {result === "불합격" && (
                    <p className="pm-error">
                        불합격 결과는 다음 공정으로 진행할 수 없습니다.
                    </p>
                )}
                {error && <p className="pm-error" role="alert">{error}</p>}

                <div className="pm-actions">
                    <button type="button" disabled={busy} onClick={onClose}>
                        취소
                    </button>
                    <button
                        type="submit"
                        className="pm-primary"
                        disabled={
                            busy || loading || Boolean(loadError)
                            || !canApprove || !userId
                        }
                    >
                        {busy ? "승인 중…" : "최종 결과 승인"}
                    </button>
                </div>

                <p className="pm-muted">
                    공정은 데이터 생성 후 자동 종료됩니다.
                    승인 및 알람 처리 조건을 충족하면 다음 공정으로 진행합니다.
                </p>
            </form>
        </dialog>
    );
}

// 5공정 제품 목록 및 제품별 폐기
function PackagingProductList({
    execution,
    lotStatus,
    revision,
    busy,
    canManage,
    onDiscard,
    onSummary
}) {
    const [page, setPage] = useState(0);
    const [result, setResult] = useState({
        content: [],
        totalElements: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const executionId = execution.execution_id;

    // executionId·page·onSummary는 이 컴포넌트 안에서 사용
    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError("");

        api.packagingProducts(executionId, page, controller.signal)
            .then((data) => {
                if (controller.signal.aborted) return;

                if (page > 0 && page >= data.totalPages) {
                    setPage(0);
                    return;
                }

                setResult(data);

                const summary = data.summary;
                const hasSummary = (
                    summary
                    && ["totalCount", "passCount", "failCount",
                        "disposalPendingCount"].every(
                        (key) => Number.isFinite(summary[key])
                    )
                );

                // 집계가 없으면 0건으로 오인하지 않도록 별도 상태 전달
                onSummary({
                    ...(hasSummary ? summary : {}),
                    executionId,
                    available: Boolean(hasSummary),
                    error: ""
                });
            })
            .catch((failure) => {
                if (controller.signal.aborted) return;

                const message = errorText(failure);
                setError(message);
                onSummary({
                    executionId,
                    available: false,
                    error: message
                });
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [executionId, page, revision, onSummary]);

    const canDiscard = (
        canManage
        && lotStatus === "진행중"
        && execution.status === "완료"
    );

    return (
        <section className="pm-card">
            <h2>
                최종 포장 제품 목록
                <small> 총 {result.totalElements}개</small>
            </h2>

            <p className="pm-muted">
                불합격 제품은 4·5공정 관리자의 제품별 폐기 확정이 필요합니다.
            </p>

            {!canManage && (
                <p className="pm-muted">
                    폐기하려면 4공정관리자 또는 5공정관리자로 로그인해 주세요.
                </p>
            )}

            {error && <p className="pm-error" role="alert">{error}</p>}
            {loading && (
                <p className="pm-muted" role="status">
                    제품 목록을 조회하고 있습니다.
                </p>
            )}

            {!error && (
                <>
                    <div className="pm-table-wrap" aria-busy={loading}>
                        <table>
                            <thead>
                                <tr>
                                    <th>제품번호</th>
                                    <th>중량검사</th>
                                    <th>금속검사</th>
                                    <th>비전검사</th>
                                    <th>종합결과</th>
                                    <th>폐기 상태</th>
                                    <th>폐기 담당자</th>
                                    <th>폐기 시간</th>
                                    <th>처리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.content.map((product) => {
                                    const failed =
                                        product.final_disposition === "불합격";
                                    const disposed =
                                        product.disposalStatus === "폐기완료";

                                    let waitingText = "관리자 처리 대기";

                                    if (!canManage) {
                                        waitingText = "4·5공정 관리자 로그인 필요";
                                    } else if (execution.status !== "완료") {
                                        waitingText = "5공정 종료 후 처리 가능";
                                    } else if (lotStatus !== "진행중") {
                                        waitingText = `LOT 상태 확인: ${lotStatus || "-"}`;
                                    }

                                    return (
                                        <tr key={product.pouch_id}>
                                            <td>{product.pouch_id}</td>
                                            <td>{product.checkweigher_status || "-"}</td>
                                            <td>{product.metal_detector_status || "-"}</td>
                                            <td>{product.vision_inspection_status || "-"}</td>
                                            <td>
                                                <Badge
                                                    value={
                                                        product.final_disposition
                                                        || "판정·알람 처리 대기"
                                                    }
                                                />
                                            </td>
                                            <td>
                                                {product.disposalStatus
                                                    || (failed ? "폐기 미확정" : "-")}
                                            </td>
                                            <td>
                                                {product.disposedByUserName
                                                    || product.disposedByUserId
                                                    || "-"}
                                            </td>
                                            <td>{dateText(product.disposedAt)}</td>
                                            <td>
                                                {disposed ? (
                                                    "처리 완료"
                                                ) : failed && canDiscard ? (
                                                    <button
                                                        type="button"
                                                        className="pm-discard-button"
                                                        disabled={busy || loading}
                                                        onClick={() => onDiscard(product)}
                                                    >
                                                        제품 폐기 확정
                                                    </button>
                                                ) : failed ? (
                                                    waitingText
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {!loading && result.content.length === 0 && (
                                    <tr>
                                        <td colSpan={9}>
                                            이 실행번호에 연결된 제품이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pm-actions">
                        <button
                            type="button"
                            disabled={busy || loading || page === 0}
                            onClick={() => setPage((value) => value - 1)}
                        >
                            이전
                        </button>

                        <span>
                            {result.totalPages === 0 ? 0 : page + 1}
                            {" / "}
                            {result.totalPages} 페이지
                        </span>

                        <button
                            type="button"
                            disabled={
                                busy || loading
                                || page + 1 >= result.totalPages
                            }
                            onClick={() => setPage((value) => value + 1)}
                        >
                            다음
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}

export default function Process() {
    // 상태 선언
    const [lots, setLots] = useState([]);
    const [users, setUsers] = useState([]);
    const [simulation, setSimulation] = useState(null);
    const [simulationError, setSimulationError] = useState("");
    const [packagingSummary, setPackagingSummary] = useState(null);

    const [input, setInput] = useState("");
    const [batchId, setBatchId] = useState("");
    const [snapshot, setSnapshot] = useState(EMPTY);
    const [revision, setRevision] = useState(0);

    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);

    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [setupError, setSetupError] = useState("");
    const [notice, setNotice] = useState("");

    const [alarm, setAlarm] = useState(null);
    const [dialogError, setDialogError] = useState("");
    const [qcExecution, setQcExecution] = useState(null);

    const [sensors, setSensors] = useState([]);
    const [sensorLoading, setSensorLoading] = useState(false);
    const [sensorError, setSensorError] = useState("");
    const [measurementProcess, setMeasurementProcess] = useState("all");
    const [metricKey, setMetricKey] = useState("tank_temp_c");

    const followedSimulationLotRef = useRef(null);

    const handlePackagingSummary = useCallback((summary) => {
        setPackagingSummary(summary);
    }, []);

    // 생성기 상태 조회
    // 이 useEffect에는 executionId·page·onSummary를 넣지 않는다.
    useEffect(() => {
        const controller = new AbortController();
        let timer;

        async function refreshSimulation() {
            try {
                const status = await api.simulationStatus(controller.signal);

                if (!controller.signal.aborted) {
                    setSimulation(status);
                    setSimulationError("");
                }
            } catch (failure) {
                if (!controller.signal.aborted) {
                    setSimulationError(errorText(failure));
                }
            } finally {
                if (!controller.signal.aborted) {
                    timer = setTimeout(refreshSimulation, 2000);
                }
            }
        }

        refreshSimulation();

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, []);

    // 새 LOT가 등록되면 조회 대상 자동 전환
    useEffect(() => {
        const nextBatchId = simulation?.batchId;

        if (
            !nextBatchId
            || simulation?.pendingData?.tableName === "batches"
            || busy
            || alarm
            || qcExecution
            || followedSimulationLotRef.current === nextBatchId
        ) {
            return;
        }

        followedSimulationLotRef.current = nextBatchId;

        setInput(nextBatchId);
        setBatchId(nextBatchId);
        setSnapshot(EMPTY);
        setPackagingSummary(null);
        setSensors([]);
        setNotice("");
        setError("");
        setLoadError("");
        setSensorError("");
        setDialogError("");
        setRevision((value) => value + 1);
    }, [
        simulation?.batchId,
        simulation?.pendingData?.tableName,
        busy,
        alarm,
        qcExecution
    ]);

    // 다른 알람 팝업에서 처리한 결과 반영
    useEffect(() => {
        const handleAlarmUpdated = (event) => {
            const updated = event.detail;

            setRevision((value) => value + 1);
            if (updated?.anomalyId == null) return;

            setAlarm((current) => {
                if (
                    !current
                    || String(current.anomalyId) !== String(updated.anomalyId)
                ) {
                    return current;
                }

                const merged = { ...current, ...updated };
                return isPending(merged) ? merged : null;
            });
        };

        window.addEventListener("qflow:alarm-updated", handleAlarmUpdated);

        return () => {
            window.removeEventListener(
                "qflow:alarm-updated",
                handleAlarmUpdated
            );
        };
    }, []);

    const { lot, executions, alarms } = snapshot;
    const latest = executions[0];

    const currentPackagingSummary = (
        latest?.process_code === "최종 포장 검사"
        && String(packagingSummary?.executionId)
            === String(latest.execution_id)
    ) ? packagingSummary : null;

    const summaryAvailable = currentPackagingSummary?.available === true;
    const disposalPendingCount = summaryAvailable
        ? currentPackagingSummary.disposalPendingCount
        : 0;

    const running = executions.filter((item) => item.status === "진행중");
    const pending = alarms.filter(isPending);
    const blocked = loading || busy || !lot;

    const canStart = lot?.status === "대기" && executions.length === 0;
    const canResume = (
        lot?.status === "진행중"
        && running.length === 0
        && latest?.status === "완료"
    );

    // 화면 표시용 권한. 실제 권한은 서버 세션으로 다시 검사한다.
    const userRole = localStorage.getItem("userRole");
    const canManageDisposal = ["4공정관리자", "5공정관리자"]
        .includes(userRole);

    const canDiscardBulkQc = (
        canManageDisposal
        && lot?.status === "진행중"
        && latest?.process_code === "벌크 검사"
        && latest?.status === "완료"
        && running.length === 0
    );

    // LOT 및 사용자 목록
    useEffect(() => {
        const controller = new AbortController();

        Promise.allSettled([
            api.lots(controller.signal),
            api.users(controller.signal)
        ]).then((results) => {
            if (controller.signal.aborted) return;

            if (results[0].status === "fulfilled") {
                setLots(results[0].value);
            }
            if (results[1].status === "fulfilled") {
                setUsers(results[1].value);
            }

            setSetupError(
                results
                    .filter((item) => item.status === "rejected")
                    .map((item) => errorText(item.reason))
                    .join(" / ")
            );
        });

        return () => controller.abort();
    }, [revision]);

    // 선택 LOT의 공정·알람
    useEffect(() => {
        if (!batchId) return;

        const controller = new AbortController();
        setLoading(true);
        setLoadError("");

        async function load() {
            try {
                const [selectedLot, rows] = await Promise.all([
                    api.lot(batchId, controller.signal),
                    api.executions(batchId, controller.signal)
                ]);

                const alarmList = rows[0]
                    ? await api.alarms(
                        rows[0].execution_id,
                        controller.signal
                    )
                    : [];

                if (controller.signal.aborted) return;

                setSnapshot({
                    lot: selectedLot,
                    executions: rows,
                    alarms: alarmList
                });
            } catch (failure) {
                if (!controller.signal.aborted) {
                    setSnapshot(EMPTY);
                    setLoadError(errorText(failure));
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        load();
        return () => controller.abort();
    }, [batchId, revision]);

    useEffect(() => {
        setSensors([]);
        setPackagingSummary(null);
    }, [batchId]);

    // LOT 전체 측정값
    useEffect(() => {
        const controller = new AbortController();
        setSensorError("");

        if (!batchId) {
            setSensorLoading(false);
            return () => controller.abort();
        }

        setSensorLoading(true);

        api.lotMeasurements(batchId, controller.signal)
            .then((rows) => {
                if (!controller.signal.aborted && rows.length > 0) {
                    setSensors(rows);
                }
            })
            .catch((failure) => {
                if (!controller.signal.aborted) {
                    setSensorError(errorText(failure));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setSensorLoading(false);
            });

        return () => controller.abort();
    }, [batchId, revision]);

    // 조회·입력 중이 아니면 10초 후 자동 갱신
    useEffect(() => {
        if (loading || sensorLoading || busy || alarm || qcExecution) {
            return;
        }

        const timer = setTimeout(() => {
            setRevision((value) => value + 1);
        }, 10_000);

        return () => clearTimeout(timer);
    }, [
        revision,
        batchId,
        loading,
        sensorLoading,
        busy,
        alarm,
        qcExecution
    ]);

    async function mutate(task, successMessage, inDialog = false) {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError("");
        setDialogError("");
        setNotice("");

        try {
            const result = await task();
            setNotice(result?.message || successMessage);

            if (inDialog) {
                setAlarm(null);
                setQcExecution(null);
            }
        } catch (failure) {
            const message = errorText(failure);

            if (inDialog) {
                setDialogError(message);
            } else {
                setError(message);
            }
        } finally {
            busyRef.current = false;
            setBusy(false);
            setLoading(true);
            setRevision((value) => value + 1);
        }
    }

    async function handleDiscardBulkQc() {
        if (blocked || busyRef.current || !canDiscardBulkQc) return;

        const executionId = latest.execution_id;
        const targetBatchId = lot.batchId;

        const confirmed = window.confirm(
            `LOT ${targetBatchId}를 전체 폐기하시겠습니까?\n\n`
            + "벌크 검사 종합결과가 불합격인 경우에만 폐기할 수 있습니다.\n"
            + "생산·검사 기록은 보존됩니다.\n"
            + "현재 로그인한 관리자가 LOT의 최종 담당자로 저장됩니다."
        );

        if (!confirmed) return;

        await mutate(
            () => api.discardBulkQc(executionId),
            "LOT 폐기가 확정되었습니다."
        );
    }

    async function handleDiscardPackagingProduct(product) {
        if (blocked || busyRef.current) return;

        if (!canManageDisposal) {
            setError("4공정관리자 또는 5공정관리자만 폐기할 수 있습니다.");
            return;
        }

        if (
            lot?.status !== "진행중"
            || latest?.process_code !== "최종 포장 검사"
            || latest?.status !== "완료"
            || String(product.executionId) !== String(latest.execution_id)
            || product.final_disposition !== "불합격"
            || product.disposalStatus === "폐기완료"
        ) {
            setError("현재 제품 상태에서는 폐기를 확정할 수 없습니다.");
            return;
        }

        const confirmed = window.confirm(
            `제품 ${product.pouch_id}의 폐기를 확정하시겠습니까?\n\n`
            + "선택한 제품 한 건만 폐기 처리됩니다.\n"
            + "검사 결과와 측정 기록은 보존됩니다.\n"
            + "로그인한 관리자와 처리시간이 기록됩니다."
        );

        if (!confirmed) return;

        await mutate(
            () => api.discardPackagingProduct(product.pouch_id),
            "제품 폐기가 확정되었습니다. 남은 알람·폐기 상태를 갱신합니다."
        );
    }

    function showPackagingProducts() {
        document.getElementById("packaging-product-section")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }

    // 차트 데이터
    const processes = measurementProcess === "all"
        ? STEPS
        : [measurementProcess];

    const metrics = measurementProcess === "all"
        ? ALL_METRICS
        : (PROCESS_METRICS[measurementProcess] || ALL_METRICS);

    const metric = metrics.find((item) => item.key === metricKey)
        || metrics[0];

    const normalizedRows = normalizeMeasurements(sensors, executions);
    const visibleRows = normalizedRows
        .filter((row) => processes.includes(row.measurementProcess))
        .sort((a, b) => (
            String(b.measurementTime || "")
                .localeCompare(String(a.measurementTime || ""))
        ));

    const chronological = [...visibleRows].reverse();

    const comparisonKeys = {
        actualQtyKg: ["targetQtyKg", "actualQtyKg"],
        fill_weight_1st_g: ["fill_weight_1st_g", "fill_weight_2nd_g"],
        fill_weight_2nd_g: ["fill_weight_1st_g", "fill_weight_2nd_g"],
        upper_seal_temp_c: ["upper_seal_temp_c", "lower_seal_temp_c"],
        lower_seal_temp_c: ["upper_seal_temp_c", "lower_seal_temp_c"]
    };

    const seriesKeys = comparisonKeys[metric.key] || [metric.key];
    const colors = [
        "#2563eb", "#16a34a", "#f59e0b", "#dc2626",
        "#9333ea", "#0891b2", "#db2777", "#64748b"
    ];

    const chartData = {
        labels: chronological.map((row) => (
            dateText(row.measurementTime)
            + " · "
            + (row.materialName || row.measurementId)
        )),
        datasets: processes
            .flatMap((process) => (
                seriesKeys.map((key) => ({ process, key }))
            ))
            .filter((series) => chronological.some((row) => (
                row.measurementProcess === series.process
                && numericMeasurement(row[series.key]) !== null
            )))
            .map((series, index) => ({
                label: series.process + " · "
                    + (ALL_METRICS.find((item) => (
                        item.key === series.key
                    ))?.label || series.key),
                data: chronological.map((row) => (
                    row.measurementProcess === series.process
                        ? numericMeasurement(row[series.key])
                        : null
                )),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length],
                pointRadius: chronological.length > 100 ? 1 : 3,
                tension: 0.1,
                spanGaps: false
            }))
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true },
            datalabels: { display: false }
        },
        scales: {
            x: {
                ticks: {
                    maxTicksLimit: 5,
                    callback: function (value) {
                        return this.getLabelForValue(value).slice(11);
                    }
                }
            },
            y: {
                title: {
                    display: true,
                    text: metric.unit || metric.label
                }
            }
        }
    };

    const hasChartData = chartData.datasets.some((series) => (
        series.data.some((value) => (
            value !== null && Number.isFinite(value)
        ))
    ));

    // 진행 안내
    let guidance = "LOT를 선택해 주세요.";

    if (lot?.status === "폐기") {
        guidance = "폐기 처리된 LOT입니다. 생산 및 검사 기록은 보존됩니다.";
    } else if (lot?.status === "완료") {
        guidance = "LOT 생산이 완료되었습니다.";
    } else if (pending.length > 0) {
        guidance = `미처리 알람 ${pending.length}건이 있습니다. 확인·조치를 완료해 주세요.`;

        if (disposalPendingCount > 0) {
            guidance += ` 제품 폐기 확정도 ${disposalPendingCount}건 필요합니다.`;
        }
    } else if (running.length > 1) {
        guidance = "진행 중인 공정이 여러 개입니다. 실행 이력을 확인해 주세요.";
    } else if (running.length === 1) {
        guidance = `${running[0].process_code} 공정이 진행 중입니다.`;
    } else if (canStart) {
        guidance = "원료 칭량부터 생산을 시작할 수 있습니다.";
    } else if (
        canResume
        && latest.process_code === "최종 포장 검사"
    ) {
        if (currentPackagingSummary?.error) {
            guidance = "제품 검사 결과 조회에 실패했습니다. 아래 오류를 확인해 주세요.";
        } else if (!summaryAvailable) {
            guidance = "5공정 검사는 종료되었습니다. 아래 제품 목록에서 검사·폐기 상태를 확인해 주세요.";
        } else if (disposalPendingCount > 0) {
            guidance = `5공정 검사는 완료되었지만, 불합격 제품 ${disposalPendingCount}개의 폐기 확정이 필요합니다.`;
        } else {
            guidance = "5공정 검사가 종료되었습니다. 서버의 LOT 완료 처리 상태를 확인 중입니다.";
        }
    } else if (canResume) {
        if (
            latest.process_code === "벌크 검사"
            && latest.finalQcResult === "불합격"
        ) {
            guidance = "벌크 검사 불합격입니다. 4·5공정 관리자의 LOT 폐기 확정이 필요합니다.";
        } else if (
            latest.process_code === "벌크 검사"
            && latest.finalQcResult !== "합격"
        ) {
            guidance = "벌크 검사 결과와 알람 처리 상태를 확인해 주세요.";
        } else {
            guidance = "공정이 종료되었습니다. 진행 조건을 확인해 주세요.";
        }
    }

    return (
        <div className="pm-page">
            <header className="pm-heading">
                <div>
                    <h1>공정 모니터링</h1>
                    <p>LOT별 공정 진행과 검사·알람·폐기 상태를 확인합니다.</p>
                </div>
                <button
                    disabled={busy || loading}
                    onClick={() => setRevision((value) => value + 1)}
                >
                    ↻ 새로고침
                </button>
            </header>

            {setupError && (
                <p className="pm-error" role="alert">
                    보조 목록 조회: {setupError}
                </p>
            )}

            <div className="pm-card pm-current-lot" aria-live="polite">
                <span>현재 생산 LOT</span>
                {simulationError ? (
                    <span className="pm-error">
                        조회 실패: {simulationError}
                    </span>
                ) : simulation?.batchId ? (
                    <>
                        <code>{simulation.batchId}</code>
                        <Badge
                            value={
                                simulation.pendingData?.tableName === "batches"
                                    ? "등록 중"
                                    : simulation.executionId == null
                                        ? "대기"
                                        : "진행중"
                            }
                        />
                        {simulation.waitingReason && (
                            <span className="pm-muted">
                                {simulation.waitingReason}
                            </span>
                        )}
                        {simulation.lastError && (
                            <span className="pm-error">
                                {simulation.lastError}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="pm-muted">
                        {simulation == null
                            ? "LOT 확인 중…"
                            : simulation.completedBatchId
                                ? "생산 완료 · 다음 대기 LOT 준비 중"
                                : "대기 LOT 준비 중"}
                    </span>
                )}
            </div>

            <form
                className="pm-card pm-selector"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!input.trim() || busy) return;

                    if (input.trim() !== batchId) {
                        setSnapshot(EMPTY);
                        setSensors([]);
                        setPackagingSummary(null);
                    }

                    setAlarm(null);
                    setNotice("");
                    setError("");
                    setBatchId(input.trim());
                    setRevision((value) => value + 1);
                }}
            >
                <label className="pm-field">
                    LOT 선택 또는 번호 입력
                    <input
                        list="pm-lots"
                        value={input}
                        required
                        disabled={busy || loading}
                        placeholder="LOT 번호를 입력하세요"
                        onChange={(event) => setInput(event.target.value)}
                    />
                    <datalist id="pm-lots">
                        {lots.map((item) => (
                            <option key={item.batchId} value={item.batchId}>
                                {item.productName} · {item.status}
                            </option>
                        ))}
                    </datalist>
                </label>

                <button
                    type="submit"
                    className="pm-primary"
                    disabled={busy || loading || !input.trim()}
                >
                    조회
                </button>

                <div className="pm-product">
                    <small>제품명</small>
                    <strong>{lot?.productName || "-"}</strong>
                </div>

                <div>
                    <small>LOT 상태</small>
                    <Badge value={lot?.status || "미선택"} />
                </div>
            </form>

            {error && <p className="pm-error" role="alert">{error}</p>}
            {loadError && (
                <p className="pm-error" role="alert">
                    조회 실패: {loadError}
                </p>
            )}
            {notice && <p className="pm-notice" role="status">{notice}</p>}
            {loading && (
                <p className="pm-muted" role="status">
                    최신 상태를 조회하고 있습니다…
                </p>
            )}

            <section className="pm-flow" aria-label="공정 흐름도">
                {STEPS.map((name, index) => {
                    const row = executions.find(
                        (item) => item.process_code === name
                    );

                    return (
                        <article
                            key={name}
                            className={
                                "pm-step "
                                + (row?.status === "진행중"
                                    ? "pm-step-active"
                                    : "")
                            }
                        >
                            <h2>{index + 1}. {name}</h2>
                            <Badge value={row?.status || "대기"} />

                            {name === "최종 포장 검사"
                                && latest?.process_code === name
                                && (
                                    <div>
                                        {summaryAvailable ? (
                                            <>
                                                <p>
                                                    합격 {currentPackagingSummary.passCount}개
                                                    {" / "}
                                                    불합격 {currentPackagingSummary.failCount}개
                                                </p>
                                                {disposalPendingCount > 0 && (
                                                    <p className="pm-error" role="status">
                                                        제품 폐기 확정 대기:
                                                        {" "}
                                                        {disposalPendingCount}개
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="pm-muted">
                                                {currentPackagingSummary?.error
                                                    ? "제품 조회 오류"
                                                    : "제품별 검사 결과는 아래 목록에서 확인"}
                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            onClick={showPackagingProducts}
                                        >
                                            검사 결과·폐기 처리 보기
                                        </button>
                                    </div>
                                )}

                            {row?.execution_id === latest?.execution_id
                                && pending.length > 0
                                && (
                                    <span className="pm-wait">
                                        알람 처리 필요
                                    </span>
                                )}

                            <dl>
                                <dt>시작시간</dt>
                                <dd>{dateText(row?.start_time)}</dd>
                                <dt>종료시간</dt>
                                <dd>{dateText(row?.end_time)}</dd>
                                <dt>실행번호</dt>
                                <dd>{row?.execution_id ?? "-"}</dd>
                            </dl>
                        </article>
                    );
                })}
            </section>

            <section
                className={
                    "pm-banner "
                    + (pending.length > 0 || disposalPendingCount > 0
                        ? "pm-banner-alert"
                        : "")
                }
            >
                <strong>{guidance}</strong>

                <div className="pm-actions">
                    {canStart && (
                        <button
                            className="pm-primary"
                            disabled={blocked}
                            onClick={() => mutate(
                                () => api.start(batchId),
                                "원료 칭량이 시작되었습니다."
                            )}
                        >
                            공정 시작
                        </button>
                    )}

                    {canResume
                        && latest?.process_code !== "최종 포장 검사"
                        && (
                            <button
                                disabled={blocked}
                                onClick={() => mutate(
                                    () => api.resume(latest.execution_id),
                                    "진행 조건을 확인했습니다."
                                )}
                            >
                                진행 재검사
                            </button>
                        )}

                    {canDiscardBulkQc && (
                        <button
                            type="button"
                            className="pm-discard-button"
                            disabled={blocked}
                            onClick={handleDiscardBulkQc}
                        >
                            LOT 전체 폐기
                        </button>
                    )}

                    {latest?.process_code === "최종 포장 검사" && (
                        <button type="button" onClick={showPackagingProducts}>
                            {disposalPendingCount > 0
                                ? `폐기 대기 제품 ${disposalPendingCount}개 확인`
                                : "제품별 검사 결과 확인"}
                        </button>
                    )}

                    {latest?.process_code === "벌크 검사"
                        && ["진행중", "완료"].includes(latest.status)
                        && lot?.status === "진행중"
                        && (
                            <button
                                type="button"
                                disabled={blocked}
                                onClick={() => {
                                    setDialogError("");
                                    setQcExecution(latest);
                                }}
                            >
                                {latest.finalQcId
                                    ? "최종 검사 승인 확인·변경"
                                    : "검사 결과 승인"}
                            </button>
                        )}

                    {latest?.process_code === "벌크 검사" && (
                        <Link to="/quality">품질관리 열기</Link>
                    )}
                </div>
            </section>

            {latest?.process_code === "최종 포장 검사" && (
                <div id="packaging-product-section">
                    <PackagingProductList
                        key={latest.execution_id}
                        execution={latest}
                        lotStatus={lot?.status}
                        revision={revision}
                        busy={blocked}
                        canManage={canManageDisposal}
                        onDiscard={handleDiscardPackagingProduct}
                        onSummary={handlePackagingSummary}
                    />
                </div>
            )}

            {pending.length > 0 && (
                <section className="pm-card">
                    <h2>
                        현재 실행의 미처리 알람
                        <small>{pending.length}건</small>
                    </h2>
                    <div className="pm-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>번호</th>
                                    <th>심각도</th>
                                    <th>이상 유형</th>
                                    <th>상태</th>
                                    <th>처리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((item) => (
                                    <tr key={item.anomalyId}>
                                        <td>{item.anomalyId}</td>
                                        <td><Badge value={item.severity} /></td>
                                        <td>{item.anomalyType || item.alarmMessage}</td>
                                        <td>{item.actionStatus || "-"}</td>
                                        <td>
                                            <button
                                                disabled={
                                                    blocked
                                                    || !["주의", "심각"]
                                                        .includes(item.severity)
                                                }
                                                onClick={() => {
                                                    setDialogError("");
                                                    setAlarm(item);
                                                }}
                                            >
                                                {item.actionStatus === "미확인"
                                                    ? "확인"
                                                    : "조치 입력"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <div className="pm-heading pm-sensor-heading">
                <h2>공정 측정값 모니터링</h2>
                <p className="pm-muted">
                    선택 LOT의 1~5공정 수치 · LOT 변경 시 초기화
                </p>
            </div>

            {sensorError && (
                <p className="pm-error" role="alert">
                    측정값 조회: {sensorError}
                </p>
            )}

            <div className="pm-sensor-grid">
                <section className="pm-card">
                    <h2>최근 공정 측정값</h2>
                    <p className="pm-muted">
                        {sensorLoading
                            ? "조회 중…"
                            : visibleRows.length > 0
                                ? `${visibleRows[0].measurementProcess} 마지막 측정: `
                                    + dateText(visibleRows[0].measurementTime)
                                : "선택 공정의 측정값이 아직 없습니다."}
                    </p>

                    <div className="pm-metrics">
                        {metrics.map((item) => {
                            const latestValue = visibleRows.find(
                                (row) => numericMeasurement(row[item.key]) !== null
                            );

                            return (
                                <div key={item.key}>
                                    <span>{item.label}</span>
                                    <strong>
                                        {numberText(latestValue?.[item.key])}
                                    </strong>
                                    <small>{item.unit}</small>
                                    {latestValue && (
                                        <small>
                                            {latestValue.measurementProcess}
                                            {" · "}
                                            {dateText(latestValue.measurementTime)}
                                        </small>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="pm-card">
                    <div className="pm-heading">
                        <h2>측정값 변화</h2>

                        <div className="pm-measurement-selectors">
                            <label>
                                공정
                                <select
                                    aria-label="차트 공정"
                                    value={measurementProcess}
                                    onChange={(event) => {
                                        const process = event.target.value;
                                        const options = process === "all"
                                            ? ALL_METRICS
                                            : PROCESS_METRICS[process];

                                        setMeasurementProcess(process);
                                        setMetricKey((previous) => (
                                            options.some((item) => (
                                                item.key === previous
                                            ))
                                                ? previous
                                                : options[0].key
                                        ));
                                    }}
                                >
                                    <option value="all">
                                        전체 공정 (동일 항목 비교)
                                    </option>
                                    {STEPS.map((process, index) => (
                                        <option key={process} value={process}>
                                            {index + 1}공정 · {process}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                공정의 항목
                                <select
                                    aria-label="차트 측정항목"
                                    value={metric.key}
                                    onChange={(event) => {
                                        setMetricKey(event.target.value);
                                    }}
                                >
                                    {metrics.map((item) => (
                                        <option key={item.key} value={item.key}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    <p className="pm-muted">
                        선택 항목의 측정 이력 {chronological.length}건
                        {" · "}
                        10초마다 자동 갱신
                        (조회·처리·팝업 작성 중 일시 중지)
                    </p>

                    <div className="pm-chart">
                        {hasChartData ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <p className="pm-empty">
                                표시할 측정값이 없습니다.
                            </p>
                        )}
                    </div>
                </section>
            </div>

            <section className="pm-card">
                <h2>
                    공정 실행 이력
                    <small>선택 LOT 기준 · 최근 순</small>
                </h2>
                <div className="pm-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>실행번호</th>
                                <th>공정</th>
                                <th>상태</th>
                                <th>시작시간</th>
                                <th>종료시간</th>
                                <th>소요시간(분)</th>
                                <th>최종 검사</th>
                            </tr>
                        </thead>
                        <tbody>
                            {executions.map((row) => (
                                <tr key={row.execution_id}>
                                    <td>{row.execution_id}</td>
                                    <td>{row.process_code}</td>
                                    <td><Badge value={row.status} /></td>
                                    <td>{dateText(row.start_time)}</td>
                                    <td>{dateText(row.end_time)}</td>
                                    <td>{numberText(row.duration_min)}</td>
                                    <td>
                                        {row.process_code === "최종 포장 검사"
                                            && String(row.execution_id)
                                                === String(latest?.execution_id)
                                            && summaryAvailable
                                            ? `합격 ${currentPackagingSummary.passCount}개 / 불합격 ${currentPackagingSummary.failCount}개`
                                            : row.finalQcResult || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {executions.length === 0 && (
                        <p className="pm-empty">조회된 실행 이력이 없습니다.</p>
                    )}
                </div>
            </section>

            {alarm && (
                <AlarmDialog
                    key={alarm.anomalyId}
                    alarm={alarm}
                    users={users}
                    busy={busy}
                    error={dialogError}
                    onClose={() => setAlarm(null)}
                    onSave={(selected, form) => {
                        const confirming = selected.actionStatus === "미확인";

                        mutate(
                            () => confirming
                                ? api.confirm(
                                    selected.anomalyId,
                                    form.userId
                                )
                                : api.action(
                                    selected.anomalyId,
                                    form.userId,
                                    form.actionNote,
                                    form.actionType,
                                    form.actionRemarks
                                ),
                            confirming
                                ? "알람을 확인했습니다. 심각 알람은 조치를 이어서 진행해 주세요."
                                : "알람 조치가 완료되었습니다.",
                            true
                        );
                    }}
                />
            )}

            {qcExecution && (
                <BulkQcApprovalDialog
                    key={qcExecution.execution_id}
                    execution={qcExecution}
                    users={users}
                    busy={busy}
                    error={dialogError}
                    onClose={() => setQcExecution(null)}
                    onApprove={(qcId, userId) => {
                        mutate(
                            () => api.approveBulkQc(
                                qcExecution.execution_id,
                                qcId,
                                userId
                            ),
                            "최종 검사 결과를 승인했습니다. 알람 처리 조건까지 충족하면 다음 공정으로 진행합니다.",
                            true
                        );
                    }}
                />
            )}
        </div>
    );
}