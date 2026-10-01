import { useEffect, useState } from "react";
import axios from "axios";

import "../css/quality.css";

const API_URL = "http://localhost:8080/mask/bulk-qc";

function display(value) {
    return value === null || value === undefined || value === ""
        ? "-"
        : String(value);
}

function dateText(value) {
    return value
        ? String(value).replace("T", " ").slice(0, 19)
        : "-";
}

function resultText(value) {
    if (value === "QC_RESULT_PASS") return "합격";
    if (value === "QC_RESULT_FAIL") return "불합격";
    return display(value);
}

function resultClass(value) {
    if (value === "QC_RESULT_PASS") return "qc-badge is-pass";
    if (value === "QC_RESULT_FAIL") return "qc-badge is-fail";
    return "qc-badge";
}

function errorText(error) {
    if (error.response?.status === 400) {
        return "검색조건을 확인해 주세요. 날짜와 담당자 번호가 올바르지 않습니다.";
    }

    if (error.response?.status === 404) {
        return "해당 검사 기록을 찾을 수 없습니다.";
    }

    if (error.response) {
        return `조회에 실패했습니다. HTTP ${error.response.status}`;
    }

    if (error.isAxiosError) {
        return "서버에 연결하지 못했습니다. Spring 실행 상태와 CORS 설정을 확인해 주세요.";
    }

    return error.message || "조회 중 오류가 발생했습니다.";
}

