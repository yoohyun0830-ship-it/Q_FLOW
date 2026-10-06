import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

import DetailModal from "../component/DetailModal.jsx";

import "../css/anomaly.css";
import "../css/alarmManagement.css";
import "../css/detailModal.css";

const API_URL = "http://localhost:8080/mask/anomaly-events";

// 값이 없을 때 표시
function display(value) {
    return value === null || value === undefined || value === ""
        ? "-"
        : String(value);
}

// 날짜 표시
function dateText(value) {
    return value
        ? String(value).replace("T", " ").slice(0, 19)
        : "-";
}

// 심각도 표시
function severityText(value) {
    if (value === "ALM_SEV_NORMAL") return "정상";
    if (value === "ALM_SEV_WARN") return "주의";
    if (value === "ALM_SEV_CRIT") return "심각";

    return display(value);
}

// 조치상태 표시
function statusText(value) {
    if (value === "ACKNOWLEDGED") return "확인됨";
    if (value === "UNACKNOWLEDGED") return "미확인";

    return value || "상태 미지정";
}

// 심각도 색상
function severityClass(value) {
    if (value === "ALM_SEV_NORMAL") return "ae-badge ae-success";
    if (value === "ALM_SEV_WARN") return "ae-badge ae-warning";
    if (value === "ALM_SEV_CRIT") return "ae-badge ae-danger";

    return "ae-badge";
}

// 조치상태 색상
function statusClass(value) {
    if (value === "ACKNOWLEDGED") return "ae-badge ae-success";
    if (value === "UNACKNOWLEDGED") return "ae-badge ae-danger";

    return "ae-badge";
}

// 오류 메시지
function errorText(error) {
    const status = error.response?.status;

    if (status === 400) {
        return "검색조건과 페이지 번호를 확인해 주세요.";
    }

    if (status === 404) {
        return "요청한 주소 또는 알람 기록을 찾을 수 없습니다.";
    }

    if (status) {
        return `조회에 실패했습니다. HTTP ${status}`;
    }

    if (error.isAxiosError) {
        return "서버에 연결하지 못했습니다. Spring 실행 상태와 CORS 설정을 확인해 주세요.";
    }

    return error.message || "조회 중 오류가 발생했습니다.";
}

