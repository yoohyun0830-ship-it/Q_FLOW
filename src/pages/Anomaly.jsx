import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "../css/anomaly.css";

// Spring Controller 주소
const API_URL = "http://localhost:8080/mask/anomaly-events";
// 빈 값 표시
function displayValue(value) {
    if (value === null || value === undefined || value === "") {return "-";}
    return String(value);
}
// 날짜 표시
function displayDate(value) {
    if (!value) return "-";
    return value.replace("T", " ").slice(0, 19);
}
// 상태 표시
function displayStatus(value) {
    if (value === "ACKNOWLEDGED") {
        return "확인됨";
    }
    // 실제 DB의 미확인 코드와 맞춰 주세요.
    if (value === "UNACKNOWLEDGED") {
        return "미확인";
    }
    return value || "상태 미지정";
}
// 심각도 표시
function displaySeverity(value) {
    switch (value) {
        case "ALM_SEV_WARN":
            return "경고";

        case "ALM_SEV_CRIT":
            return "심각";

        default:
            return displayValue(value);
    }
}

// 심각도에 따른 색상
function severityClass(value) {
    switch (value) {
        case "ALM_SEV_WARN":
            return "alarm-badge-warning";

        case "ALM_SEV_CRIT":
            return "alarm-badge-danger";

        default:
            return "alarm-badge-neutral";
    }
}