export default function Quality() {
    const [tab, setTab] = useState("bulk");

    // 입력 중인 조건
    const [draft, setDraft] = useState({
        startDate: "",
        endDate: "",
        batchId: "",
        overallQcResult: "",
        userId: ""
    });

    // 조회 버튼으로 적용한 조건
    const [condition, setCondition] = useState({
        startDate: "",
        endDate: "",
        batchId: "",
        overallQcResult: "",
        userId: ""
    });

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [inputError, setInputError] = useState("");

    // 선택한 검사와 상세조회 결과
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // 조건검색: 조건이 없으면 전체조회
    useEffect(() => {
        const controller = new AbortController();

        async function fetchList() {
            setLoading(true);
            setListError("");
            setRows([]);

            try {
                const response = await axios.get(API_URL, {
                    signal: controller.signal,
                    params: {
                        startDate: condition.startDate || undefined,
                        endDate: condition.endDate || undefined,
                        batchId: condition.batchId || undefined,
                        overallQcResult:
                            condition.overallQcResult || undefined,
                        userId:
                            condition.userId === ""
                                ? undefined
                                : Number(condition.userId)
                    }
                });

                if (controller.signal.aborted) return;

                if (!Array.isArray(response.data)) {
                    throw new Error(
                        "스프링 응답이 배열이 아닙니다. List 반환 여부를 확인해 주세요."
                    );
                }

                setRows(response.data);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setListError(errorText(error));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchList();

        return () => controller.abort();
    }, [condition]);

    // 검사번호(PK)로 상세조회
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
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                if (!response.data || response.data.qc_id == null) {
                    throw new Error(
                        "검사 상세정보의 응답 형식을 확인해 주세요."
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

        return () => controller.abort();
    }, [selectedId]);

    function clearDetail() {
        setSelectedId(null);
        setDetail(null);
        setDetailLoading(false);
        setDetailError("");
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setDraft(previous => ({
            ...previous,
            [name]: value
        }));

        setInputError("");
    }

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

        if (draft.userId !== "") {
            const userId = Number(draft.userId);

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

        setCondition({
            ...draft,
            batchId: draft.batchId.trim()
        });
    }

    function handleReset() {
        const empty = {
            startDate: "",
            endDate: "",
            batchId: "",
            overallQcResult: "",
            userId: ""
        };

        setDraft({ ...empty });
        setCondition({ ...empty });
        setInputError("");
        clearDetail();
    }

    // 입력 중인 값이 아닌, 마지막으로 적용한 조건으로 재조회
    function handleRefresh() {
        clearDetail();
        setCondition(previous => ({ ...previous }));
    }

    function handleSelect(qcId) {
        setDetail(null);
        setDetailError("");
        setDetailLoading(true);
        setSelectedId(qcId);
    }

    // 서버에서 반환한 검색 결과 전체 기준
    const passCount = rows.filter(
        row => row.overall_qc_result === "QC_RESULT_PASS"
    ).length;

    const failCount = rows.filter(
        row => row.overall_qc_result === "QC_RESULT_FAIL"
    ).length;

    const otherCount = rows.length - passCount - failCount;
    const countsUnavailable = loading || Boolean(listError);

    // 오른쪽 상세정보 항목
    const detailFields = detail
        ? [
            ["검사번호", detail.qc_id],
            ["LOT 번호", detail.batchId],
            ["검사시간", dateText(detail.sample_time)],
            ["담당자 번호", detail.userId],
            ["측정 pH", detail.ph_measured],
            ["pH 합격범위", detail.ph_criteria],
            ["측정 점도", detail.viscosity_measured],
            ["점도 합격범위", detail.viscosity_criteria],
            ["측정 비중", detail.specific_gravity],
            ["비중 합격범위", detail.sg_criteria],
            [
                "외관검사",
                detail.appearance_code === "APP_PASS_PALEBLUE"
                    ? "적합"
                    : detail.appearance_code
            ],
            [
                "미세기포",
                detail.microbubble_code === "BUBBLE_PASS_ZERO"
                    ? "없음"
                    : detail.microbubble_code
            ],
            [
                "미생물",
                detail.microbial_cfu == null
                    ? null
                    : `${detail.microbial_cfu} CFU`
            ],
            ["검사 비고", detail.qc_notes_code],
            ["데이터 출처", detail.record_source],
            ["등록시간", dateText(detail.createdAt)],
            ["수정시간", dateText(detail.updatedAt)]
        ]
        : [];

    return (
        <div className="quality-page">
            <header className="quality-heading">
                <div>
                    <h1>품질 관리</h1>
                    <p>조건에 맞는 검사 기록을 검색하고 상세정보를 확인합니다.</p>
                </div>

                {tab === "bulk" && (
                    <button
                        type="button"
                        className="qc-button"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        ↻ 새로고침
                    </button>
                )}
            </header>

            <nav className="quality-tabs" aria-label="품질검사 종류">
                <button
                    type="button"
                    className={tab === "bulk" ? "active" : ""}
                    aria-pressed={tab === "bulk"}
                    onClick={() => setTab("bulk")}
                >
                    벌크 검사
                </button>

                <button
                    type="button"
                    className={tab === "finished" ? "active" : ""}
                    aria-pressed={tab === "finished"}
                    onClick={() => setTab("finished")}
                >
                    완제품 검사
                </button>
            </nav>

            {tab === "bulk" ? (
                <>
                    {/* 상단 요약 카드 */}
                    <div className="qc-summary">
                        <div className="qc-stat qc-stat-total">
                            <span className="qc-stat-icon" aria-hidden="true">
                                ≡
                            </span>
                            <div>
                                <span>전체 검사</span>
                                <strong>
                                    {countsUnavailable ? "-" : rows.length}
                                </strong>
                            </div>
                        </div>

                        <div className="qc-stat qc-stat-pass">
                            <span className="qc-stat-icon" aria-hidden="true">
                                ✓
                            </span>
                            <div>
                                <span>합격</span>
                                <strong>
                                    {countsUnavailable ? "-" : passCount}
                                </strong>
                            </div>
                        </div>

                        <div className="qc-stat qc-stat-fail">
                            <span className="qc-stat-icon" aria-hidden="true">
                                !
                            </span>
                            <div>
                                <span>불합격</span>
                                <strong>
                                    {countsUnavailable ? "-" : failCount}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <p className="qc-summary-note">
                        검색조건 기준
                        {!countsUnavailable && otherCount > 0
                            ? ` · 기타·미판정 ${otherCount}건 포함`
                            : ""}
                    </p>

                    {/* 검색조건 */}
                    <form className="qc-card qc-search" onSubmit={handleSearch}>
                        <h2>검색조건</h2>

                        <div className="qc-basic-filters">
                            <fieldset className="qc-period">
                                <legend>검사기간</legend>

                                <div className="qc-date-inputs">
                                    <input
                                        aria-label="검사 시작일"
                                        type="date"
                                        name="startDate"
                                        value={draft.startDate}
                                        onChange={handleChange}
                                    />

                                    <span>~</span>

                                    <input
                                        aria-label="검사 종료일"
                                        type="date"
                                        name="endDate"
                                        value={draft.endDate}
                                        onChange={handleChange}
                                    />
                                </div>
                            </fieldset>

                            <label className="qc-field">
                                <span>LOT 번호</span>
                                <input
                                    type="text"
                                    name="batchId"
                                    value={draft.batchId}
                                    onChange={handleChange}
                                    placeholder="LOT 번호 정확히 입력"
                                />
                            </label>

                            <label className="qc-field">
                                <span>검사결과</span>
                                <select
                                    name="overallQcResult"
                                    value={draft.overallQcResult}
                                    onChange={handleChange}
                                >
                                    <option value="">전체</option>
                                    <option value="QC_RESULT_PASS">합격</option>
                                    <option value="QC_RESULT_FAIL">불합격</option>
                                </select>
                            </label>
                        </div>

                        {/* 기본적으로 펼쳐진 상세 검색 */}
                        <details className="qc-advanced" open>
                            <summary>상세 검색</summary>

                            <div className="qc-advanced-fields">
                                <label className="qc-field">
                                    <span>담당자 번호</span>
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
                        </details>

                        <div className="qc-search-footer">
                            <p>입력하지 않은 조건은 검색에서 제외됩니다.</p>

                            <div className="qc-actions">
                                <button
                                    type="button"
                                    className="qc-button"
                                    onClick={handleReset}
                                >
                                    초기화
                                </button>

                                <button
                                    type="submit"
                                    className="qc-button qc-button-primary"
                                >
                                    조회
                                </button>
                            </div>
                        </div>

                        {inputError && (
                            <p className="qc-error" role="alert">
                                {inputError}
                            </p>
                        )}
                    </form>

                    {/* 목록 + 상세정보 */}
                    <div className="qc-content">
                        <section className="qc-card" aria-busy={loading}>
                            <div className="qc-card-heading">
                                <h2>벌크 품질검사 목록</h2>
                                <span role="status">
                                    {loading
                                        ? "조회 중..."
                                        : listError
                                          ? "조회 실패"
                                          : `검색 결과 ${rows.length}건`}
                                </span>
                            </div>

                            {listError ? (
                                <p className="qc-error" role="alert">
                                    {listError}
                                </p>
                            ) : (
                                <div className="qc-table-wrap">
                                    <table className="qc-table">
                                        <thead>
                                            <tr>
                                                <th>검사번호</th>
                                                <th>검사시간</th>
                                                <th>LOT 번호</th>
                                                <th>pH</th>
                                                <th>점도</th>
                                                <th>검사결과</th>
                                                <th>상세</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={7} className="qc-message">
                                                        데이터를 조회하고 있습니다.
                                                    </td>
                                                </tr>
                                            ) : rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="qc-message">
                                                        조건에 맞는 기록이 없습니다.
                                                    </td>
                                                </tr>
                                            ) : (
                                                rows.map(row => (
                                                    <tr
                                                        key={row.qc_id}
                                                        className={
                                                            selectedId === row.qc_id
                                                                ? "is-selected"
                                                                : ""
                                                        }
                                                    >
                                                        <td>{row.qc_id}</td>
                                                        <td>{dateText(row.sample_time)}</td>
                                                        <td>{display(row.batchId)}</td>
                                                        <td>{display(row.ph_measured)}</td>
                                                        <td>{display(row.viscosity_measured)}</td>
                                                        <td>
                                                            <span className={resultClass(row.overall_qc_result)}>
                                                                {resultText(row.overall_qc_result)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="qc-detail-button"
                                                                disabled={selectedId === row.qc_id}
                                                                onClick={() => handleSelect(row.qc_id)}
                                                            >
                                                                {selectedId === row.qc_id
                                                                    ? "선택됨"
                                                                    : "상세보기"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section
                            className="qc-card qc-detail"
                            aria-busy={detailLoading}
                        >
                            <div className="qc-card-heading">
                                <h2>선택한 검사 상세정보</h2>

                                {selectedId !== null && (
                                    <button
                                        type="button"
                                        className="qc-detail-button"
                                        onClick={clearDetail}
                                    >
                                        선택 해제
                                    </button>
                                )}
                            </div>

                            {detailLoading ? (
                                <p className="qc-message" role="status">
                                    상세정보를 조회하고 있습니다.
                                </p>
                            ) : detailError ? (
                                <p className="qc-error" role="alert">
                                    {detailError}
                                    <br />
                                    선택 해제 후 다시 조회해 주세요.
                                </p>
                            ) : detail ? (
                                <>
                                    <dl className="qc-detail-list">
                                        {detailFields.map(([label, value]) => (
                                            <div className="qc-detail-row" key={label}>
                                                <dt>{label}</dt>
                                                <dd>{display(value)}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="qc-final-result">
                                        <strong>종합 검사결과</strong>
                                        <span className={resultClass(detail.overall_qc_result)}>
                                            {resultText(detail.overall_qc_result)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="qc-message">
                                    왼쪽 목록의 상세보기를 눌러 주세요.
                                </p>
                            )}
                        </section>
                    </div>
                </>
            ) : (
                <section className="qc-card">
                    <h2>완제품 품질검사</h2>
                    <p className="qc-message">
                        완제품 품질검사 조회는 아직 연결하지 않았습니다.
                    </p>
                </section>
            )}
        </div>
    );
}