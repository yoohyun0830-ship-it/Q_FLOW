import { useEffect, useRef, useState } from "react";
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

import {
    processMonitorApi as api
} from "../api/manufacturingApi";

import "../css/Process.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
);

// 백엔드에서 사용하는 공정명
const STEPS = [
    "원료 칭량",
    "가열/혼합",
    "냉각",
    "벌크 검사",
    "최종 포장 검사"
];

// 센서 카드와 차트 항목
const METRICS = [
    {
        key: "paddle_rpm",
        label: "교반 RPM",
        unit: "rpm"
    },
    {
        key: "ph_level",
        label: "pH",
        unit: ""
    },
    {
        key: "bulk_viscosity_cps",
        label: "점도",
        unit: "cP"
    },
    {
        key: "motor_torque_pct",
        label: "모터 토크",
        unit: "%"
    }
];

const EMPTY = {
    lot: null,
    executions: [],
    alarms: []
};

// 날짜 표시
function dateText(value) {
    return value
        ? String(value).replace("T", " ").slice(0, 19)
        : "-";
}

// 숫자 표시
function numberText(value) {
    if (
        value === null
        || value === undefined
        || value === ""
    ) {
        return "-";
    }

    return Number(value).toLocaleString("ko-KR", {
        maximumFractionDigits: 3
    });
}

// 요청 오류 메시지
function errorText(error) {
    const body = error.response?.data;

    if (typeof body === "string" && body.length < 500) {
        return body;
    }

    if (body?.detail || body?.message) {
        return body.detail || body.message;
    }

    const status = error.response?.status;

    if (status === 400) {
        return "입력값을 확인해 주세요. 자세한 원인은 서버 로그에서 확인할 수 있습니다.";
    }

    if (status === 404) {
        return "요청한 LOT·공정·알람·사용자를 찾을 수 없습니다.";
    }

    if (status === 409) {
        return "현재 상태에서는 처리할 수 없습니다. 최신 상태와 검사·알람 조건을 확인해 주세요.";
    }

    return error.message || "요청에 실패했습니다.";
}

// 아직 처리가 필요한 알람인지 확인
function isPending(alarm) {
    if (alarm.severity === "정상") {
        return false;
    }

    if (alarm.severity === "주의") {
        return !["확인됨", "조치완료"].includes(
            alarm.actionStatus
        );
    }

    if (alarm.severity === "심각") {
        return (
            alarm.actionStatus !== "조치완료"
            || !alarm.actionNote?.trim()
        );
    }

    // 알 수 없는 심각도는 미처리로 표시
    return true;
}

// 상태 표시
function Badge({ value }) {
    let tone = "gray";

    if (
        ["완료", "확인됨", "조치완료", "정상"].includes(value)
    ) {
        tone = "green";

    } else if (value === "진행중") {
        tone = "blue";

    } else if (value === "주의") {
        tone = "yellow";

    } else if (["심각", "미확인"].includes(value)) {
        tone = "red";
    }

    return (
        <span className={`pm-badge pm-${tone}`}>
            {value || "대기"}
        </span>
    );
}

