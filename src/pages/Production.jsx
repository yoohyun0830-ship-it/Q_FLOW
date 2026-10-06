import { useEffect, useRef, useState } from "react";
import axios from "axios";

import ManufacturingRecords from "../component/ManufacturingRecords";

import "../css/production.css";
import "../css/dataManagement.css";

const API_URL = "http://localhost:8080";
const PAGE_SIZE = 20;

// 검색조건 초기값
function emptyFilters() {
    return {
        startDate: "",
        endDate: "",
        productCode: "",
        status: ""
    };
}

// 기본 표시
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

// 수량 표시
function quantity(value, unit = "") {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? `${number.toLocaleString()}${unit}`
        : display(value);
}

// 생산 상태 색상 표시
function renderProductionStatus(value) {
    const text = String(value ?? "").trim();

    let background = "#f1f5f9";
    let color = "#64748b";

    if (text === "완료") {
        background = "#dcfce7";
        color = "#166534";
    } else if (text === "진행중") {
        background = "#dbeafe";
        color = "#1d4ed8";
    } else if (text === "중단") {
        background = "#fee2e2";
        color = "#b91c1c";
    }

    return (
        <span
            style={{
                display: "inline-block",
                padding: "5px 10px",
                borderRadius: "16px",
                background,
                color,
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.4,
                whiteSpace: "nowrap"
            }}
        >
            {text || "-"}
        </span>
    );
}

// 오류 메시지
function errorText(error) {
    if (error.response) {
        return `조회에 실패했습니다. 응답 코드: ${error.response.status}`;
    }

    if (error.request) {
        return "서버에 연결하지 못했습니다. 스프링 실행 상태를 확인해 주세요.";
    }

    return error.message || "데이터를 불러오지 못했습니다.";
}

