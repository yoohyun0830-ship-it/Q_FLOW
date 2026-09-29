import { useEffect, useState } from "react";

import {
    dataTypes,
    loadRecords,
    loadRecord,
    showValue,
    requestError
} from "../api/manufacturingApi.js";

// 검색창·목록·페이지 이동·상세정보
export default function ManufacturingRecords({
    type,
    batchId = ""
}) {
    const config = dataTypes[type];

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    const [draft, setDraft] = useState({
        from: "",
        to: "",
        keyword: "",
        table: "",
        changeType: ""
    });

    const [filters, setFilters] = useState({
        from: "",
        to: "",
        keyword: "",
        table: "",
        changeType: ""
    });

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);

    // 전체조회
    useEffect(() => {
        const controller = new AbortController();

        async function fetchList() {
            setLoading(true);
            setError("");
            setRows([]);

            try {
                const result = await loadRecords(
                    config,
                    controller.signal,
                    batchId
                );

                if (controller.signal.aborted) return;

                // LOT 페이지에서는 정확히 같은 batchId만 사용
                const list = batchId
                    ? result.filter(row => row.batchId === batchId)
                    : result;

                setRows(list);
                setPage(0);

            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(requestError(err));
                }

            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        if (config.path) {
            fetchList();
        } else {
            setLoading(false);
        }

        return () => controller.abort();

    }, [config, batchId, reload]);

    // PK 개별조회
    useEffect(() => {
        if (selectedId === null) return;

        const controller = new AbortController();

        async function fetchDetail() {
            setDetailLoading(true);
            setDetailError("");
            setDetail(null);

            try {
                const result = await loadRecord(
                    config,
                    selectedId,
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setDetail(result);
                }

            } catch (err) {
                if (!controller.signal.aborted) {
                    setDetailError(requestError(err));
                }

            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        }

        fetchDetail();

        return () => controller.abort();

    }, [config, selectedId]);

    function clearDetail() {
        setSelectedId(null);
        setDetail(null);
        setDetailError("");
        setDetailLoading(false);
    }

    function updateDraft(name, value) {
        setDraft(previous => ({
            ...previous,
            [name]: value
        }));
    }

    function handleSearch(event) {
        event.preventDefault();

        setFilters({
            ...draft,
            keyword: draft.keyword.trim()
        });

        setPage(0);
        clearDetail();
    }

    function handleReset() {
        setDraft({
            from: "",
            to: "",
            keyword: "",
            table: "",
            changeType: ""
        });

        setFilters({
            from: "",
            to: "",
            keyword: "",
            table: "",
            changeType: ""
        });

        setPage(0);
        clearDetail();
    }

    function handleSelect(id) {
        if (selectedId === id) return;

        setDetail(null);
        setDetailError("");
        setDetailLoading(true);
        setSelectedId(id);
    }

    const tableOptions = [
        ...new Set(rows.map(row => row.table_name).filter(Boolean))
    ];

    const typeOptions = [
        ...new Set(rows.map(row => row.change_type).filter(Boolean))
    ];

    const filteredRows = rows.filter(row => {
        const date = String(row[config.date] || "").slice(0, 10);

        if (filters.from && (!date || date < filters.from)) {
            return false;
        }

        if (filters.to && (!date || date > filters.to)) {
            return false;
        }

        if (
            filters.keyword &&
            !String(row[config.searchKey] ?? "")
                .toLowerCase()
                .includes(filters.keyword.toLowerCase())
        ) {
            return false;
        }

        if (type === "changes") {
            if (filters.table && row.table_name !== filters.table) {
                return false;
            }

            if (
                filters.changeType &&
                row.change_type !== filters.changeType
            ) {
                return false;
            }
        }

        return true;
    }).sort((a, b) => {
        const dateOrder = String(b[config.date] || "")
            .localeCompare(String(a[config.date] || ""));

        return dateOrder ||
            String(a[config.id]).localeCompare(String(b[config.id]));
    });

    const totalPages = Math.ceil(filteredRows.length / size);
    const currentPage = Math.min(page, Math.max(0, totalPages - 1));

    const visibleRows = filteredRows.slice(
        currentPage * size,
        (currentPage + 1) * size
    );

    if (!config.path) {
        return (
            <section className="manufacturing-card">
                <h2>{config.title}</h2>
                <p className="manufacturing-message">
                    조회 API 연결 준비 중입니다.
                    해당 Controller가 준비되면 목록과 상세정보를 표시합니다.
                </p>
            </section>
        );
    }

    return (
        <>
            <form
                className="manufacturing-search"
                onSubmit={handleSearch}
            >
                <label>
                    시작일
                    <input
                        type="date"
                        value={draft.from}
                        max={draft.to || undefined}
                        onChange={e => updateDraft("from", e.target.value)}
                    />
                </label>

                <label>
                    종료일
                    <input
                        type="date"
                        value={draft.to}
                        min={draft.from || undefined}
                        onChange={e => updateDraft("to", e.target.value)}
                    />
                </label>

                {type === "changes" && (
                    <>
                        <label>
                            테이블
                            <select
                                value={draft.table}
                                onChange={e =>
                                    updateDraft("table", e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                {tableOptions.map(value => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            변경유형
                            <select
                                value={draft.changeType}
                                onChange={e =>
                                    updateDraft("changeType", e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                {typeOptions.map(value => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </>
                )}

                {!batchId && (
                    <label className="manufacturing-keyword">
                        {config.searchLabel}
                        <input
                            value={draft.keyword}
                            placeholder={`${config.searchLabel} 입력`}
                            onChange={e =>
                                updateDraft("keyword", e.target.value)
                            }
                        />
                    </label>
                )}

                <button
                    className="manufacturing-primary"
                    disabled={loading || Boolean(error)}
                >
                    조회
                </button>

                <button type="button" onClick={handleReset}>
                    초기화
                </button>
            </form>

            <div className="manufacturing-content">
                {/* 목록 */}
                <section className="manufacturing-card">
                    <div className="manufacturing-card-heading">
                        <div>
                            <h2>{config.title} 목록</h2>
                            <span>
                                {loading || error
                                    ? "-"
                                    : `검색 결과 ${filteredRows.length.toLocaleString()}건`}
                            </span>
                        </div>

                        <button
                            disabled={loading}
                            onClick={() => {
                                clearDetail();
                                setReload(value => value + 1);
                            }}
                        >
                            새로고침
                        </button>
                    </div>

                    {loading ? (
                        <p className="manufacturing-message" role="status">
                            목록을 불러오는 중입니다…
                        </p>
                    ) : error ? (
                        <p className="manufacturing-error" role="alert">
                            {error}
                        </p>
                    ) : (
                        <>
                            <div className="manufacturing-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            {config.columns.map(([key, label]) => (
                                                <th key={key}>{label}</th>
                                            ))}
                                            <th>상세</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {visibleRows.map(row => (
                                            <tr
                                                key={row[config.id]}
                                                className={
                                                    selectedId === row[config.id]
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                {config.columns.map(([key]) => (
                                                    <td key={key}>
                                                        {showValue(key, row[key])}
                                                    </td>
                                                ))}

                                                <td>
                                                    <button
                                                        onClick={() =>
                                                            handleSelect(row[config.id])
                                                        }
                                                        aria-label={`${row[config.id]} 상세보기`}
                                                    >
                                                        상세
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {visibleRows.length === 0 && (
                                            <tr>
                                                <td colSpan={config.columns.length + 1}>
                                                    조회 결과가 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="manufacturing-pagination">
                                <div>
                                    <button
                                        disabled={currentPage === 0}
                                        onClick={() => setPage(currentPage - 1)}
                                    >
                                        이전
                                    </button>

                                    <span>
                                        {totalPages ? currentPage + 1 : 0}
                                        {" / "}
                                        {totalPages}
                                    </span>

                                    <button
                                        disabled={currentPage + 1 >= totalPages}
                                        onClick={() => setPage(currentPage + 1)}
                                    >
                                        다음
                                    </button>
                                </div>

                                <select
                                    aria-label="페이지당 표시 개수"
                                    value={size}
                                    onChange={e => {
                                        setSize(Number(e.target.value));
                                        setPage(0);
                                    }}
                                >
                                    <option value={10}>10건씩</option>
                                    <option value={20}>20건씩</option>
                                    <option value={50}>50건씩</option>
                                </select>
                            </div>
                        </>
                    )}
                </section>

                {/* 상세 */}
                <section className="manufacturing-card">
                    <h2>
                        {type === "changes"
                            ? "변경 상세"
                            : "원본 데이터 상세"}
                        {selectedId !== null && ` · ${selectedId}`}
                    </h2>

                    {selectedId === null ? (
                        <p className="manufacturing-message">
                            왼쪽 목록에서 상세 버튼을 눌러 주세요.
                        </p>
                    ) : detailLoading ? (
                        <p className="manufacturing-message" role="status">
                            상세정보를 조회하고 있습니다…
                        </p>
                    ) : detailError ? (
                        <p className="manufacturing-error" role="alert">
                            {detailError}
                        </p>
                    ) : detail ? (
                        <>
                            <dl className="manufacturing-detail">
                                {config.fields.map(([key, label]) => (
                                    <div key={key}>
                                        <dt>{label}</dt>
                                        <dd>{showValue(key, detail[key])}</dd>
                                    </div>
                                ))}
                            </dl>

                            {type === "changes" && (
                                <>
                                    <div className="manufacturing-comparison">
                                        <div className="before">
                                            <span>기존값</span>
                                            <strong>
                                                {showValue("old_value", detail.old_value)}
                                            </strong>
                                        </div>

                                        <span aria-hidden="true">→</span>

                                        <div className="after">
                                            <span>변경값</span>
                                            <strong>
                                                {showValue("new_value", detail.new_value)}
                                            </strong>
                                        </div>
                                    </div>

                                    <h3>변경사유</h3>

                                    <p className="manufacturing-reason">
                                        {showValue("change_reason", detail.change_reason)}
                                    </p>
                                </>
                            )}
                        </>
                    ) : null}
                </section>
            </div>
        </>
    );
}