// 조치상태에 따른 색상
function actionStatusClass(value) {
    switch (value) {
        case "ACKNOWLEDGED":
            return "alarm-badge-success";

        case "UNACKNOWLEDGED":
            return "alarm-badge-danger";

        default:
            return "alarm-badge-neutral";
    }
}
// Axios 오류 메시지
function getErrorMessage(error) {
    const status = error.response?.status;
    if (status === 404) {
        return "요청한 주소 또는 알람 데이터를 찾을 수 없습니다.";
    }
    if (status) {
        return `조회에 실패했습니다. HTTP ${status}`;
    }
    return "서버에 연결하지 못했습니다. Spring 실행 상태와 CORS 설정을 확인해 주세요.";
}
// 상세정보 한 줄
function DetailRow({ label, value }) {
    return (
        <div className="alarm-detail-row">
            <dt>{label}</dt>
            <dd>{displayValue(value)}</dd>
        </div>
    );
}
export default function Anomaly() {
    // 현재 주소로 화면 구분
    const { pathname } = useLocation();
    const isActions = pathname.replace(/\/+$/, "") === "/anomaly/actions";

    // 전체조회 결과
    const [alarms, setAlarms] = useState([]);

    // 선택한 PK와 상세조회 결과
    const [selectedId, setSelectedId] = useState(null);
    const [selectedAlarm, setSelectedAlarm] = useState(null);

    // 전체조회 상태
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState("");

    // 상세조회 상태
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // 새로고침
    const [reload, setReload] = useState(0);

    // 검색창에 입력 중인 값
    const [draftFilters, setDraftFilters] = useState({
        startDate: "",
        endDate: "",
        severity: "",
        actionStatus: "",
        batchId: ""
    });

    // 조회 버튼을 눌렀을 때 실제 적용하는 값
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        severity: "",
        actionStatus: "",
        batchId: ""
    });

    // --------------------------------------------------
    // 1. 전체조회
    // --------------------------------------------------
    useEffect(() => {
        const controller = new AbortController();

        async function fetchAlarms() {
            setListLoading(true);
            setListError("");
            setAlarms([]);

            setSelectedId(null);
            setSelectedAlarm(null);
            setDetailLoading(false);
            setDetailError("");

            try {
                const response = await axios.get(API_URL, {
                    signal: controller.signal
                });

                if (controller.signal.aborted) return;

                if (!Array.isArray(response.data)) {
                    setListError("전체조회 응답이 배열 형식이 아닙니다.");
                    return;
                }

                setAlarms(response.data);

            } catch (error) {
                if (!controller.signal.aborted) {
                    setListError(getErrorMessage(error));
                }

            } finally {
                if (!controller.signal.aborted) {
                    setListLoading(false);
                }
            }
        }

        fetchAlarms();

        return () => controller.abort();

    }, [reload, isActions]);

    // --------------------------------------------------
    // 2. PK 개별조회
    // --------------------------------------------------
    useEffect(() => {
        if (selectedId === null) return;

        const controller = new AbortController();

        async function fetchAlarmDetail() {
            setDetailLoading(true);
            setDetailError("");
            setSelectedAlarm(null);

            try {
                const response = await axios.get(
                    `${API_URL}/${encodeURIComponent(selectedId)}`,
                    {
                        signal: controller.signal
                    }
                );

                if (controller.signal.aborted) return;

                const data = response.data;

                if (!data || data.anomalyId == null) {
                    setDetailError("개별조회 응답을 확인해 주세요.");
                    return;
                }

                setSelectedAlarm(data);

            } catch (error) {
                if (!controller.signal.aborted) {
                    setDetailError(getErrorMessage(error));
                }

            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        }

        fetchAlarmDetail();

        return () => controller.abort();

    }, [selectedId, isActions]);

    // --------------------------------------------------
    // 3. 버튼 및 검색 동작
    // --------------------------------------------------

    // 선택한 상세정보 초기화
    function clearSelection() {
        setSelectedId(null);
        setSelectedAlarm(null);
        setDetailLoading(false);
        setDetailError("");
    }

    // 상세보기
    function handleSelect(anomalyId) {
        if (selectedId === anomalyId) return;

        setSelectedAlarm(null);
        setDetailError("");
        setDetailLoading(true);
        setSelectedId(anomalyId);
    }

    // 서버에서 전체 목록 다시 받기
    function handleRefresh() {
        clearSelection();
        setReload(value => value + 1);
    }

    // 검색창 입력값 변경
    function updateFilter(name, value) {
        setDraftFilters(previous => ({
            ...previous,
            [name]: value
        }));
    }

    // 검색조건 적용
    function handleSearch(event) {
        event.preventDefault();

        setFilters({
            startDate: draftFilters.startDate,
            endDate: draftFilters.endDate,
            severity: draftFilters.severity,
            actionStatus: draftFilters.actionStatus,
            batchId: draftFilters.batchId.trim()
        });

        clearSelection();
    }

    // 검색조건 초기화
    function handleResetSearch() {
        setDraftFilters({
            startDate: "",
            endDate: "",
            severity: "",
            actionStatus: "",
            batchId: ""
        });

        setFilters({
            startDate: "",
            endDate: "",
            severity: "",
            actionStatus: "",
            batchId: ""
        });

        clearSelection();
    }

    // --------------------------------------------------
    // 4. 검색 선택항목
    // --------------------------------------------------

    // 서버 데이터에 있는 심각도를 중복 없이 추출
    const severityOptions = [
        ...new Set(
            alarms
                .map(alarm => alarm.severity)
                .filter(Boolean)
        )
    ];

    // 확인됨·미확인 및 실제 데이터의 다른 상태
    const statusOptions = [
        ...new Set([
            "ACKNOWLEDGED",
            "UNACKNOWLEDGED",
            ...alarms
                .map(alarm => alarm.actionStatus)
                .filter(Boolean)
        ])
    ];

    // --------------------------------------------------
    // 5. 검색조건에 맞는 목록
    // --------------------------------------------------
    const filteredAlarms = alarms.filter(alarm => {

        // 조치 내역 페이지에서는 전체 목록 표시
        if (isActions) return true;

        const occurredDate =
            String(alarm.occurredAt || "").slice(0, 10);

        // 시작일
        if (
            filters.startDate &&
            (!occurredDate || occurredDate < filters.startDate)
        ) {
            return false;
        }

        // 종료일
        if (
            filters.endDate &&
            (!occurredDate || occurredDate > filters.endDate)
        ) {
            return false;
        }

        // 심각도
        if (
            filters.severity &&
            alarm.severity !== filters.severity
        ) {
            return false;
        }

        // 조치상태
        if (
            filters.actionStatus &&
            alarm.actionStatus !== filters.actionStatus
        ) {
            return false;
        }

        // LOT 번호: 부분 일치 검색
        if (
            filters.batchId &&
            !String(alarm.batchId || "")
                .toLowerCase()
                .includes(filters.batchId.toLowerCase())
        ) {
            return false;
        }

        return true;
    });

    // --------------------------------------------------
    // 6. 검색 결과 기준 카드 집계
    // --------------------------------------------------
    const totalCount = filteredAlarms.length;

    const acknowledgedCount = filteredAlarms.filter(
        alarm => alarm.actionStatus === "ACKNOWLEDGED"
    ).length;

    // 실제 DB의 미확인 코드와 맞춰 주세요.
    const unacknowledgedCount = filteredAlarms.filter(
        alarm => alarm.actionStatus === "UNACKNOWLEDGED"
    ).length;

    // 다른 상태 또는 상태 미지정
    const otherCount =
        totalCount - acknowledgedCount - unacknowledgedCount;

    const countUnavailable = listLoading || Boolean(listError);

    // --------------------------------------------------
    // 7. 화면
    // --------------------------------------------------
    return (
        <div className="alarm-page">

            {/* 제목 */}
            <div className="alarm-page-heading">
                <div>
                    <h1>
                        {isActions ? "조치 내역" : "알람 조치 관리"}
                    </h1>

                    <p>
                        {isActions
                            ? "알람별로 저장된 조치상태와 조치내용을 확인합니다."
                            : "조건에 맞는 알람을 검색하고 상세정보를 확인합니다."}
                    </p>
                </div>

                <button
                    type="button"
                    className="alarm-button"
                    onClick={handleRefresh}
                    disabled={listLoading}
                >
                    새로고침
                </button>
            </div>

            {/* 상단 카드 */}
            <div className="alarm-summary alarm-status-summary">

                <div className="alarm-summary-card alarm-stat-card">
                    <span
                        className="alarm-stat-icon"
                        aria-hidden="true"
                    >
                        ≡
                    </span>

                    <div>
                        <span>전체 알람</span>
                        <strong>
                            {countUnavailable ? "-" : totalCount}
                        </strong>
                    </div>
                </div>

                <div className="alarm-summary-card alarm-stat-card alarm-stat-confirmed">
                    <span
                        className="alarm-stat-icon"
                        aria-hidden="true"
                    >
                        ✓
                    </span>

                    <div>
                        <span>확인됨</span>
                        <strong>
                            {countUnavailable ? "-" : acknowledgedCount}
                        </strong>
                    </div>
                </div>

                <div className="alarm-summary-card alarm-stat-card alarm-stat-unconfirmed">
                    <span
                        className="alarm-stat-icon"
                        aria-hidden="true"
                    >
                        !
                    </span>

                    <div>
                        <span>미확인</span>
                        <strong>
                            {countUnavailable ? "-" : unacknowledgedCount}
                        </strong>
                    </div>
                </div>

                {!countUnavailable && otherCount > 0 && (
                    <div className="alarm-summary-card alarm-stat-card">
                        <span
                            className="alarm-stat-icon"
                            aria-hidden="true"
                        >
                            ···
                        </span>

                        <div>
                            <span>기타 상태 / 미지정</span>
                            <strong>{otherCount}</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* 검색창: 메인 페이지에만 표시 */}
            {!isActions && (
                <>
                    <p className="alarm-count-caption">
                        검색조건 기준
                    </p>

                    <form
                        className="alarm-search"
                        onSubmit={handleSearch}
                    >
                        <fieldset className="alarm-date-range">
                            <legend>발생기간</legend>

                            <div>
                                <input
                                    type="date"
                                    aria-label="발생 시작일"
                                    value={draftFilters.startDate}
                                    max={draftFilters.endDate || undefined}
                                    onChange={event =>
                                        updateFilter(
                                            "startDate",
                                            event.target.value
                                        )
                                    }
                                />

                                <span>~</span>

                                <input
                                    type="date"
                                    aria-label="발생 종료일"
                                    value={draftFilters.endDate}
                                    min={draftFilters.startDate || undefined}
                                    onChange={event =>
                                        updateFilter(
                                            "endDate",
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </fieldset>

                        <label>
                            심각도

                            <select
                                value={draftFilters.severity}
                                onChange={event =>
                                    updateFilter(
                                        "severity",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">전체</option>

                                {severityOptions.map(value => (
                                    <option key={value} value={value}>
                                        {displaySeverity(value)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            조치상태

                            <select
                                value={draftFilters.actionStatus}
                                onChange={event =>
                                    updateFilter(
                                        "actionStatus",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">전체</option>

                                {statusOptions.map(value => (
                                    <option key={value} value={value}>
                                        {displayStatus(value)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="alarm-search-lot">
                            LOT 번호

                            <input
                                type="text"
                                placeholder="LOT 번호를 입력하세요"
                                value={draftFilters.batchId}
                                onChange={event =>
                                    updateFilter(
                                        "batchId",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <button
                            type="submit"
                            className="alarm-search-submit"
                            disabled={countUnavailable}
                        >
                            조회
                        </button>

                        <button
                            type="button"
                            onClick={handleResetSearch}
                        >
                            초기화
                        </button>
                    </form>
                </>
            )}

            <div className="alarm-content">

                {/* 왼쪽: 목록 */}
                <section className="alarm-card">
                    <div className="alarm-card-heading">
                        <h2>
                            {isActions
                                ? "이상 조치 내역"
                                : "이상 발생 이력"}
                        </h2>

                        <span>상세보기를 눌러 확인하세요.</span>
                    </div>

                    {listLoading ? (
                        <p className="alarm-message" role="status">
                            목록을 불러오는 중입니다…
                        </p>
                    ) : listError ? (
                        <p className="alarm-error" role="alert">
                            {listError}
                        </p>
                    ) : (
                        <div className="alarm-table-wrap">
                            <table className="alarm-table">

                                <thead>
                                    {isActions ? (
                                        <tr>
                                            <th>알람번호</th>
                                            <th>LOT 번호</th>
                                            <th>조치상태</th>
                                            <th>조치내용</th>
                                            <th>작업자 ID</th>
                                            <th>조치시간</th>
                                            <th>상세</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th>알람번호</th>
                                            <th>발생시간</th>
                                            <th>LOT 번호</th>
                                            <th>공정</th>
                                            <th>심각도</th>
                                            <th>조치상태</th>
                                            <th>상세</th>
                                        </tr>
                                    )}
                                </thead>

                                <tbody>
                                    {filteredAlarms.map(alarm => (
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
                                                        {displayValue(alarm.batchId)}
                                                    </td>

                                                    <td>
                                                        {displayStatus(alarm.actionStatus)}
                                                    </td>

                                                    <td className="alarm-note-cell">
                                                        {displayValue(alarm.actionNote)}
                                                    </td>

                                                    <td>
                                                        {displayValue(alarm.userId)}
                                                    </td>

                                                    <td>
                                                        {displayDate(alarm.actionTime)}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>
                                                        {displayDate(alarm.occurredAt)}
                                                    </td>

                                                    <td>
                                                        {displayValue(alarm.batchId)}
                                                    </td>

                                                    <td>
                                                        {displayValue(alarm.processCode)}
                                                    </td>

                                                    <td>
                                                        <span className={`alarm-badge ${severityClass(alarm.severity)}`}>
                                                            {displaySeverity(alarm.severity)}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className={`alarm-badge ${actionStatusClass(alarm.actionStatus)}`}>
                                                            {displayStatus(alarm.actionStatus)}
                                                        </span>
                                                    </td>
                                                </>
                                            )}

                                            <td>
                                                <button
                                                    type="button"
                                                    className="alarm-detail-button"
                                                    onClick={() =>
                                                        handleSelect(alarm.anomalyId)
                                                    }
                                                    aria-label={`알람 ${alarm.anomalyId} 상세보기`}
                                                >
                                                    상세보기
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {filteredAlarms.length === 0 && (
                                        <tr>
                                            <td colSpan={7}>
                                                조회 결과가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* 오른쪽: PK 상세조회 */}
                <section className="alarm-card alarm-detail">
                    <h2>
                        {isActions
                            ? "조치 상세정보"
                            : "선택한 알람 상세정보"}
                    </h2>

                    {selectedId === null ? (
                        <p className="alarm-message">
                            왼쪽 목록에서 알람을 선택해 주세요.
                        </p>
                    ) : detailLoading ? (
                        <p className="alarm-message" role="status">
                            상세정보를 불러오는 중입니다…
                        </p>
                    ) : detailError ? (
                        <p className="alarm-error" role="alert">
                            {detailError}
                        </p>
                    ) : selectedAlarm ? (
                        <>
                            {/* 공통 기본정보 */}
                            <dl className="alarm-detail-list">
                                <DetailRow
                                    label="알람번호"
                                    value={selectedAlarm.anomalyId}
                                />

                                <DetailRow
                                    label="LOT 번호"
                                    value={selectedAlarm.batchId}
                                />

                                <DetailRow
                                    label="공정"
                                    value={selectedAlarm.processCode}
                                />

                                <DetailRow
                                    label="발생시간"
                                    value={displayDate(selectedAlarm.occurredAt)}
                                />

                                <DetailRow
                                    label="알람 메시지"
                                    value={selectedAlarm.alarmMessage}
                                />
                            </dl>

                            {/* 메인 화면의 상세정보 */}
                            {!isActions && (
                                <>
                                    <h3 className="alarm-section-title">
                                        이상 발생 정보
                                    </h3>

                                    <dl className="alarm-detail-list">
                                        <DetailRow
                                            label="제품번호"
                                            value={selectedAlarm.pouchId}
                                        />

                                        <DetailRow
                                            label="규칙번호"
                                            value={selectedAlarm.ruleId}
                                        />

                                        <DetailRow
                                            label="이상 유형"
                                            value={selectedAlarm.anomalyType}
                                        />

                                        <DetailRow
                                            label="측정항목"
                                            value={selectedAlarm.sensorName}
                                        />

                                        <DetailRow
                                            label="측정값"
                                            value={selectedAlarm.measuredValue}
                                        />

                                        <DetailRow
                                            label="심각도"
                                            value={displaySeverity(selectedAlarm.severity)}
                                        />

                                        <DetailRow
                                            label="해제시간"
                                            value={displayDate(selectedAlarm.resolvedAt)}
                                        />

                                        <DetailRow
                                            label="지속시간(초)"
                                            value={selectedAlarm.durationSec}
                                        />
                                    </dl>
                                </>
                            )}

                            {/* 저장된 조치정보 */}
                            <h3 className="alarm-section-title">
                                조치 기록
                            </h3>

                            <dl className="alarm-detail-list">
                                <DetailRow
                                    label="조치상태"
                                    value={displayStatus(selectedAlarm.actionStatus)}
                                />

                                <DetailRow
                                    label="조치내용"
                                    value={selectedAlarm.actionNote}
                                />

                                <DetailRow
                                    label="작업자 ID"
                                    value={selectedAlarm.userId}
                                />

                                <DetailRow
                                    label="조치시간"
                                    value={displayDate(selectedAlarm.actionTime)}
                                />
                            </dl>
                        </>
                    ) : null}
                </section>

            </div>
        </div>
    );
}