export default function Anomaly() {
    const { pathname } = useLocation();

    const isActions =
        pathname.replace(/\/+$/, "") === "/anomaly/actions";

    // 현재 페이지 목록
    const [alarms, setAlarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [inputError, setInputError] = useState("");

    // 입력 중인 검색조건
    const [draft, setDraft] = useState({
        startDate: "",
        endDate: "",
        severity: "",
        actionStatus: "",
        batchIdKeyword: "",
        processCode: "",
        anomalyType: "",
        userId: ""
    });

    // 실제 조회에 적용한 검색조건
    const [condition, setCondition] = useState({
        startDate: "",
        endDate: "",
        severity: "",
        actionStatus: "",
        batchIdKeyword: "",
        processCode: "",
        anomalyType: "",
        userId: ""
    });

    // 서버 페이징
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // 검색 결과 전체 기준 상태별 집계
    const [summary, setSummary] = useState({});

    // 상세조회 및 팝업
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // 전체조회 + 조건검색 + 서버 페이징
    useEffect(() => {
        const controller = new AbortController();

        async function fetchAlarms() {
            setLoading(true);
            setListError("");
            setAlarms([]);

            try {
                const response = await axios.get(API_URL, {
                    signal: controller.signal,
                    params: {
                        page,
                        startDate: condition.startDate || undefined,
                        endDate: condition.endDate || undefined,
                        severity: condition.severity || undefined,
                        actionStatus: condition.actionStatus || undefined,
                        batchIdKeyword: condition.batchIdKeyword || undefined,
                        processCode: condition.processCode || undefined,
                        anomalyType: condition.anomalyType || undefined,
                        userId:
                            condition.userId === ""
                                ? undefined
                                : Number(condition.userId)
                    }
                });

                if (controller.signal.aborted) return;

                const data = response.data;

                if (
                    !Array.isArray(data?.content) ||
                    !Number.isInteger(data.page) ||
                    data.page !== page ||
                    data.size !== 20 ||
                    !Number.isInteger(data.totalPages) ||
                    data.totalPages < 0 ||
                    !Number.isSafeInteger(data.totalElements) ||
                    data.totalElements < 0
                ) {
                    throw new Error(
                        "페이지 응답 형식을 확인해 주세요. content와 페이지 정보가 필요합니다."
                    );
                }

                // 데이터 삭제 등으로 현재 페이지가 사라진 경우
                if (page > 0 && page >= data.totalPages) {
                    setPage(Math.max(0, data.totalPages - 1));
                    return;
                }

                setAlarms(data.content);
                setPageSize(data.size);
                setTotalCount(data.totalElements);
                setTotalPages(data.totalPages);
                setSummary(data.summary ?? {});
            } catch (error) {
                if (!controller.signal.aborted) {
                    setListError(errorText(error));
                    setTotalCount(0);
                    setTotalPages(0);
                    setSummary({});
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchAlarms();

        return () => controller.abort();
    }, [condition, page]);

    // 상세보기 선택 시 알람 PK 개별조회
    useEffect(() => {
        if (selectedId === null) return;

        const controller = new AbortController();

        async function fetchDetail() {
            setDetailLoading(true);
            setDetailError("");
            setDetail(null);

            try {
                const response = await axios.get(
                    `${API_URL}/${encodeURIComponent(selectedId)}`,
                    {
                        signal: controller.signal
                    }
                );

                if (controller.signal.aborted) return;

                if (!response.data || response.data.anomalyId == null) {
                    throw new Error(
                        "해당 알람의 상세정보를 찾을 수 없습니다."
                    );
                }

                setDetail(response.data);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setDetailError(errorText(error));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        }

        fetchDetail();

        // 팝업이 닫히면 진행 중인 상세조회 취소
        return () => controller.abort();
    }, [selectedId]);

    // 팝업 닫기
    function clearDetail() {
        setSelectedId(null);
        setDetail(null);
        setDetailLoading(false);
        setDetailError("");
    }

    // 검색조건 입력
    function handleChange(event) {
        const { name, value } = event.target;

        setDraft(previous => ({
            ...previous,
            [name]: value
        }));

        setInputError("");
    }

    // 조건검색
    function handleSearch(event) {
        event.preventDefault();

        if (
            draft.startDate &&
            draft.endDate &&
            draft.startDate > draft.endDate
        ) {
            setInputError("시작일은 종료일보다 늦을 수 없습니다.");
            return;
        }

        const userIdText = draft.userId.trim();

        if (userIdText !== "") {
            const userId = Number(userIdText);

            if (
                !Number.isInteger(userId) ||
                userId < 1 ||
                userId > 2147483647
            ) {
                setInputError(
                    "담당자 번호는 1~2147483647 사이의 정수로 입력해 주세요."
                );
                return;
            }
        }

        setInputError("");
        clearDetail();
        setPage(0);

        setCondition({
            ...draft,
            batchIdKeyword: draft.batchIdKeyword.trim(),
            processCode: draft.processCode.trim(),
            anomalyType: draft.anomalyType.trim(),
            userId: userIdText
        });
    }

    // 조건 초기화 후 첫 페이지 조회
    function handleReset() {
        const empty = {
            startDate: "",
            endDate: "",
            severity: "",
            actionStatus: "",
            batchIdKeyword: "",
            processCode: "",
            anomalyType: "",
            userId: ""
        };

        setDraft({ ...empty });
        setCondition({ ...empty });
        setInputError("");
        setPage(0);
        clearDetail();
    }

    // 적용된 검색조건으로 첫 페이지 새로고침
    function handleRefresh() {
        setPage(0);
        clearDetail();
        setCondition(previous => ({ ...previous }));
    }

    // 상세 팝업 열기
    function handleSelect(id) {
        if (id === null || id === undefined || id === selectedId) {
            return;
        }

        setDetail(null);
        setDetailError("");
        setDetailLoading(true);
        setSelectedId(id);
    }

    // 페이지 이동
    function handlePage(nextPage) {
        if (
            loading ||
            nextPage < 0 ||
            nextPage >= totalPages ||
            nextPage === page
        ) {
            return;
        }

        clearDetail();
        setPage(nextPage);
    }

    const countUnavailable = loading || Boolean(listError);

    // 서버에서 상태별 집계를 보내지 않으면 '-' 표시
    const acknowledgedCount = summary.acknowledged;
    const unacknowledgedCount = summary.unacknowledged;

    const firstNumber =
        alarms.length === 0 ? 0 : page * pageSize + 1;

    const lastNumber =
        alarms.length === 0 ? 0 : page * pageSize + alarms.length;

    // 페이지 번호 버튼을 최대 5개씩 표시
    const pageGroupStart = Math.floor(page / 5) * 5;

    const pageNumbers = Array.from(
        {
            length: Math.min(
                5,
                Math.max(0, totalPages - pageGroupStart)
            )
        },
        (_, index) => pageGroupStart + index
    );

    // 팝업 상세정보 항목
    const detailFields = detail
        ? [
            ["알람번호", detail.anomalyId],
            ["LOT 번호", detail.batchId],
            ["제품번호", detail.pouchId],
            ["규칙번호", detail.ruleId],
            ["원본 알람번호", detail.sourceAlarmId],
            ["공정코드", detail.processCode],
            ["이상 유형", detail.anomalyType],
            ["측정항목", detail.sensorName],
            ["측정값", detail.measuredValue],
            ["알람 메시지", detail.alarmMessage],
            ["발생시간", dateText(detail.occurredAt)],
            ["해제시간", dateText(detail.resolvedAt)],
            ["지속시간(초)", detail.durationSec],
            ["조치 담당자", detail.userId],
            ["조치내용", detail.actionNote],
            ["조치시간", dateText(detail.actionTime)],
            ["데이터 출처", detail.sourceType]
        ]
        : [];

    const columnTitles = isActions
        ? [
            "알람번호",
            "LOT 번호",
            "조치상태",
            "조치내용",
            "담당자",
            "조치시간",
            "상세"
        ]
        : [
            "알람번호",
            "발생시간",
            "LOT 번호",
            "공정",
            "심각도",
            "조치상태",
            "상세"
        ];

    return (
        <div className="ae-page">
            <header className="ae-heading">
                <div>
                    <h1>
                        {isActions ? "조치 내역" : "알람 조치 관리"}
                    </h1>
                    <p>
                        조건에 맞는 알람을 검색하고 상세정보를 확인합니다.
                    </p>
                </div>

                <button
                    type="button"
                    className="ae-button"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    ↻ 새로고침
                </button>
            </header>

            {/* 검색 결과 전체 기준 요약 */}
            <div className="ae-summary">
                <div className="ae-stat ae-total">
                    <span className="ae-icon" aria-hidden="true">
                        ≡
                    </span>

                    <div>
                        <span>전체 알람</span>
                        <strong>
                            {countUnavailable
                                ? "-"
                                : totalCount.toLocaleString()}
                        </strong>
                    </div>
                </div>

                <div className="ae-stat ae-confirmed">
                    <span className="ae-icon" aria-hidden="true">
                        ✓
                    </span>

                    <div>
                        <span>확인됨</span>
                        <strong>
                            {countUnavailable
                                ? "-"
                                : display(acknowledgedCount)}
                        </strong>
                    </div>
                </div>

                <div className="ae-stat ae-unconfirmed">
                    <span className="ae-icon" aria-hidden="true">
                        !
                    </span>

                    <div>
                        <span>미확인</span>
                        <strong>
                            {countUnavailable
                                ? "-"
                                : display(unacknowledgedCount)}
                        </strong>
                    </div>
                </div>
            </div>

            <p className="ae-count-note">
                검색조건 기준 · 상태별 집계가 없으면 -로 표시합니다.
            </p>

            {/* 검색조건은 항상 펼쳐서 표시 */}
            <form
                className="ae-card ae-search"
                onSubmit={handleSearch}
            >
                <h2>검색조건</h2>

                <div className="ae-search-row ae-search-first">
                    <fieldset className="ae-period">
                        <legend>발생기간</legend>

                        <div className="ae-date-inputs">
                            <input
                                type="date"
                                name="startDate"
                                aria-label="발생 시작일"
                                value={draft.startDate}
                                max={draft.endDate || undefined}
                                onChange={handleChange}
                            />

                            <span>~</span>

                            <input
                                type="date"
                                name="endDate"
                                aria-label="발생 종료일"
                                value={draft.endDate}
                                min={draft.startDate || undefined}
                                onChange={handleChange}
                            />
                        </div>
                    </fieldset>

                    <label className="ae-field">
                        <span>심각도</span>
                        <select
                            name="severity"
                            value={draft.severity}
                            onChange={handleChange}
                        >
                            <option value="">전체</option>
                            <option value="ALM_SEV_NORMAL">정상</option>
                            <option value="ALM_SEV_WARN">주의</option>
                            <option value="ALM_SEV_CRIT">심각</option>
                        </select>
                    </label>

                    <label className="ae-field">
                        <span>조치상태</span>
                        <select
                            name="actionStatus"
                            value={draft.actionStatus}
                            onChange={handleChange}
                        >
                            <option value="">전체</option>
                            <option value="ACKNOWLEDGED">확인됨</option>
                            <option value="UNACKNOWLEDGED">미확인</option>
                        </select>
                    </label>

                    <label className="ae-field">
                        <span>LOT 번호</span>
                        <input
                            type="text"
                            name="batchIdKeyword"
                            value={draft.batchIdKeyword}
                            onChange={handleChange}
                            placeholder="LOT 번호 일부 입력"
                        />
                    </label>
                </div>

                <div className="ae-search-row ae-search-second">
                    <label className="ae-field">
                        <span>공정코드</span>
                        <input
                            type="text"
                            name="processCode"
                            list="ae-process-options"
                            value={draft.processCode}
                            onChange={handleChange}
                            placeholder="미입력 시 전체 공정"
                        />

                        <datalist id="ae-process-options">
                            <option value="OP_S02_HOMO_DISPERSE" />
                            <option value="PACKAGING" />
                        </datalist>
                    </label>

                    <label className="ae-field">
                        <span>이상 유형</span>
                        <input
                            type="text"
                            name="anomalyType"
                            list="ae-type-options"
                            value={draft.anomalyType}
                            onChange={handleChange}
                            placeholder="저장된 유형 정확히 입력"
                        />

                        <datalist id="ae-type-options">
                            <option value="WARN_TORQUE_HIGH" />
                            <option value="ERR_METAL_DETECTED" />
                            <option value="모터 토크 과다" />
                            <option value="모터 토크 정상 복귀" />
                            <option value="금속 이물 검출" />
                        </datalist>
                    </label>

                    <label className="ae-field">
                        <span>조치 담당자 번호</span>
                        <input
                            type="number"
                            name="userId"
                            min="1"
                            max="2147483647"
                            step="1"
                            value={draft.userId}
                            onChange={handleChange}
                            placeholder="미입력 시 전체 담당자"
                        />
                    </label>
                </div>

                <div className="ae-search-footer">
                    <p>입력하지 않은 조건은 검색에서 제외됩니다.</p>

                    <div className="ae-actions">
                        <button
                            type="button"
                            className="ae-button"
                            onClick={handleReset}
                        >
                            초기화
                        </button>

                        <button
                            type="submit"
                            className="ae-button ae-primary"
                            disabled={loading}
                        >
                            조회
                        </button>
                    </div>
                </div>

                {inputError && (
                    <p className="ae-error" role="alert">
                        {inputError}
                    </p>
                )}
            </form>

            {/* 상세 카드를 제거하고 목록을 전체 너비로 표시 */}
            <div className="ae-content qf-list-only">
                <section className="ae-card" aria-busy={loading}>
                    <div className="ae-card-heading">
                        <h2>
                            {isActions
                                ? "이상 조치 내역"
                                : "이상 발생 이력"}
                        </h2>

                        <span role="status">
                            {loading
                                ? "조회 중..."
                                : listError
                                    ? "조회 실패"
                                    : `검색 결과 ${totalCount.toLocaleString()}건`}
                        </span>
                    </div>

                    {listError ? (
                        <p className="ae-error" role="alert">
                            {listError}
                        </p>
                    ) : (
                        <>
                            <div className="ae-table-wrap">
                                <table className="ae-table">
                                    <thead>
                                        <tr>
                                            {columnTitles.map(title => (
                                                <th key={title} scope="col">
                                                    {title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="ae-message"
                                                >
                                                    목록을 불러오는 중입니다.
                                                </td>
                                            </tr>
                                        ) : alarms.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="ae-message"
                                                >
                                                    조건에 맞는 알람이 없습니다.
                                                </td>
                                            </tr>
                                        ) : (
                                            alarms.map(alarm => (
                                                <tr
                                                    key={alarm.anomalyId}
                                                    className={
                                                        selectedId === alarm.anomalyId
                                                            ? "is-selected"
                                                            : ""
                                                    }
                                                >
                                                    <td>{alarm.anomalyId}</td>

                                                    {isActions ? (
                                                        <>
                                                            <td>
                                                                {display(alarm.batchId)}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={statusClass(
                                                                        alarm.actionStatus
                                                                    )}
                                                                >
                                                                    {statusText(
                                                                        alarm.actionStatus
                                                                    )}
                                                                </span>
                                                            </td>

                                                            <td className="ae-note-cell">
                                                                {display(alarm.actionNote)}
                                                            </td>

                                                            <td>
                                                                {display(alarm.userId)}
                                                            </td>

                                                            <td>
                                                                {dateText(alarm.actionTime)}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>
                                                                {dateText(alarm.occurredAt)}
                                                            </td>

                                                            <td>
                                                                {display(alarm.batchId)}
                                                            </td>

                                                            <td>
                                                                {display(alarm.processCode)}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={severityClass(
                                                                        alarm.severity
                                                                    )}
                                                                >
                                                                    {severityText(
                                                                        alarm.severity
                                                                    )}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={statusClass(
                                                                        alarm.actionStatus
                                                                    )}
                                                                >
                                                                    {statusText(
                                                                        alarm.actionStatus
                                                                    )}
                                                                </span>
                                                            </td>
                                                        </>
                                                    )}

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="ae-detail-button"
                                                            aria-label={`${alarm.anomalyId} 알람 상세보기`}
                                                            onClick={() =>
                                                                handleSelect(
                                                                    alarm.anomalyId
                                                                )
                                                            }
                                                        >
                                                            상세보기
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {!loading && (
                                <div className="ae-list-footer">
                                    <span>
                                        총 {totalCount.toLocaleString()}건 중{" "}
                                        {firstNumber}–{lastNumber}건
                                        {" · "}페이지당 20건
                                    </span>

                                    {totalPages > 0 && (
                                        <nav
                                            className="ae-pagination"
                                            aria-label="알람 목록 페이지"
                                        >
                                            <button
                                                type="button"
                                                aria-label="첫 페이지"
                                                disabled={page === 0}
                                                onClick={() => handlePage(0)}
                                            >
                                                «
                                            </button>

                                            <button
                                                type="button"
                                                disabled={page === 0}
                                                onClick={() =>
                                                    handlePage(page - 1)
                                                }
                                            >
                                                이전
                                            </button>

                                            {pageNumbers.map(number => (
                                                <button
                                                    type="button"
                                                    key={number}
                                                    className={
                                                        page === number
                                                            ? "active"
                                                            : ""
                                                    }
                                                    aria-current={
                                                        page === number
                                                            ? "page"
                                                            : undefined
                                                    }
                                                    disabled={page === number}
                                                    onClick={() =>
                                                        handlePage(number)
                                                    }
                                                >
                                                    {number + 1}
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                disabled={page >= totalPages - 1}
                                                onClick={() =>
                                                    handlePage(page + 1)
                                                }
                                            >
                                                다음
                                            </button>

                                            <button
                                                type="button"
                                                aria-label="마지막 페이지"
                                                disabled={page >= totalPages - 1}
                                                onClick={() =>
                                                    handlePage(totalPages - 1)
                                                }
                                            >
                                                »
                                            </button>
                                        </nav>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>

            {/* 상세보기를 누른 경우에만 팝업 열기 */}
            {selectedId !== null && (
                <DetailModal
                    title={
                        isActions
                            ? "조치 상세정보"
                            : "알람 상세정보"
                    }
                    onClose={clearDetail}
                >
                    <div aria-busy={detailLoading}>
                        {detailLoading ? (
                            <p className="ae-message" role="status">
                                상세정보를 불러오는 중입니다.
                            </p>
                        ) : detailError ? (
                            <p className="ae-error" role="alert">
                                {detailError}
                                <br />
                                창을 닫고 상세보기를 다시 눌러 주세요.
                            </p>
                        ) : detail ? (
                            <>
                                <div className="ae-detail-badges">
                                    <span
                                        className={severityClass(detail.severity)}
                                    >
                                        {severityText(detail.severity)}
                                    </span>

                                    <span
                                        className={statusClass(detail.actionStatus)}
                                    >
                                        {statusText(detail.actionStatus)}
                                    </span>
                                </div>

                                <dl className="ae-detail-list">
                                    {detailFields.map(([label, value]) => (
                                        <div
                                            className="ae-detail-row"
                                            key={label}
                                        >
                                            <dt>{label}</dt>
                                            <dd>{display(value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </>
                        ) : (
                            <p className="ae-message">
                                상세정보가 없습니다.
                            </p>
                        )}
                    </div>
                </DetailModal>
            )}
        </div>
    );
}