// 알람 확인·조치 팝업
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
    const [note, setNote] = useState("");

    const severe = alarm.severity === "심각";

    const supported = ["주의", "심각"].includes(
        alarm.severity
    );

    useEffect(() => {
        const element = dialog.current;

        element.showModal();

        return () => element.close();
    }, []);

    return (
        <dialog
            ref={dialog}
            className="pm-dialog"
            aria-labelledby="pm-dialog-title"
            onCancel={(event) => {
                event.preventDefault();

                if (!busy) {
                    onClose();
                }
            }}
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    onSave(
                        alarm,
                        Number(userId),
                        note.trim()
                    );
                }}
            >
                <div className="pm-heading">
                    <h2 id="pm-dialog-title">
                        {severe
                            ? "심각 알람 조치"
                            : "알람 확인"}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="닫기"
                    >
                        ×
                    </button>
                </div>

                <div className="pm-alarm-info">
                    <Badge value={alarm.severity} />

                    <span>
                        알람번호 {alarm.anomalyId}
                    </span>

                    <dl>
                        <dt>공정</dt>
                        <dd>{alarm.processCode || "-"}</dd>

                        <dt>이상 유형</dt>
                        <dd>{alarm.anomalyType || "-"}</dd>

                        <dt>측정값</dt>
                        <dd>
                            {numberText(alarm.measuredValue)}
                        </dd>

                        <dt>메시지</dt>
                        <dd>{alarm.alarmMessage || "-"}</dd>
                    </dl>
                </div>

                <label className="pm-field">
                    {severe
                        ? "조치 담당자"
                        : "확인 담당자"}

                    <select
                        required
                        autoFocus
                        value={userId}
                        disabled={busy}
                        onChange={(event) => {
                            setUserId(event.target.value);
                        }}
                    >
                        <option value="">
                            담당자를 선택하세요
                        </option>

                        {users.map((user) => (
                            <option
                                key={user.userId}
                                value={user.userId}
                            >
                                {user.userName} ({user.userId})
                            </option>
                        ))}
                    </select>
                </label>

                {severe && (
                    <label className="pm-field">
                        조치내용

                        <textarea
                            required
                            rows={5}
                            value={note}
                            disabled={busy}
                            placeholder="점검 내용과 조치 결과를 입력해 주세요."
                            onChange={(event) => {
                                setNote(event.target.value);
                            }}
                        />
                    </label>
                )}

                {!supported && (
                    <p role="alert">
                        알 수 없는 심각도입니다.
                        서버 데이터를 확인해 주세요.
                    </p>
                )}

                {error && (
                    <p className="pm-error" role="alert">
                        {error}
                    </p>
                )}

                <div className="pm-actions">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                    >
                        취소
                    </button>

                    <button
                        type="submit"
                        className="pm-primary"
                        disabled={
                            busy
                            || !supported
                            || !userId
                            || (severe && !note.trim())
                        }
                    >
                        {busy
                            ? "처리 중…"
                            : severe
                                ? "조치 완료"
                                : "확인 처리"}
                    </button>
                </div>

                <p className="pm-muted">
                    처리 후 진행 재검사를 눌러
                    다음 공정 진행 여부를 확인하세요.
                </p>
            </form>
        </dialog>
    );
}
// 벌크 검사 최종 결과 승인 팝업
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

    const [qcId, setQcId] = useState(
        execution.finalQcId || ""
    );
    const [userId, setUserId] = useState("");

    const selected = records.find(
        (item) => item.qc_id === qcId
    );

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

        api.bulkQcResults(
            execution.execution_id,
            controller.signal
        )
            .then((rows) => {
                if (!controller.signal.aborted) {
                    setRecords(rows);
                }
            })
            .catch((failure) => {
                if (!controller.signal.aborted) {
                    setLoadError(errorText(failure));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
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

                if (!busy) {
                    onClose();
                }
            }}
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (busy || loading || !canApprove || !userId) {
                        return;
                    }

                    const confirmed = window.confirm(
                        `검사 ${qcId}의 "${result}" 결과를 `
                        + "최종 검사 결과로 승인할까요?"
                    );

                    if (confirmed) {
                        onApprove(qcId, Number(userId));
                    }
                }}
            >
                <div className="pm-heading">
                    <h2 id="pm-qc-title">
                        벌크 검사 결과 승인
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

                <p className="pm-muted">
                    LOT: {execution.batchId}
                    <br />
                    벌크 검사 실행번호: {execution.execution_id}
                    <br />
                    현재 승인된 검사: {execution.finalQcId || "없음"}
                </p>

                {loading && (
                    <p role="status">검사 결과를 조회하고 있습니다…</p>
                )}

                {loadError && (
                    <p className="pm-error" role="alert">
                        {loadError}
                    </p>
                )}

                {!loading && !loadError && records.length === 0 && (
                    <p className="pm-error">
                        이 실행번호에 연결된 검사 결과가 없습니다.
                        검사 결과 등록 시 공정 실행번호가 연결되어
                        있는지 확인해 주세요.
                    </p>
                )}

                <label className="pm-field">
                    최종 승인할 검사 결과

                    <select
                        autoFocus
                        required
                        value={qcId}
                        disabled={busy || loading || Boolean(loadError)}
                        onChange={(event) => setQcId(event.target.value)}
                    >
                        <option value="">검사 결과를 선택하세요</option>

                        {records.map((item) => (
                            <option
                                key={item.qc_id}
                                value={item.qc_id}
                            >
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
                            <dd>
                                <span
                                    className={
                                        "pm-badge "
                                        + (result === "합격"
                                            ? "pm-green"
                                            : result === "불합격"
                                                ? "pm-red"
                                                : "pm-gray")
                                    }
                                >
                                    {result || "미판정"}
                                </span>
                            </dd>

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
                            <option
                                key={user.userId}
                                value={user.userId}
                            >
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
                        불합격 결과도 최종 결과로 기록할 수 있지만,
                        다음 공정으로 진행할 수는 없습니다.
                    </p>
                )}

                {error && (
                    <p className="pm-error" role="alert">
                        {error}
                    </p>
                )}

                <div className="pm-actions">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                    >
                        취소
                    </button>

                    <button
                        type="submit"
                        className="pm-primary"
                        disabled={
                            busy
                            || loading
                            || Boolean(loadError)
                            || !canApprove
                            || !userId
                        }
                    >
                        {busy ? "승인 중…" : "최종 결과 승인"}
                    </button>
                </div>

                <p className="pm-muted">
                    승인은 검사 결과를 확정하는 작업입니다.
                    공정은 데이터 생성 후 자동 종료됩니다.
                    승인 및 알람 처리 조건을 충족하면 다음 공정으로 진행합니다.
                </p>
            </form>
        </dialog>
    );
}

