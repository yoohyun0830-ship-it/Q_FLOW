import { useEffect, useState } from "react";
import DetailModal from "./DetailModal";
import "../css/detailModal.css";

import {
    dataTypes,
    loadMaterialPage,
    loadProcessPage,
    loadSensorPage,
    loadBulkPage,
    loadFillingPage,
    loadChangeLogPage,
    loadAnomalyPage,
    loadRecord,
    showValue,
    requestError
} from "../api/manufacturingApi.js";

// 검색조건 초기값
function createEmptyFilters() {
    return {
        startDate: "",
        endDate: "",
        batchId: "",

        // 원료 칭량
        materialCode: "",
        materialName: "",
        rawMaterialLot: "",

        // 공통
        userId: "",
        processCode: "",
        status: "",

        // 센서 측정
        startAt: "",
        endAt: "",
        executionId: "",

        // 벌크 검사
        overallQcResult: "",

        // 충진·포장
        packagingLine: "",
        finalDisposition: "",
        checkweigherStatus: "",
        metalDetectorStatus: "",
        visionInspectionStatus: "",

        // 데이터 변경이력
        tableName: "",
        recordId: "",
        recordIdKeyword: "",
        columnName: "",
        changeType: "",

        // 이상 발생
        severity: "",
        actionStatus: "",
        anomalyType: ""
    };
}

// 데이터 종류나 LOT가 바뀌면 상태 초기화
export default function ManufacturingRecords({
    type,
    batchId = ""
}) {
    return (
        <RecordsContent
            key={`${type}:${batchId}`}
            type={type}
            batchId={batchId}
        />
    );
}