// LOT 상세조회 팝업
function LotDetailModal({ batchId, onClose }) {
    const dialogRef = useRef(null);

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    useEffect(() => {
        const dialog = dialogRef.current;
        const previousOverflow = document.body.style.overflow;

        dialog.showModal();
        document.body.style.overflow = "hidden";

        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        async function fetchDetail() {
            setLoading(true);
            setError("");
            setDetail(null);

            try {
                const response = await axios.get(
                    `${API_URL}/mask/batches/${encodeURIComponent(batchId)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                if (!response.data?.batchId) {
                    throw new Error("해당 LOT를 찾을 수 없습니다.");
                }

                setDetail(response.data);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(errorText(err));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchDetail();

        return () => controller.abort();
    }, [batchId, reload]);

    const sections = detail
        ? [
            {
                title: "기본 정보",
                items: [
                    ["LOT 번호", display(detail.batchId)],
                    ["제품 코드", display(detail.productCode)],
                    ["제품명", display(detail.productName)],
                    ["생산 상태", renderProductionStatus(detail.status)]
                ]
            },
            {
                title: "생산 정보",
                items: [
                    ["목표 조제량", quantity(detail.targetBulkKg, " kg")],
                    ["실제 조제량", quantity(detail.actualBulkKg, " kg")],
                    ["목표 생산수량", quantity(detail.targetUnits, " 개")],
                    ["실제 양품수량", quantity(detail.actualUnits, " 개")],
                    ["불량수량", quantity(detail.defectUnits, " 개")],
                    ["사용 탱크", display(detail.tankId)]
                ]
            },
            {
                title: "작업 정보",
                items: [
                    ["작업자 ID", display(detail.userId)],
                    ["데이터 출처", display(detail.recordSource)],
                    ["시작 일시", dateText(detail.startTime)],
                    ["종료 일시", dateText(detail.endTime)]
                ]
            }
        ]
        : [];

    return (
        <dialog
            ref={dialogRef}
            className="lot-modal"
            aria-labelledby="lot-detail-title"
            onCancel={event => {
                event.preventDefault();
                onClose();
            }}
            style={{
                border: "none",
                padding: 0,
                maxWidth: "calc(100vw - 32px)"
            }}
        >
            <div className="lot-modal-header">
                <div>
                    <h2 id="lot-detail-title">LOT 상세정보</h2>
                    <p>{batchId}</p>
                </div>

                <button
                    type="button"
                    className="lot-modal-close"
                    aria-label="상세정보 닫기"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>

            {loading ? (
                <p role="status" style={{ padding: "24px" }}>
                    상세정보를 불러오는 중입니다…
                </p>
            ) : error ? (
                <div style={{ padding: "24px" }}>
                    <p role="alert" style={{ color: "#b91c1c" }}>
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() => setReload(value => value + 1)}
                    >
                        다시 조회
                    </button>
                </div>
            ) : (
                sections.map(section => (
                    <div
                        key={section.title}
                        className="lot-detail-section"
                    >
                        <h3>{section.title}</h3>

                        <div className="lot-detail-grid">
                            {section.items.map(([label, value]) => (
                                <div
                                    key={label}
                                    className="lot-detail-item"
                                >
                                    <span>{label}</span>
                                    <strong>{value}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            <div className="lot-modal-footer">
                <button type="button" onClick={onClose}>
                    닫기
                </button>
            </div>
        </dialog>
    );
}

export default function Production() {
    const [tab, setTab] = useState("lot");

    // 입력 중인 조건 / 실제 조회에 적용한 조건
    const [draft, setDraft] = useState(emptyFilters);
    const [filters, setFilters] = useState(emptyFilters);

    // 목록과 페이지 정보
    const [batches, setBatches] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [inputError, setInputError] = useState("");
    const [reload, setReload] = useState(0);

    // 상세 팝업에서 조회할 LOT
    const [selectedBatchId, setSelectedBatchId] = useState(null);

    const isMaterial = tab === "material";

    // LOT 전체조회 + 조건검색 + 서버 페이징
    useEffect(() => {
        // 원료 칭량은 ManufacturingRecords에서 조회
        if (isMaterial) return;

        const controller = new AbortController();

        async function fetchBatches() {
            setLoading(true);
            setError("");
            setBatches([]);

            try {
                const response = await axios.get(
                    `${API_URL}/mask/batches`,
                    {
                        signal: controller.signal,
                        params: {
                            startDate: filters.startDate || undefined,
                            endDate: filters.endDate || undefined,
                            productCode: filters.productCode || undefined,
                            status: filters.status || undefined,
                            page,
                            size: PAGE_SIZE
                        }
                    }
                );

                if (controller.signal.aborted) return;

                const data = response.data;

                // 기존 Spring Page 응답 형식 사용
                // 페이지 번호는 data.number
                if (
                    !Array.isArray(data?.content) ||
                    !Number.isInteger(data.number) ||
                    data.number !== page ||
                    data.size !== PAGE_SIZE ||
                    !Number.isInteger(data.totalPages) ||
                    data.totalPages < 0 ||
                    !Number.isSafeInteger(data.totalElements) ||
                    data.totalElements < 0
                ) {
                    throw new Error(
                        "생산 LOT의 페이지 응답 형식을 확인해 주세요."
                    );
                }

                // 삭제 등으로 현재 페이지가 사라진 경우
                if (page > 0 && page >= data.totalPages) {
                    setPage(Math.max(0, data.totalPages - 1));
                    return;
                }

                setBatches(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(errorText(err));
                    setTotalPages(0);
                    setTotalElements(0);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchBatches();

        return () => controller.abort();
    }, [isMaterial, filters, page, reload]);

    function updateDraft(name, value) {
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

        setFilters({
            startDate: draft.startDate,
            endDate: draft.endDate,
            productCode: draft.productCode.trim(),
            status: draft.status
        });

        // 검색하면 첫 페이지부터 조회
        setPage(0);
        setInputError("");
        setSelectedBatchId(null);
    }

    function handleReset() {
        setDraft(emptyFilters());
        setFilters(emptyFilters());
        setPage(0);
        setInputError("");
        setSelectedBatchId(null);
    }

    function handleRefresh() {
        setPage(0);
        setSelectedBatchId(null);
        setReload(value => value + 1);
    }

    function changePage(nextPage) {
        if (
            loading ||
            nextPage < 0 ||
            nextPage >= totalPages ||
            nextPage === page
        ) {
            return;
        }

        setSelectedBatchId(null);
        setPage(nextPage);
    }

    function changeTab(nextTab) {
        setTab(nextTab);
        setSelectedBatchId(null);
        setInputError("");
    }

    const firstNumber = batches.length
        ? page * PAGE_SIZE + 1
        : 0;

    const lastNumber = batches.length
        ? page * PAGE_SIZE + batches.length
        : 0;

    return (
        <div className="production-page">
            <div className="production-header">
                <h1>생산 관리</h1>
                <p>생산 LOT, 원료 칭량이력, 생산 실적을 확인합니다.</p>
            </div>

            <div className="production-tabs">
                <button
                    type="button"
                    className={tab === "lot" ? "active" : ""}
                    onClick={() => changeTab("lot")}
                >
                    LOT 목록 · 상세
                </button>

                <button
                    type="button"
                    className={tab === "material" ? "active" : ""}
                    onClick={() => changeTab("material")}
                >
                    원료 칭량이력
                </button>

                <button
                    type="button"
                    className={tab === "result" ? "active" : ""}
                    onClick={() => changeTab("result")}
                >
                    생산 실적
                </button>
            </div>

            {/* LOT 목록과 생산 실적의 검색조건 */}
            {!isMaterial && (
                <>
                    <form
                        className="production-filter"
                        onSubmit={handleSearch}
                        style={{ flexWrap: "wrap", gap: "12px" }}
                    >
                        <label>
                            생산 시작일 — 시작
                            <input
                                type="date"
                                value={draft.startDate}
                                max={draft.endDate || undefined}
                                onChange={event =>
                                    updateDraft(
                                        "startDate",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            생산 시작일 — 종료
                            <input
                                type="date"
                                value={draft.endDate}
                                min={draft.startDate || undefined}
                                onChange={event =>
                                    updateDraft(
                                        "endDate",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            생산 상태
                            <select
                                value={draft.status}
                                onChange={event =>
                                    updateDraft(
                                        "status",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">전체 상태</option>
                                <option value="진행중">진행중</option>
                                <option value="완료">완료</option>
                                <option value="중단">중단</option>
                            </select>
                        </label>

                        <label>
                            제품코드
                            <input
                                type="text"
                                value={draft.productCode}
                                placeholder="제품코드 정확히 입력"
                                onChange={event =>
                                    updateDraft(
                                        "productCode",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <button
                            type="submit"
                            className="production-search-btn"
                            disabled={loading}
                        >
                            조회
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                        >
                            초기화
                        </button>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleRefresh}
                        >
                            새로고침
                        </button>
                    </form>

                    {inputError && (
                        <p role="alert" style={{ color: "#b91c1c" }}>
                            {inputError}
                        </p>
                    )}
                </>
            )}

            <div className="production-content">
                {isMaterial ? (
                    <div className="manufacturing-page">
                        <ManufacturingRecords type="material" />
                    </div>
                ) : (
                    <div aria-busy={loading}>
                        <p>
                            {loading || error
                                ? "검색 결과: -"
                                : `검색 결과 ${totalElements.toLocaleString()}건`}
                        </p>

                        {loading ? (
                            <p role="status">
                                목록을 불러오는 중입니다…
                            </p>
                        ) : error ? (
                            <p role="alert" style={{ color: "#b91c1c" }}>
                                {error}
                            </p>
                        ) : (
                            <>
                                <div className="production-table-wrap">
                                    {tab === "lot" ? (
                                        <table className="production-table">
                                            <thead>
                                                <tr>
                                                    <th>No.</th>
                                                    <th>LOT 번호</th>
                                                    <th>제품명</th>
                                                    <th>계획 수량</th>
                                                    <th>양품 수량</th>
                                                    <th>진행 상태</th>
                                                    <th>시작 일시</th>
                                                    <th>작업자</th>
                                                    <th>상세</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {batches.map((batch, index) => (
                                                    <tr key={batch.batchId}>
                                                        <td>
                                                            {page * PAGE_SIZE + index + 1}
                                                        </td>
                                                        <td>
                                                            {batch.batchId}
                                                        </td>
                                                        <td>
                                                            {display(batch.productName)}
                                                        </td>
                                                        <td>
                                                            {quantity(batch.targetUnits)}
                                                        </td>
                                                        <td>
                                                            {quantity(batch.actualUnits)}
                                                        </td>
                                                        <td>
                                                            {renderProductionStatus(
                                                                batch.status
                                                            )}
                                                        </td>
                                                        <td>
                                                            {dateText(batch.startTime)}
                                                        </td>
                                                        <td>
                                                            {display(batch.userId)}
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="production-detail-btn"
                                                                onClick={() =>
                                                                    setSelectedBatchId(
                                                                        batch.batchId
                                                                    )
                                                                }
                                                            >
                                                                상세
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {batches.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={9}
                                                            className="production-no-data"
                                                        >
                                                            조회된 생산 LOT가 없습니다.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="production-table">
                                            <thead>
                                                <tr>
                                                    <th>No.</th>
                                                    <th>LOT 번호</th>
                                                    <th>목표 조제량</th>
                                                    <th>실제 조제량</th>
                                                    <th>양품 수량</th>
                                                    <th>불량 수량</th>
                                                    <th>생산 시간</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {batches.map((batch, index) => (
                                                    <tr key={batch.batchId}>
                                                        <td>
                                                            {page * PAGE_SIZE + index + 1}
                                                        </td>
                                                        <td>
                                                            {batch.batchId}
                                                        </td>
                                                        <td>
                                                            {quantity(
                                                                batch.targetBulkKg,
                                                                " kg"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {quantity(
                                                                batch.actualBulkKg,
                                                                " kg"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {quantity(
                                                                batch.actualUnits,
                                                                " 개"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {quantity(
                                                                batch.defectUnits,
                                                                " 개"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {dateText(batch.startTime)}
                                                            {" ~ "}
                                                            {dateText(batch.endTime)}
                                                        </td>
                                                    </tr>
                                                ))}

                                                {batches.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={7}
                                                            className="production-no-data"
                                                        >
                                                            조회된 생산 실적이 없습니다.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* 서버 페이지 이동 */}
                                <div className="production-pagination">
                                    <button
                                        type="button"
                                        disabled={page === 0}
                                        onClick={() => changePage(0)}
                                    >
                                        처음
                                    </button>

                                    <button
                                        type="button"
                                        disabled={page === 0}
                                        onClick={() => changePage(page - 1)}
                                    >
                                        이전
                                    </button>

                                    <span>
                                        {totalPages ? page + 1 : 0}
                                        {" / "}
                                        {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={page + 1 >= totalPages}
                                        onClick={() => changePage(page + 1)}
                                    >
                                        다음
                                    </button>

                                    <button
                                        type="button"
                                        disabled={page + 1 >= totalPages}
                                        onClick={() =>
                                            changePage(totalPages - 1)
                                        }
                                    >
                                        마지막
                                    </button>
                                </div>

                                <p>
                                    {firstNumber}–{lastNumber}건
                                    {" · "}페이지당 20건
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {selectedBatchId !== null && (
                <LotDetailModal
                    key={selectedBatchId}
                    batchId={selectedBatchId}
                    onClose={() => setSelectedBatchId(null)}
                />
            )}
        </div>
    );
}