export default function Process() {
    // LOT·사용자 선택 목록
    const [lots, setLots] = useState([]);
    const [users, setUsers] = useState([]);
    const [simulation, setSimulation] = useState(null);
    const [simulationError, setSimulationError] = useState("");

    // 입력·선택값을 변경하지 않고 현재 생성 LOT 안내만 2초 간격으로 갱신한다.
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
                if (!controller.signal.aborted) setSimulationError(errorText(failure));
            } finally {
                if (!controller.signal.aborted) timer = setTimeout(refreshSimulation, 2000);
            }
        }
        refreshSimulation();
        return () => { controller.abort(); clearTimeout(timer); };
    }, []);

    // 입력 중인 LOT와 실제 조회한 LOT
    const [input, setInput] = useState("");
    const [batchId, setBatchId] = useState("");

    // 조회 결과
    const [snapshot, setSnapshot] = useState(EMPTY);

    // 값이 바뀌면 서버에서 다시 조회
    const [revision, setRevision] = useState(0);

    // 조회·처리 상태
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);

    // 같은 요청의 연속 클릭 방지
    const busyRef = useRef(false);

    // 안내·오류 메시지
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [setupError, setSetupError] = useState("");
    const [notice, setNotice] = useState("");

    // 알람 팝업
    const [alarm, setAlarm] = useState(null);
    const [dialogError, setDialogError] = useState("");
    // 승인 팝업에서 처리할 벌크 검사 실행
    const [qcExecution, setQcExecution] = useState(null);

    // 센서 조회
    const [sensorId, setSensorId] = useState("");
    const [sensors, setSensors] = useState([]);
    const [sensorLoading, setSensorLoading] = useState(false);
    const [sensorError, setSensorError] = useState("");

    const [metricKey, setMetricKey] = useState(
        "motor_torque_pct"
    );

    const {
        lot,
        executions,
        alarms
    } = snapshot;

    // 서버가 최근 실행 순서로 반환
    const latest = executions[0];

    const running = executions.filter(
        (item) => item.status === "진행중"
    );

    const pending = alarms.filter(isPending);

    const blocked = loading || busy || !lot;

    const canStart = (
        lot?.status === "대기"
        && executions.length === 0
    );

    const canResume = (
        lot?.status === "진행중"
        && running.length === 0
        && latest?.status === "완료"
    );

    // 최근 LOT·사용자 목록 조회
    useEffect(() => {
        const controller = new AbortController();

        Promise.allSettled([
            api.lots(controller.signal),
            api.users(controller.signal)
        ]).then((results) => {
            if (controller.signal.aborted) {
                return;
            }

            if (results[0].status === "fulfilled") {
                setLots(results[0].value);
            }

            if (results[1].status === "fulfilled") {
                setUsers(results[1].value);
            }

            const failures = results.filter(
                (item) => item.status === "rejected"
            );

            setSetupError(
                failures
                    .map((item) => errorText(item.reason))
                    .join(" / ")
            );
        });

        return () => controller.abort();
    }, [revision]);

    // 선택한 LOT·공정 실행·알람 조회
    useEffect(() => {
        if (!batchId) {
            return;
        }

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

                if (controller.signal.aborted) {
                    return;
                }

                setSnapshot({
                    lot: selectedLot,
                    executions: rows,
                    alarms: alarmList
                });

                // 기존 센서 조회 대상이 남아 있으면 유지
                setSensorId((previous) => {
                    const exists = rows.some(
                        (row) =>
                            String(row.execution_id) === previous
                    );

                    return exists
                        ? previous
                        : String(rows[0]?.execution_id ?? "");
                });

            } catch (failure) {
                if (!controller.signal.aborted) {
                    setSnapshot(EMPTY);
                    setLoadError(errorText(failure));
                }

            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => controller.abort();
    }, [batchId, revision]);

    // 선택한 실행의 최근 센서값 조회
    useEffect(() => {
        const controller = new AbortController();

        setSensors([]);
        setSensorError("");

        if (!sensorId) {
            setSensorLoading(false);

            return () => controller.abort();
        }

        setSensorLoading(true);

        api.sensors(sensorId, controller.signal)
            .then((rows) => {
                if (!controller.signal.aborted) {
                    setSensors(rows);
                }
            })
            .catch((failure) => {
                if (!controller.signal.aborted) {
                    setSensorError(errorText(failure));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setSensorLoading(false);
                }
            });

        return () => controller.abort();
    }, [sensorId, batchId, revision]);

    // 저장·종료·재개·알람 처리 공통 실행
    async function mutate(
        task,
        successMessage,
        inDialog = false
    ) {
        if (busyRef.current) {
            return;
        }

        busyRef.current = true;

        setBusy(true);
        setError("");
        setDialogError("");
        setNotice("");

        try {
            const result = await task();

            setNotice(
                result.message || successMessage
            );

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

            // 성공·실패 후 모두 서버 상태 재조회
            // 변경 요청 자체를 자동 재전송하지는 않음
            setRevision((value) => value + 1);
        }
    }

    // 차트 데이터
    const metric = METRICS.find(
        (item) => item.key === metricKey
    );

    // 센서 API는 최신순이므로 차트에서는 시간순으로 변경
    const chronological = [...sensors].reverse();

    const numericValues = chronological.map((row) => {
        const value = row[metricKey];

        if (
            value === null
            || value === undefined
            || value === ""
        ) {
            return null;
        }

        return Number(value);
    });

    const chartData = {
        labels: chronological.map(
            (row) => dateText(row.timestamp)
        ),
        datasets: [
            {
                label: `${metric.label} ${metric.unit}`,
                data: numericValues,
                borderColor: "#2563eb",
                backgroundColor: "#dbeafe",
                pointRadius: 3,
                tension: 0.2,
                spanGaps: false
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            datalabels: {
                display: false
            }
        },
        scales: {
            x: {
                ticks: {
                    maxTicksLimit: 5,
                    callback: function (value) {
                        return this
                            .getLabelForValue(value)
                            .slice(11);
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

    const hasChartData = numericValues.some(
        (value) =>
            value !== null
            && Number.isFinite(value)
    );

    // 현재 상태 안내
    let guidance = "LOT를 선택해 주세요.";

    if (lot?.status === "완료") {
        guidance = "LOT 생산이 완료되었습니다.";

    } else if (pending.length > 0) {
        guidance =
            `미처리 알람 ${pending.length}건이 있습니다. `
            + "확인 또는 조치를 완료해 주세요.";

    } else if (running.length > 1) {
        guidance =
            "진행 중인 공정이 여러 개입니다. "
            + "실행 이력을 확인해 주세요.";

    } else if (running.length === 1) {
        guidance =
            `${running[0].process_code} 공정이 진행 중입니다.`;

    } else if (canStart) {
        guidance =
            "원료 칭량부터 생산을 시작할 수 있습니다.";

    } else if (canResume) {
        if (
            latest.process_code === "벌크 검사"
            && latest.finalQcResult !== "합격"
        ) {
            guidance =
                "벌크 검사의 최종 합격 승인 후 "
                + "진행 재검사를 눌러 주세요.";
        } else {
            guidance =
                "공정이 종료되었습니다. "
                + "진행 재검사로 다음 진행 여부를 확인하세요.";
        }
    }

    return (
        <div className="pm-page">

            {/* 페이지 제목 */}
            <header className="pm-heading">
                <div>
                    <h1>공정 모니터링</h1>
                    <p>
                        LOT별 공정 진행과 알람 처리 상태를 확인합니다.
                    </p>
                </div>

                <button
                    disabled={busy || loading}
                    onClick={() => {
                        setRevision((value) => value + 1);
                    }}
                >
                    ↻ 새로고침
                </button>
            </header>

            {setupError && (
                <p className="pm-error" role="alert">
                    보조 목록 조회: {setupError}
                </p>
            )}

            {/* LOT 선택 */}
            <div className="pm-card pm-current-lot" aria-live="polite">
                <span>현재 생산 LOT</span>
                {simulationError ? (
                    <span className="pm-error">조회 실패: {simulationError}</span>
                ) : simulation?.batchId ? (
                    <>
                        <code>{simulation.batchId}</code>
                        <Badge value={simulation.pendingData?.tableName === "batches"
                            ? "등록 중" : simulation.executionId == null ? "대기" : "진행중"} />
                        {simulation.waitingReason && <span className="pm-muted">{simulation.waitingReason}</span>}
                        {simulation.lastError && <span className="pm-error">{simulation.lastError}</span>}
                    </>
                ) : (
                    <span className="pm-muted">{simulation == null ? "LOT 확인 중…"
                        : simulation.completedBatchId ? "생산 완료 · 다음 대기 LOT 준비 중" : "대기 LOT 준비 중"}</span>
                )}
            </div>
            <form
                className="pm-card pm-selector"
                onSubmit={(event) => {
                    event.preventDefault();

                    if (!input.trim() || busy) {
                        return;
                    }

                    setSnapshot(EMPTY);
                    setSensors([]);
                    setSensorId("");
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
                        onChange={(event) => {
                            setInput(event.target.value);
                        }}
                    />

                    <datalist id="pm-lots">
                        {lots.map((item) => (
                            <option
                                key={item.batchId}
                                value={item.batchId}
                            >
                                {item.productName} · {item.status}
                            </option>
                        ))}
                    </datalist>
                </label>

                <button
                    type="submit"
                    className="pm-primary"
                    disabled={
                        busy
                        || loading
                        || !input.trim()
                    }
                >
                    조회
                </button>

                <div className="pm-product">
                    <small>제품명</small>
                    <strong>
                        {lot?.productName || "-"}
                    </strong>
                </div>

                <div>
                    <small>LOT 상태</small>
                    <Badge value={lot?.status || "미선택"} />
                </div>
            </form>

            {error && (
                <p className="pm-error" role="alert">
                    {error}
                </p>
            )}

            {loadError && (
                <p className="pm-error" role="alert">
                    조회 실패: {loadError}
                </p>
            )}

            {notice && (
                <p className="pm-notice" role="status">
                    {notice}
                </p>
            )}

            {loading && (
                <p className="pm-muted" role="status">
                    최신 상태를 조회하고 있습니다…
                </p>
            )}

            {/* 5단계 공정 흐름 */}
            <section
                className="pm-flow"
                aria-label="공정 흐름도"
            >
                {STEPS.map((name, index) => {
                    const row = executions.find(
                        (item) => item.process_code === name
                    );

                    return (
                        <article
                            key={name}
                            className={
                                "pm-step "
                                + (
                                    row?.status === "진행중"
                                        ? "pm-step-active"
                                        : ""
                                )
                            }
                        >
                            <h2>
                                {index + 1}. {name}
                            </h2>

                            <Badge value={row?.status || "대기"} />

                            {
                                row?.execution_id
                                    === latest?.execution_id
                                && pending.length > 0
                                && (
                                    <span className="pm-wait">
                                        알람 처리 필요
                                    </span>
                                )
                            }

                            <dl>
                                <dt>시작시간</dt>
                                <dd>
                                    {dateText(row?.start_time)}
                                </dd>

                                <dt>종료시간</dt>
                                <dd>
                                    {dateText(row?.end_time)}
                                </dd>

                                <dt>실행번호</dt>
                                <dd>
                                    {row?.execution_id ?? "-"}
                                </dd>
                            </dl>
                        </article>
                    );
                })}
            </section>

            {/* 진행 안내와 조작 버튼 */}
            <section
                className={
                    "pm-banner "
                    + (
                        pending.length > 0
                            ? "pm-banner-alert"
                            : ""
                    )
                }
            >
                <strong>{guidance}</strong>

                <div className="pm-actions">
                    {canStart && (
                        <button
                            className="pm-primary"
                            disabled={blocked}
                            onClick={() => {
                                mutate(
                                    () => api.start(batchId),
                                    "원료 칭량이 시작되었습니다."
                                );
                            }}
                        >
                            공정 시작
                        </button>
                    )}

                    {canResume && (
                        <button
                            disabled={blocked}
                            onClick={() => {
                                mutate(
                                    () => api.resume(
                                        latest.execution_id
                                    ),
                                    "진행 조건을 확인했습니다."
                                );
                            }}
                        >
                            진행 재검사
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
                        <Link to="/quality">
                            품질관리 열기
                        </Link>
                    )}
                </div>
            </section>

            {/* 현재 실행의 미처리 알람 */}
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

                                        <td>
                                            <Badge
                                                value={item.severity}
                                            />
                                        </td>

                                        <td>
                                            {
                                                item.anomalyType
                                                || item.alarmMessage
                                            }
                                        </td>

                                        <td>
                                            {item.actionStatus || "-"}
                                        </td>

                                        <td>
                                            <button
                                                disabled={
                                                    blocked
                                                    || ![
                                                        "주의",
                                                        "심각"
                                                    ].includes(
                                                        item.severity
                                                    )
                                                }
                                                onClick={() => {
                                                    setDialogError("");
                                                    setAlarm(item);
                                                }}
                                            >
                                                {item.severity === "주의"
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

            {/* 센서 조회 대상 */}
            <div className="pm-heading pm-sensor-heading">
                <h2>센서 모니터링</h2>

                <label>
                    조회할 실행{" "}

                    <select
                        value={sensorId}
                        disabled={loading}
                        onChange={(event) => {
                            setSensorId(event.target.value);
                        }}
                    >
                        <option value="">선택</option>

                        {executions.map((row) => (
                            <option
                                key={row.execution_id}
                                value={row.execution_id}
                            >
                                {row.process_code} · {row.execution_id}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {sensorError && (
                <p className="pm-error" role="alert">
                    센서 조회: {sensorError}
                </p>
            )}

            <div className="pm-sensor-grid">

                {/* 최근 센서값 */}
                <section className="pm-card">
                    <h2>최근 센서 측정값</h2>

                    <p className="pm-muted">
                        {sensorLoading
                            ? "조회 중…"
                            : sensors.length > 0
                                ? (
                                    "측정시각: "
                                    + dateText(sensors[0].timestamp)
                                )
                                : "연결된 센서 데이터가 없습니다."}
                    </p>

                    <div className="pm-metrics">
                        {METRICS.map((item) => (
                            <div key={item.key}>
                                <span>{item.label}</span>

                                <strong>
                                    {
                                        numberText(
                                            sensors[0]?.[item.key]
                                        )
                                    }
                                </strong>

                                <small>{item.unit}</small>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 센서 그래프 */}
                <section className="pm-card">
                    <div className="pm-heading">
                        <h2>센서 변화</h2>

                        <select
                            aria-label="차트 측정항목"
                            value={metricKey}
                            onChange={(event) => {
                                setMetricKey(event.target.value);
                            }}
                        >
                            {METRICS.map((item) => (
                                <option
                                    key={item.key}
                                    value={item.key}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <p className="pm-muted">
                        선택한 실행의 최근 {sensors.length}건
                        {" · "}새로고침 시 갱신
                    </p>

                    <div className="pm-chart">
                        {hasChartData ? (
                            <Line
                                data={chartData}
                                options={chartOptions}
                            />
                        ) : (
                            <p className="pm-empty">
                                표시할 측정값이 없습니다.
                            </p>
                        )}
                    </div>
                </section>
            </div>

            {/* 공정 실행 이력 */}
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

                                    <td>
                                        <Badge value={row.status} />
                                    </td>

                                    <td>
                                        {dateText(row.start_time)}
                                    </td>

                                    <td>
                                        {dateText(row.end_time)}
                                    </td>

                                    <td>
                                        {numberText(row.duration_min)}
                                    </td>

                                    <td>
                                        {row.finalQcResult || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {executions.length === 0 && (
                        <p className="pm-empty">
                            조회된 실행 이력이 없습니다.
                        </p>
                    )}
                </div>
            </section>

            {/* 알람 처리 팝업 */}
            {alarm && (
                <AlarmDialog
                    key={alarm.anomalyId}
                    alarm={alarm}
                    users={users}
                    busy={busy}
                    error={dialogError}
                    onClose={() => setAlarm(null)}
                    onSave={(selected, userId, note) => {
                        mutate(
                            () => (
                                selected.severity === "주의"
                                    ? api.confirm(
                                        selected.anomalyId,
                                        userId
                                    )
                                    : api.action(
                                        selected.anomalyId,
                                        userId,
                                        note
                                    )
                            ),
                            "알람 처리가 완료되었습니다. "
                            + "종료된 공정은 진행 재검사로 "
                            + "다음 단계를 확인하세요.",
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
                            "최종 검사 결과를 승인했습니다. "
                            + "알람 처리 조건까지 충족하면 다음 공정으로 자동 진행합니다.",
                            true
                        );
                    }}
                />
                )}
        </div>
    );
}