function RecordsContent({ type, batchId }) {
    const config = dataTypes[type];

    const isMaterial = type === "material";
    const isProcess = type === "process";
    const isSensor = type === "sensor";
    const isBulk = type === "bulk";
    const isFilling = type === "filling";
    const isChanges = type === "changes";
    const isAnomaly = type === "anomaly";

    const hasUserFilter =
        isMaterial ||
        isSensor ||
        isBulk ||
        isFilling ||
        isChanges ||
        isAnomaly;

    const fixedBatchId = batchId.trim();

    // 목록
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [inputError, setInputError] = useState("");
    const [reload, setReload] = useState(0);

    // 입력 중인 조건 / 실제 조회에 적용한 조건
    const [draft, setDraft] = useState(createEmptyFilters);
    const [filters, setFilters] = useState(createEmptyFilters);

    // 서버 페이징
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // 상세조회 및 팝업
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // 전체조회 + 조건검색 + 서버 페이징
    useEffect(() => {
        if (!config?.path) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        async function fetchPage() {
            setLoading(true);
            setError("");
            setRows([]);

            try {
                // LOT별 이력에서는 선택한 LOT 번호를 사용
                const targetBatchId = fixedBatchId || filters.batchId;

                let result;

                if (isMaterial) {
                    result = await loadMaterialPage(
                        {
                            startDate: filters.startDate,
                            endDate: filters.endDate,
                            batchId: targetBatchId,
                            materialCode: filters.materialCode,
                            materialName: filters.materialName,
                            rawMaterialLot: filters.rawMaterialLot,
                            status: filters.status,
                            userId: filters.userId
                        },
                        page,
                        controller.signal
                    );
                } else if (isProcess) {
                    result = await loadProcessPage(
                        {
                            startDate: filters.startDate,
                            endDate: filters.endDate,
                            batchId: targetBatchId,
                            processCode: filters.processCode,
                            status: filters.status
                        },
                        page,
                        controller.signal
                    );
                } else if (isSensor) {
                    result = await loadSensorPage(
                        {
                            startAt: filters.startAt,
                            endAt: filters.endAt,
                            batchId: targetBatchId,
                            executionId: filters.executionId,
                            processCode: filters.processCode,
                            userId: filters.userId
                        },
                        page,
                        controller.signal
                    );
                } else if (isBulk) {
                    result = await loadBulkPage(
                        {
                            startDate: filters.startDate,
                            endDate: filters.endDate,
                            batchId: targetBatchId,
                            overallQcResult: filters.overallQcResult,
                            userId: filters.userId
                        },
                        page,
                        controller.signal
                    );
                } else if (isFilling) {
                    result = await loadFillingPage(
                        {
                            startDate: filters.startDate,
                            endDate: filters.endDate,
                            batchId: targetBatchId,
                            packagingLine: filters.packagingLine,
                            finalDisposition: filters.finalDisposition,
                            checkweigherStatus: filters.checkweigherStatus,
                            metalDetectorStatus: filters.metalDetectorStatus,
                            visionInspectionStatus: filters.visionInspectionStatus,
                            userId: filters.userId
                        },
                        page,
                        controller.signal
                    );
                } else if (isChanges) {
                    result = await loadChangeLogPage(
                        {
                            startDate: filters.startDate,
                            endDate: filters.endDate,
                            tableName: filters.tableName,
                            recordId: filters.recordId,
                            recordIdKeyword: filters.recordIdKeyword,
                            columnName: filters.columnName,
                            changeType: filters.changeType,
                            userId: filters.userId
                        },
                        page,
                        controller.signal
                    );
                } else if (isAnomaly) {
                    result = await loadAnomalyPage(
                        {
                            startDate: filters.startDate,
                            endDate: filters.endDate,
                            batchId: targetBatchId,
                            severity: filters.severity,
                            actionStatus: filters.actionStatus,
                            processCode: filters.processCode,
                            anomalyType: filters.anomalyType,
                            userId: filters.userId
                        },
                        page,
                        controller.signal
                    );
                } else {
                    throw new Error("지원하지 않는 데이터 종류입니다.");
                }

                if (controller.signal.aborted) return;

                // 데이터 삭제 등으로 현재 페이지가 사라진 경우
                if (page > 0 && page >= result.totalPages) {
                    setPage(Math.max(0, result.totalPages - 1));
                    return;
                }

                setRows(result.content);
                setTotalCount(result.totalElements);
                setTotalPages(result.totalPages);
                setPageSize(result.size);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(requestError(err));
                    setTotalCount(0);
                    setTotalPages(0);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchPage();

        return () => controller.abort();
    }, [
        config,
        isMaterial,
        isProcess,
        isSensor,
        isBulk,
        isFilling,
        isChanges,
        isAnomaly,
        fixedBatchId,
        filters,
        page,
        reload
    ]);

    // 상세 버튼을 누르면 PK로 개별조회
    useEffect(() => {
        if (selectedId === null || !config?.path) return;

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

        // 팝업을 닫거나 선택이 바뀌면 기존 요청 취소
        return () => controller.abort();
    }, [config, selectedId]);

    // 팝업 닫기 및 상세 상태 초기화
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

        setInputError("");
    }

    function handleSearch(event) {
        event.preventDefault();

        if (isSensor) {
            if (
                draft.startAt &&
                draft.endAt &&
                new Date(draft.startAt).getTime() >
                    new Date(draft.endAt).getTime()
            ) {
                setInputError("시작시간은 종료시간보다 늦을 수 없습니다.");
                return;
            }

            const executionId = draft.executionId.trim();

            if (
                executionId !== "" &&
                (
                    !/^\d+$/.test(executionId) ||
                    BigInt(executionId) < 1n ||
                    BigInt(executionId) > 9223372036854775807n
                )
            ) {
                setInputError(
                    "공정 실행번호는 유효한 양의 정수로 입력해 주세요."
                );
                return;
            }
        } else if (
            draft.startDate &&
            draft.endDate &&
            draft.startDate > draft.endDate
        ) {
            setInputError("시작일은 종료일보다 늦을 수 없습니다.");
            return;
        }

        if (hasUserFilter && draft.userId.trim() !== "") {
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

        setFilters({
            ...draft,
            batchId: draft.batchId.trim(),
            materialCode: draft.materialCode.trim(),
            materialName: draft.materialName.trim(),
            rawMaterialLot: draft.rawMaterialLot.trim(),
            processCode: draft.processCode.trim(),
            status: draft.status.trim(),
            executionId: draft.executionId.trim(),
            overallQcResult: draft.overallQcResult.trim(),
            packagingLine: draft.packagingLine.trim(),
            finalDisposition: draft.finalDisposition.trim(),
            checkweigherStatus: draft.checkweigherStatus.trim(),
            metalDetectorStatus: draft.metalDetectorStatus.trim(),
            visionInspectionStatus: draft.visionInspectionStatus.trim(),
            tableName: draft.tableName.trim(),
            recordId: draft.recordId.trim(),
            recordIdKeyword: draft.recordIdKeyword.trim(),
            columnName: draft.columnName.trim(),
            changeType: draft.changeType.trim().toUpperCase(),
            severity: draft.severity.trim(),
            actionStatus: draft.actionStatus.trim(),
            anomalyType: draft.anomalyType.trim(),
            userId: draft.userId.trim()
        });

        // 새 검색은 첫 페이지부터
        setPage(0);
        setInputError("");
        clearDetail();
    }

    function handleReset() {
        setDraft(createEmptyFilters());
        setFilters(createEmptyFilters());
        setPage(0);
        setInputError("");
        clearDetail();
    }

    function handleRefresh() {
        setPage(0);
        clearDetail();
        setReload(value => value + 1);
    }

    // 상세 팝업 열기
    function handleSelect(id) {
        if (id === null || id === undefined || selectedId === id) return;

        setDetail(null);
        setDetailError("");
        setDetailLoading(true);
        setSelectedId(id);
    }

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

    // 공통 문자열 검색 입력창
    function textField(name, label, placeholder) {
        return (
            <label>
                {label}
                <input
                    type="text"
                    value={draft[name]}
                    placeholder={placeholder}
                    onChange={e => updateDraft(name, e.target.value)}
                />
            </label>
        );
    }

    const firstNumber = rows.length ? page * pageSize + 1 : 0;
    const lastNumber = rows.length ? page * pageSize + rows.length : 0;

    if (!config?.path) {
        return (
            <section className="manufacturing-card">
                <h2>{config?.title || "데이터 조회"}</h2>
                <p className="manufacturing-message">
                    조회 API 연결 준비 중입니다.
                </p>
            </section>
        );
    }

    const searchClassName =
        isMaterial || isSensor || isFilling || isChanges || isAnomaly
            ? "manufacturing-search manufacturing-material-search"
            : "manufacturing-search";

    const dateLabels = {
        material: ["칭량 시작일", "칭량 종료일"],
        process: ["공정 시작기간 — 시작일", "공정 시작기간 — 종료일"],
        bulk: ["검사 시작일", "검사 종료일"],
        filling: ["포장·검사 시작일", "포장·검사 종료일"],
        changes: ["변경 시작일", "변경 종료일"],
        anomaly: ["발생 시작일", "발생 종료일"]
    };

    const [startDateLabel, endDateLabel] =
        dateLabels[type] || ["시작일", "종료일"];

    return (
        <>
            {/* 검색조건 */}
            <form className={searchClassName} onSubmit={handleSearch}>
                {isSensor ? (
                    <>
                        <label>
                            측정 시작 일시
                            <input
                                type="datetime-local"
                                step="1"
                                value={draft.startAt}
                                max={draft.endAt || undefined}
                                onChange={e =>
                                    updateDraft("startAt", e.target.value)
                                }
                            />
                        </label>

                        <label>
                            측정 종료 일시
                            <input
                                type="datetime-local"
                                step="1"
                                value={draft.endAt}
                                min={draft.startAt || undefined}
                                onChange={e =>
                                    updateDraft("endAt", e.target.value)
                                }
                            />
                        </label>
                    </>
                ) : (
                    <>
                        <label>
                            {startDateLabel}
                            <input
                                type="date"
                                value={draft.startDate}
                                max={draft.endDate || undefined}
                                onChange={e =>
                                    updateDraft("startDate", e.target.value)
                                }
                            />
                        </label>

                        <label>
                            {endDateLabel}
                            <input
                                type="date"
                                value={draft.endDate}
                                min={draft.startDate || undefined}
                                onChange={e =>
                                    updateDraft("endDate", e.target.value)
                                }
                            />
                        </label>
                    </>
                )}

                {!isChanges && (
                    <label>
                        LOT 번호
                        <input
                            type="text"
                            value={fixedBatchId || draft.batchId}
                            readOnly={Boolean(fixedBatchId)}
                            placeholder="LOT 번호 정확히 입력"
                            onChange={e =>
                                updateDraft("batchId", e.target.value)
                            }
                        />
                    </label>
                )}

                {isMaterial && (
                    <>
                        {textField(
                            "materialCode",
                            "원료코드",
                            "원료코드 정확히 입력"
                        )}

                        {textField(
                            "materialName",
                            "원료명",
                            "원료명 일부 입력"
                        )}

                        {textField(
                            "rawMaterialLot",
                            "원료 LOT 번호",
                            "원료 LOT 번호 정확히 입력"
                        )}
                    </>
                )}

                {isSensor && (
                    <label>
                        공정 실행번호
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={draft.executionId}
                            placeholder="공정 실행번호 정확히 입력"
                            onChange={e =>
                                updateDraft("executionId", e.target.value)
                            }
                        />
                    </label>
                )}

                {(isProcess || isSensor || isAnomaly) &&
                    textField(
                        "processCode",
                        "공정코드",
                        "예: OP_S02_HOMO_DISPERSE"
                    )}

                {(isMaterial || isProcess) &&
                    textField(
                        "status",
                        isMaterial ? "칭량상태" : "공정 진행상태",
                        "저장된 상태 값 정확히 입력"
                    )}

                {isBulk &&
                    textField(
                        "overallQcResult",
                        "종합 검사결과",
                        "저장된 검사결과 값 정확히 입력"
                    )}

                {isFilling && (
                    <>
                        {textField(
                            "packagingLine",
                            "포장라인",
                            "포장라인 정확히 입력"
                        )}

                        {textField(
                            "finalDisposition",
                            "최종 판정",
                            "저장된 최종 판정 값 입력"
                        )}

                        {textField(
                            "checkweigherStatus",
                            "중량검사 결과",
                            "저장된 중량검사 결과 입력"
                        )}

                        {textField(
                            "metalDetectorStatus",
                            "금속검사 결과",
                            "저장된 금속검사 결과 입력"
                        )}

                        {textField(
                            "visionInspectionStatus",
                            "비전검사 결과",
                            "저장된 비전검사 결과 입력"
                        )}
                    </>
                )}

                {isChanges && (
                    <>
                        {textField(
                            "tableName",
                            "변경 대상 테이블명",
                            "예: bulk_qc"
                        )}

                        {textField(
                            "recordId",
                            "데이터번호 — 정확히 일치",
                            "변경 대상의 PK 전체 입력"
                        )}

                        {textField(
                            "recordIdKeyword",
                            "데이터번호 — 부분 검색",
                            "데이터번호 일부 입력"
                        )}

                        {textField(
                            "columnName",
                            "변경 컬럼명",
                            "예: overall_qc_result"
                        )}

                        <label>
                            변경 유형
                            <select
                                value={draft.changeType}
                                onChange={e =>
                                    updateDraft("changeType", e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="INSERT">등록</option>
                                <option value="UPDATE">수정</option>
                                <option value="DELETE">삭제</option>
                            </select>
                        </label>
                    </>
                )}

                {isAnomaly && (
                    <>
                        <label>
                            심각도
                            <select
                                value={draft.severity}
                                onChange={e =>
                                    updateDraft("severity", e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="ALM_SEV_NORMAL">정상</option>
                                <option value="ALM_SEV_WARN">주의</option>
                                <option value="ALM_SEV_CRIT">심각</option>
                            </select>
                        </label>

                        <label>
                            조치상태
                            <select
                                value={draft.actionStatus}
                                onChange={e =>
                                    updateDraft("actionStatus", e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="ACKNOWLEDGED">확인됨</option>
                                <option value="UNACKNOWLEDGED">미확인</option>
                            </select>
                        </label>

                        {textField(
                            "anomalyType",
                            "이상 유형",
                            "저장된 이상 유형 값 정확히 입력"
                        )}
                    </>
                )}

                {hasUserFilter && (
                    <label>
                        {isChanges
                            ? "변경 작업자 번호"
                            : isAnomaly
                                ? "조치 담당자 번호"
                                : "담당자 번호"}
                        <input
                            type="number"
                            min="1"
                            max="2147483647"
                            step="1"
                            value={draft.userId}
                            placeholder="미입력 시 전체"
                            onChange={e =>
                                updateDraft("userId", e.target.value)
                            }
                        />
                    </label>
                )}

                <button
                    type="submit"
                    className="manufacturing-primary"
                    disabled={loading}
                >
                    조회
                </button>

                <button type="button" onClick={handleReset}>
                    초기화
                </button>
            </form>

            {inputError && (
                <p className="manufacturing-error" role="alert">
                    {inputError}
                </p>
            )}

            {/* 오른쪽 상세 카드 없이 목록을 전체 너비로 표시 */}
            <div className="manufacturing-content qf-list-only">
                <section className="manufacturing-card" aria-busy={loading}>
                    <div className="manufacturing-card-heading">
                        <div>
                            <h2>{config.title} 목록</h2>
                            <span>
                                {loading || error
                                    ? "-"
                                    : `검색 결과 ${totalCount.toLocaleString()}건`}
                            </span>
                        </div>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleRefresh}
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
                                                <th key={key} scope="col">
                                                    {label}
                                                </th>
                                            ))}
                                            <th scope="col">상세</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rows.map(row => (
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
                                                        type="button"
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

                                        {rows.length === 0 && (
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
                                        type="button"
                                        disabled={page === 0}
                                        onClick={() => handlePage(0)}
                                    >
                                        처음
                                    </button>

                                    <button
                                        type="button"
                                        disabled={page === 0}
                                        onClick={() => handlePage(page - 1)}
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
                                        onClick={() => handlePage(page + 1)}
                                    >
                                        다음
                                    </button>

                                    <button
                                        type="button"
                                        disabled={page + 1 >= totalPages}
                                        onClick={() => handlePage(totalPages - 1)}
                                    >
                                        마지막
                                    </button>
                                </div>

                                <span>
                                    {firstNumber}–{lastNumber}건
                                    {" · "}페이지당 20건
                                </span>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {/* PK 상세조회 팝업 */}
            {selectedId !== null && (
                <DetailModal
                    title={
                        isChanges
                            ? "변경 상세"
                            : isAnomaly
                                ? "이상 발생 상세"
                                : `${config.title} 상세`
                    }
                    onClose={clearDetail}
                >
                    <div aria-busy={detailLoading}>
                        {detailLoading ? (
                            <p
                                className="manufacturing-message"
                                role="status"
                            >
                                상세정보를 조회하고 있습니다…
                            </p>
                        ) : detailError ? (
                            <p
                                className="manufacturing-error"
                                role="alert"
                            >
                                {detailError}
                                <br />
                                창을 닫고 상세 버튼을 다시 눌러 주세요.
                            </p>
                        ) : detail ? (
                            <>
                                <dl className="manufacturing-detail">
                                    {config.fields.map(([key, label]) => (
                                        <div key={key}>
                                            <dt>{label}</dt>
                                            <dd>
                                                {showValue(key, detail[key])}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>

                                {/* 데이터 변경이력의 추가 상세정보 */}
                                {isChanges && (
                                    <>
                                        <div className="manufacturing-comparison">
                                            <div className="before">
                                                <span>기존값</span>
                                                <strong>
                                                    {showValue(
                                                        "old_value",
                                                        detail.old_value
                                                    )}
                                                </strong>
                                            </div>

                                            <span aria-hidden="true">→</span>

                                            <div className="after">
                                                <span>변경값</span>
                                                <strong>
                                                    {showValue(
                                                        "new_value",
                                                        detail.new_value
                                                    )}
                                                </strong>
                                            </div>
                                        </div>

                                        <h3>변경사유</h3>

                                        <p className="manufacturing-reason">
                                            {showValue(
                                                "change_reason",
                                                detail.change_reason
                                            )}
                                        </p>
                                    </>
                                )}
                            </>
                        ) : (
                            <p className="manufacturing-message">
                                상세정보가 없습니다.
                            </p>
                        )}
                    </div>
                </DetailModal>
            )}
        </>
    );
}