import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

import {
    loadBulkPage,
    loadFillingPage
} from "../api/manufacturingApi.js";
import Report from "./Report";

import "../css/quality.css";

const BASE_URL = "http://localhost:8080";
const PAGE_SIZE = 20;

// 탭별 API 및 매핑 정보
const TYPES = {
    bulk: {
        title: "벌크 품질검사",
        path: "/mask/bulk-qc",
        id: "qc_id",
        result: "overall_qc_result",
        dtoResultParam: "overallQcResult",
        pass: "합격",
        fail: "불합격",

        columns: [
            ["qc_id", "검사번호"],
            ["batchId", "LOT 번호"],
            ["sample_time", "검사시간"],
            ["userId", "담당자"],
            ["ph_measured", "pH"],
            ["viscosity_measured", "점도"],
            ["specific_gravity", "비중"],
            ["appearance_code", "외관"],
            ["microbubble_code", "미세기포"],
            ["microbial_cfu", "미생물(CFU)"]
        ],

        fields: [
            ["qc_id", "검사번호"],
            ["batchId", "LOT 번호"],
            ["sample_time", "검사시간"],
            ["userId", "담당자 번호"],
            ["ph_measured", "측정 pH"],
            ["ph_criteria", "pH 기준"],
            ["viscosity_measured", "측정 점도"],
            ["viscosity_criteria", "점도 기준"],
            ["specific_gravity", "측정 비중"],
            ["sg_criteria", "비중 기준"],
            ["appearance_code", "외관"],
            ["microbubble_code", "미세기포"],
            ["microbial_cfu", "미생물(CFU)"],
            ["overall_qc_result", "종합 검사결과"],
            ["qc_notes_code", "검사 비고"],
            ["record_source", "데이터 출처"],
            ["createdAt", "등록시간"],
            ["updatedAt", "수정시간"]
        ]
    },

    finished: {
        title: "완제품 품질검사",
        path: "/mask/filling-packagings",
        id: "pouch_id",
        result: "final_disposition",
        dtoResultParam: "finalDisposition",
        pass: "합격",
        fail: "불합격",

        columns: [
            ["pouch_id", "제품번호"],
            ["batchId", "LOT 번호"],
            ["timestamp", "검사시간"],
            ["packaging_line", "포장라인"],
            ["essence_net_weight_g", "에센스 중량(g)"],
            ["upper_seal_temp_c", "상부 실링온도(℃)"],
            ["lower_seal_temp_c", "하부 실링온도(℃)"],
            ["seal_pressure_bar", "실링압력(bar)"],
            ["checkweigher_status", "중량검사"],
            ["metal_detector_status", "금속검사"],
            ["vision_inspection_status", "비전검사"]
        ],

        fields: [
            ["pouch_id", "제품번호"],
            ["batchId", "LOT 번호"],
            ["timestamp", "검사시간"],
            ["userId", "담당자 번호"],
            ["packaging_line", "포장라인"],
            ["sheet_material_code", "시트 자재코드"],
            ["sheet_lot_no", "시트 LOT"],
            ["sheet_dry_weight_g", "시트 중량(g)"],
            ["fill_weight_1st_g", "1차 충진량(g)"],
            ["fill_weight_2nd_g", "2차 충진량(g)"],
            ["essence_net_weight_g", "에센스 순중량(g)"],
            ["pouch_tare_weight_g", "파우치 중량(g)"],
            ["gross_total_weight_g", "완제품 총중량(g)"],
            ["upper_seal_temp_c", "상부 실링온도(℃)"],
            ["lower_seal_temp_c", "하부 실링온도(℃)"],
            ["seal_pressure_bar", "실링압력(bar)"],
            ["n2_residual_o2_pct", "잔존 산소비율(%)"],
            ["checkweigher_status", "중량검사"],
            ["metal_detector_status", "금속검사"],
            ["vision_inspection_status", "비전검사"],
            ["final_disposition", "최종 판정"],
            ["qc_notes_code", "검사 비고"],
            ["record_source", "데이터 출처"],
            ["createdAt", "등록시간"],
            ["updatedAt", "수정시간"]
        ]
    }
};

// 검색 필터 초기 상태
function createEmptyFilters() {
    return {
        startDate: "",
        endDate: "",
        batchId: "",
        result: "",
        userId: "",

        packagingLine: "",
        checkweigherStatus: "",
        metalDetectorStatus: "",
        visionInspectionStatus: ""
    };
}

// 공통 표기 가공
function showValue(key, value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    if (["sample_time", "timestamp", "createdAt", "updatedAt"].includes(key)) {
        return String(value).replace("T", " ").slice(0, 19);
    }

    if (key === "appearance_code" && value === "APP_PASS_PALEBLUE") {
        return "적합";
    }

    if (key === "microbubble_code" && value === "BUBBLE_PASS_ZERO") {
        return "없음";
    }

    return String(value);
}

// 품질 배지 스타일 출력
function renderQualityValue(key, value) {
    if (key === "appearance_code") {
        const text = showValue(key, value).trim();
        let state = "other";

        if (text === "적합") {
            state = "pass";
        } else if (text === "부적합" || text === "불합격") {
            state = "fail";
        }

        return (
            <span className={`quality-badge ${state}`}>
                {text || "-"}
            </span>
        );
    }

    return showValue(key, value);
}

// 에러 메시지 서식
function errorText(error) {
    if (error.response?.status === 400) {
        return "검색조건과 페이지 번호를 확인해 주세요.";
    }

    if (error.response?.status === 404) {
        return "조회 주소 또는 검사 기록을 찾을 수 없습니다.";
    }

    if (error.response) {
        return `조회 실패: HTTP ${error.response.status}`;
    }

    if (error.isAxiosError) {
        return "Spring 실행 상태와 서버 주소, CORS 설정을 확인해 주세요.";
    }

    return error.message || "조회 중 오류가 발생했습니다.";
}

// 결과 상태 배지
function ResultBadge({ value, config }) {
    const text = String(value ?? "").trim();
    const state = text === config.pass
        ? "pass"
        : text === config.fail
            ? "fail"
            : "other";

    return (
        <span className={`quality-badge ${state}`}>
            {text || "-"}
        </span>
    );
}

// PK 상세조회 모달
function QualityDetail({ config, id, onClose }) {
    const dialogRef = useRef(null);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                    `${BASE_URL}${config.path}/${encodeURIComponent(id)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                if (!response.data || response.data[config.id] == null) {
                    throw new Error("상세조회 결과가 없습니다.");
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
    }, [config, id]);

    return (
        <dialog
            ref={dialogRef}
            className="quality-dialog"
            aria-labelledby="quality-detail-title"
            onCancel={event => {
                event.preventDefault();
                onClose();
            }}
        >
            <header className="quality-dialog-header">
                <div>
                    <h2 id="quality-detail-title">{config.title} 상세</h2>
                    <p>{id}</p>
                </div>
                <button type="button" autoFocus aria-label="상세정보 닫기" onClick={onClose}>
                    ×
                </button>
            </header>

            <div className="quality-dialog-body" aria-busy={loading}>
                {loading ? (
                    <p className="quality-message" role="status">
                        상세정보를 조회하고 있습니다.
                    </p>
                ) : error ? (
                    <p className="quality-error" role="alert">
                        {error}
                    </p>
                ) : detail && (
                    <dl className="quality-detail-grid">
                        {config.fields.map(([key, label]) => (
                            <div key={key}>
                                <dt>{label}</dt>
                                <dd>
                                    {key === config.result ? (
                                        <ResultBadge value={detail[key]} config={config} />
                                    ) : (
                                        renderQualityValue(key, detail[key])
                                    )}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>

            <footer className="quality-dialog-footer">
                <button type="button" className="quality-primary" onClick={onClose}>
                    닫기
                </button>
            </footer>
        </dialog>
    );
}

// 불량 항목 판정 수정 및 초기화 모달
function DefectEditModal({ config, id, onClose, onUpdated }) {
    const dialogRef = useRef(null);

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [overallResult, setOverallResult] = useState("");
    const [qcNotesCode, setQcNotesCode] = useState("");

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

            try {
                const response = await axios.get(
                    `${BASE_URL}${config.path}/${encodeURIComponent(id)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                const data = response.data;
                if (!data || data[config.id] == null) {
                    throw new Error("검사 기록을 찾을 수 없습니다.");
                }

                setDetail(data);
                setOverallResult(data[config.result] || config.fail);
                setQcNotesCode(data.qc_notes_code || data.note || "");
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
    }, [config, id]);

    // 💡 [수정] 백엔드 PATCH 통합 API에 맞춰 요청 보냄
    const handleSave = async (e) => {
        e.preventDefault();

        if (overallResult === config.pass && !qcNotesCode.trim()) {
            alert("불합격을 합격으로 수동 변경 시 사유(검사 비고) 입력은 필수입니다.");
            return;
        }

        setSubmitting(true);
        try {
            // 💡 백엔드 Filling_packaging_Result_Dto 요구 스펙 맞춤
            const isBulk = config.path.includes("bulk");
            const endpoint = `${BASE_URL}${config.path}/${encodeURIComponent(id)}/result`;

            const body = isBulk
                ? {
                    overallQcResult: overallResult,
                    qcNotesCode: qcNotesCode.trim(),
                    userId: detail?.userId || 1
                  }
                : {
                    userId: detail?.userId || 1, // DTO 필수값 (담당자 ID)
                    final_disposition: overallResult,
                    note: qcNotesCode.trim(),
                    checkweigher_status: detail?.checkweigher_status || null,
                    metal_detector_status: detail?.metal_detector_status || null,
                    vision_inspection_status: detail?.vision_inspection_status || null
                  };

            // 💡 PUT -> PATCH로 변경
            await axios.patch(endpoint, body);

            alert("성공적으로 변경되었습니다.");
            onUpdated();
            onClose();
        } catch (err) {
            console.error("수정 실패:", err);
            const serverMsg = err.response?.data?.message || err.response?.data || err.message;
            alert(`변경 실패: ${serverMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    // 판정 및 비고 초기화 요청
    const handleClear = async () => {
        if (!window.confirm("판정 결과 및 비고 내용을 초기화(삭제)하시겠습니까?")) {
            return;
        }

        setSubmitting(true);
        try {
            const isBulk = config.path.includes("bulk");
            const endpoint = `${BASE_URL}${config.path}/${encodeURIComponent(id)}/result`;

            const body = isBulk
                ? {
                    overallQcResult: config.fail,
                    qcNotesCode: "",
                    userId: detail?.userId || 1
                  }
                : {
                    userId: detail?.userId || 1,
                    final_disposition: config.fail,
                    note: "",
                    checkweigher_status: detail?.checkweigher_status || null,
                    metal_detector_status: detail?.metal_detector_status || null,
                    vision_inspection_status: detail?.vision_inspection_status || null
                  };

            await axios.patch(endpoint, body);

            alert("초기화가 완료되었습니다.");
            onUpdated();
            onClose();
        } catch (err) {
            console.error("초기화 실패:", err);
            const serverMsg = err.response?.data?.message || err.response?.data || err.message;
            alert(`초기화 실패: ${serverMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="quality-dialog"
            aria-labelledby="defect-modal-title"
            onCancel={e => {
                e.preventDefault();
                onClose();
            }}
        >
            <header className="quality-dialog-header">
                <div>
                    <h2 id="defect-modal-title">불량 항목 재검토 및 판정 수정</h2>
                    <p>{config.title} ID: <strong>{id}</strong></p>
                </div>
                <button type="button" onClick={onClose}>×</button>
            </header>

            <div className="quality-dialog-body" aria-busy={loading || submitting}>
                {loading ? (
                    <p className="quality-message">데이터를 불러오는 중입니다...</p>
                ) : error ? (
                    <p className="quality-error">{error}</p>
                ) : detail && (
                    <div className="defect-modal-content">
                        <form id="defect-edit-form" onSubmit={handleSave} className="quality-card defect-edit-card">
                            <h3>💡 판정 수정</h3>
                            <div className="defect-edit-grid">
                                <label>
                                    최종 검사결과
                                    <select
                                        value={overallResult}
                                        onChange={(e) => setOverallResult(e.target.value)}
                                    >
                                        <option value={config.fail}>{config.fail} (FAIL)</option>
                                        <option value={config.pass}>{config.pass} (PASS)</option>
                                        <option value="SPECIAL_ACCEPT">특채승인 (SPECIAL)</option>
                                    </select>
                                </label>

                                <label>
                                    검사 비고 / 조치 메모
                                    <input
                                        type="text"
                                        value={qcNotesCode}
                                        onChange={(e) => setQcNotesCode(e.target.value)}
                                        placeholder="수동 변경 사유 또는 특이사항 입력"
                                    />
                                </label>
                            </div>
                        </form>

                        <div className="quality-card defect-detail-card">
                            <h3>📋 검사 측정 항목 상세</h3>
                            <dl className="quality-detail-grid">
                                {config.fields
                                    .filter(([key]) => key !== config.result && key !== "qc_notes_code" && key !== "note")
                                    .map(([key, label]) => (
                                        <div key={key}>
                                            <dt>{label}</dt>
                                            <dd>{renderQualityValue(key, detail[key])}</dd>
                                        </div>
                                    ))}
                            </dl>
                        </div>
                    </div>
                )}
            </div>

            <footer className="quality-dialog-footer">
                <button
                    type="button"
                    className="btn-danger"
                    onClick={handleClear}
                    disabled={submitting || loading}
                >
                    판정/비고 초기화
                </button>

                <div className="footer-actions">
                    <button type="button" onClick={onClose} disabled={submitting}>
                        취소
                    </button>
                    <button
                        type="submit"
                        form="defect-edit-form"
                        className="quality-primary"
                        disabled={submitting || loading}
                    >
                        {submitting ? "저장 중..." : "판정 변경 저장"}
                    </button>
                </div>
            </footer>
        </dialog>
    );
}

// 불량 관리 전용 컴포넌트 (/quality/defect)
function DefectManagement() {
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get("type") || "bulk";
    const [type, setType] = useState(initialType);

    const config = TYPES[type];
    const isBulk = type === "bulk";

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [selectedDefectId, setSelectedDefectId] = useState(null);

    // 불합격 조건만 서버 페이징 조회
    useEffect(() => {
        const controller = new AbortController();

        async function fetchDefects() {
            setLoading(true);
            setError("");
            setRows([]);

            try {
                let result;
                const params = { [config.dtoResultParam]: config.fail };

                if (isBulk) {
                    result = await loadBulkPage(params, page, controller.signal);
                } else {
                    result = await loadFillingPage(params, page, controller.signal);
                }

                if (controller.signal.aborted) return;

                if (page > 0 && page >= result.totalPages) {
                    setPage(Math.max(0, result.totalPages - 1));
                    return;
                }

                setRows(result.content);
                setTotal(result.totalElements);
                setTotalPages(result.totalPages);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(errorText(err));
                    setTotal(0);
                    setTotalPages(0);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchDefects();
        return () => controller.abort();
    }, [isBulk, type, config, page, reload]);

    const refresh = () => {
        setSelectedDefectId(null);
        setPage(0);
        setReload(v => v + 1);
    };

    function changePage(nextPage) {
        if (loading || nextPage < 0 || nextPage >= totalPages || nextPage === page) {
            return;
        }
        setSelectedDefectId(null);
        setPage(nextPage);
    }

    const firstNumber = rows.length ? page * PAGE_SIZE + 1 : 0;
    const lastNumber = rows.length ? page * PAGE_SIZE + rows.length : 0;

    return (
        <div className="quality-defect-container">
            <nav className="quality-tabs" aria-label="불량검사 공정">
                <button
                    type="button"
                    className={type === "bulk" ? "active" : ""}
                    onClick={() => { setType("bulk"); setPage(0); }}
                >
                    벌크 불량 검사
                </button>
                <button
                    type="button"
                    className={type === "finished" ? "active" : ""}
                    onClick={() => { setType("finished"); setPage(0); }}
                >
                    충진/포장 불량 검사
                </button>
            </nav>

            <section className="quality-card" aria-busy={loading}>
                <div className="quality-list-heading">
                    <div>
                        <h2>{config.title} 불량 ID 목록</h2>
                        <span>전체 불량 건수: <strong>{total.toLocaleString()}</strong>건</span>
                    </div>
                    <button type="button" disabled={loading} onClick={refresh}>
                        새로고침
                    </button>
                </div>

                {error ? (
                    <p className="quality-error" role="alert">{error}</p>
                ) : (
                    <>
                        <div className="quality-table-wrap">
                            <table className="quality-table">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>불량 식별 ID</th>
                                        <th>LOT 번호</th>
                                        <th>담당자</th>
                                        <th>최종 결과</th>
                                        <th style={{ width: "220px" }}>검사 비고</th>
                                        <th>판정/수정</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading || rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="quality-message">
                                                {loading ? "불량 데이터를 조회하는 중입니다." : "조회된 불량 데이터가 없습니다."}
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, index) => {
                                            const itemId = row[config.id];
                                            const noteText = (row.qc_notes_code || row.note)?.trim();

                                            return (
                                                /* 💡 key에 고유 식별값 명시하여 React unique key 경고 해결 */
                                                <tr key={itemId || index}>
                                                    <td>{page * PAGE_SIZE + index + 1}</td>
                                                    <td><strong>{itemId}</strong></td>
                                                    <td>{row.batchId || "-"}</td>
                                                    <td>{row.userId || "-"}</td>
                                                    <td>
                                                        <ResultBadge value={row[config.result]} config={config} />
                                                    </td>
                                                    <td className="quality-note-cell" title={noteText || "-"}>
                                                        {noteText ? (
                                                            <span className="note-text">{noteText}</span>
                                                        ) : (
                                                            <span className="note-empty">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="quality-primary"
                                                            onClick={() => setSelectedDefectId(itemId)}
                                                        >
                                                            결과 수정
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!loading && (
                            <div className="quality-pagination">
                                <span>
                                    총 {total.toLocaleString()}건 중 {firstNumber}–{lastNumber}건 · 페이지당 20건
                                </span>

                                <div>
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
                                        {totalPages ? page + 1 : 0} / {totalPages}
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
                                        onClick={() => changePage(totalPages - 1)}
                                    >
                                        마지막
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {selectedDefectId !== null && (
                <DefectEditModal
                    key={selectedDefectId}
                    config={config}
                    id={selectedDefectId}
                    onClose={() => setSelectedDefectId(null)}
                    onUpdated={refresh}
                />
            )}
        </div>
    );
}

// 품질 검사 기록 메인 목록 컴포넌트 (/quality)
function QualityRecords({ type }) {
    const navigate = useNavigate();
    const config = TYPES[type];
    const isBulk = type === "bulk";

    const [draft, setDraft] = useState(createEmptyFilters);
    const [condition, setCondition] = useState(createEmptyFilters);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [inputError, setInputError] = useState("");
    const [reload, setReload] = useState(0);

    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // 요약 집계 State
    const [passCount, setPassCount] = useState(null);
    const [failCount, setFailCount] = useState(null);

    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function fetchPage() {
            setLoading(true);
            setError("");
            setRows([]);

            try {
                let result;

                if (isBulk) {
                    result = await loadBulkPage(
                        {
                            startDate: condition.startDate,
                            endDate: condition.endDate,
                            batchId: condition.batchId,
                            overallQcResult: condition.result,
                            userId: condition.userId
                        },
                        page,
                        controller.signal
                    );
                } else {
                    result = await loadFillingPage(
                        {
                            startDate: condition.startDate,
                            endDate: condition.endDate,
                            batchId: condition.batchId,
                            finalDisposition: condition.result,
                            packagingLine: condition.packagingLine,
                            checkweigherStatus: condition.checkweigherStatus,
                            metalDetectorStatus: condition.metalDetectorStatus,
                            visionInspectionStatus: condition.visionInspectionStatus,
                            userId: condition.userId
                        },
                        page,
                        controller.signal
                    );
                }

                if (controller.signal.aborted) return;

                if (page > 0 && page >= result.totalPages) {
                    setPage(Math.max(0, result.totalPages - 1));
                    return;
                }

                setRows(result.content);
                setTotal(result.totalElements);
                setTotalPages(result.totalPages);

                // summary / extra 유연한 수신 파싱
                const summaryData = result.summary || result.extra || {};
                const pass = summaryData.passCount ?? summaryData.pass_count ?? summaryData.pass ?? summaryData["합격"];
                const fail = summaryData.failCount ?? summaryData.fail_count ?? summaryData.fail ?? summaryData["불합격"];

                setPassCount(pass !== undefined && pass !== null ? Number(pass) : null);
                setFailCount(fail !== undefined && fail !== null ? Number(fail) : null);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(errorText(err));
                    setTotal(0);
                    setTotalPages(0);
                    setPassCount(null);
                    setFailCount(null);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchPage();
        return () => controller.abort();
    }, [isBulk, condition, page, reload]);

    function changeDraft(event) {
        const { name, value } = event.target;
        setDraft(previous => ({ ...previous, [name]: value }));
        setInputError("");
    }

    function search(event) {
        event.preventDefault();

        if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
            setInputError("시작일은 종료일보다 늦을 수 없습니다.");
            return;
        }

        if (draft.userId.trim() !== "") {
            const id = Number(draft.userId);
            if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
                setInputError("담당자 번호는 1~2147483647 사이의 정수로 입력해 주세요.");
                return;
            }
        }

        setInputError("");
        setSelectedId(null);
        setPage(0);

        setCondition({
            ...draft,
            batchId: draft.batchId.trim(),
            userId: draft.userId.trim(),
            packagingLine: draft.packagingLine.trim(),
            checkweigherStatus: draft.checkweigherStatus.trim(),
            metalDetectorStatus: draft.metalDetectorStatus.trim(),
            visionInspectionStatus: draft.visionInspectionStatus.trim()
        });
    }

    function reset() {
        setDraft(createEmptyFilters());
        setCondition(createEmptyFilters());
        setInputError("");
        setSelectedId(null);
        setPage(0);
        setPassCount(null);
        setFailCount(null);
    }

    function refresh() {
        setSelectedId(null);
        setPage(0);
        setReload(value => value + 1);
    }

    function changePage(nextPage) {
        if (loading || nextPage < 0 || nextPage >= totalPages || nextPage === page) {
            return;
        }
        setSelectedId(null);
        setPage(nextPage);
    }

    const firstNumber = rows.length ? page * PAGE_SIZE + 1 : 0;
    const lastNumber = rows.length ? page * PAGE_SIZE + rows.length : 0;

    return (
        <>
            {/* 📌 상단 카드뉴스 요약 영역 (불합격 카드 클릭 시 해당 불량관리 이동) */}
            <div className="quality-summary">
                {[
                    [`${config.title} 전체`, total, "total"],
                    ["합격", passCount, "pass"],
                    ["불합격", failCount, "fail"]
                ].map(([label, count, color]) => {
                    const isInvalid = loading || Boolean(error);
                    const displayValue = isInvalid || count === null || count === undefined
                        ? "-"
                        : Number(count).toLocaleString();

                    const isFailCard = color === "fail";

                    return (
                        <div
                            className={`quality-stat ${color} ${isFailCard ? "clickable" : ""}`}
                            key={label}
                            role={isFailCard ? "button" : undefined}
                            tabIndex={isFailCard ? 0 : undefined}
                            onClick={() => {
                                if (isFailCard) {
                                    navigate(`/quality/defect?type=${type}`);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (isFailCard && (e.key === "Enter" || e.key === " ")) {
                                    navigate(`/quality/defect?type=${type}`);
                                }
                            }}
                            title={isFailCard ? `${config.title} 불량 관리 페이지로 이동` : undefined}
                        >
                            <span>{label} {isFailCard && " ➔"}</span>
                            <strong>{displayValue}</strong>
                        </div>
                    );
                })}
            </div>

            <p className="quality-summary-note">전체 공정 기준 요약 수치 (불합격 카드 클릭 시 불량 관리 페이지로 이동)</p>

            <form className="quality-card quality-search" onSubmit={search}>
                <h2>검색조건</h2>

                <div className="quality-search-top">
                    <label>
                        검사 시작일
                        <input
                            type="date"
                            name="startDate"
                            value={draft.startDate}
                            max={draft.endDate || undefined}
                            onChange={changeDraft}
                        />
                    </label>

                    <label>
                        검사 종료일
                        <input
                            type="date"
                            name="endDate"
                            value={draft.endDate}
                            min={draft.startDate || undefined}
                            onChange={changeDraft}
                        />
                    </label>

                    <label>
                        LOT 번호
                        <input
                            name="batchId"
                            value={draft.batchId}
                            onChange={changeDraft}
                            placeholder="LOT 번호 정확히 입력"
                        />
                    </label>
                </div>

                <div className="quality-search-bottom">
                    <label>
                        {isBulk ? "종합 검사결과" : "최종 판정"}
                        <select
                            name="result"
                            value={draft.result}
                            onChange={changeDraft}
                        >
                            <option value="">전체</option>
                            <option value={config.pass}>합격</option>
                            <option value={config.fail}>불합격</option>
                        </select>
                    </label>

                    <label>
                        담당자 번호
                        <input
                            type="number"
                            name="userId"
                            min="1"
                            max="2147483647"
                            step="1"
                            value={draft.userId}
                            onChange={changeDraft}
                            placeholder="미입력 시 전체"
                        />
                    </label>

                    {!isBulk && (
                        <label>
                            포장라인
                            <input
                                name="packagingLine"
                                value={draft.packagingLine}
                                onChange={changeDraft}
                                placeholder="포장라인 정확히 입력"
                            />
                        </label>
                    )}
                </div>

                {!isBulk && (
                    <div className="quality-search-bottom">
                        <label>
                            중량검사 결과
                            <input
                                name="checkweigherStatus"
                                value={draft.checkweigherStatus}
                                onChange={changeDraft}
                                placeholder="DB의 중량검사 결과 입력"
                            />
                        </label>

                        <label>
                            금속검사 결과
                            <input
                                name="metalDetectorStatus"
                                value={draft.metalDetectorStatus}
                                onChange={changeDraft}
                                placeholder="DB의 금속검사 결과 입력"
                            />
                        </label>

                        <label>
                            비전검사 결과
                            <input
                                name="visionInspectionStatus"
                                value={draft.visionInspectionStatus}
                                onChange={changeDraft}
                                placeholder="DB의 비전검사 결과 입력"
                            />
                        </label>
                    </div>
                )}

                <div className="quality-search-bottom">
                    <div className="quality-actions" style={{ gridColumn: "1 / -1" }}>
                        <button type="button" onClick={reset}>초기화</button>
                        <button type="submit" className="quality-primary" disabled={loading}>
                            조회
                        </button>
                    </div>
                </div>

                {inputError && (
                    <p className="quality-error" role="alert">{inputError}</p>
                )}
            </form>

            <section className="quality-card" aria-busy={loading}>
                <div className="quality-list-heading">
                    <div>
                        <h2>{config.title} 목록</h2>
                        <span>{loading || error ? "-" : `검색 결과 ${total.toLocaleString()}건`}</span>
                    </div>

                    <button type="button" disabled={loading} onClick={refresh}>
                        새로고침
                    </button>
                </div>

                {error ? (
                    <p className="quality-error" role="alert">{error}</p>
                ) : (
                    <>
                        <div className="quality-table-wrap">
                            <table className="quality-table">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        {config.columns.map(([key, label]) => (
                                            <th key={key}>{label}</th>
                                        ))}
                                        <th>{isBulk ? "검사결과" : "최종 판정"}</th>
                                        <th>상세</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading || rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={config.columns.length + 3} className="quality-message">
                                                {loading ? "조회 중입니다." : "조건에 맞는 기록이 없습니다."}
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, index) => (
                                            <tr key={row[config.id]}>
                                                <td>{page * PAGE_SIZE + index + 1}</td>
                                                {config.columns.map(([key]) => (
                                                    <td key={key}>
                                                        {renderQualityValue(key, row[key])}
                                                    </td>
                                                ))}
                                                <td>
                                                    <ResultBadge value={row[config.result]} config={config} />
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedId(row[config.id])}
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
                            <div className="quality-pagination">
                                <span>
                                    총 {total.toLocaleString()}건 중 {firstNumber}–{lastNumber}건 · 페이지당 20건
                                </span>

                                <div>
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
                                        {totalPages ? page + 1 : 0} / {totalPages}
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
                                        onClick={() => changePage(totalPages - 1)}
                                    >
                                        마지막
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {selectedId !== null && (
                <QualityDetail
                    key={selectedId}
                    config={config}
                    id={selectedId}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </>
    );
}

// 품질 관리 대표 페이지 Component
export default function Quality() {
    const { pathname } = useLocation();
    const currentPath = pathname.replace(/\/+$/, "");

    const [tab, setTab] = useState("bulk");

    return (
        <div className="quality-page">
            <header className="quality-header">
                <h1>품질 관리</h1>
                <p>검사 기록을 검색하고 상세정보 및 불량 항목을 관리합니다.</p>
            </header>

            {/* 1. 품질 검사 기록 메인 페이지 (/quality) */}
            {currentPath === "/quality" && (
                <>
                    <nav className="quality-tabs" aria-label="품질검사 종류">
                        <button
                            type="button"
                            className={tab === "bulk" ? "active" : ""}
                            onClick={() => setTab("bulk")}
                        >
                            벌크 검사
                        </button>
                        <button
                            type="button"
                            className={tab === "finished" ? "active" : ""}
                            onClick={() => setTab("finished")}
                        >
                            충진 검사
                        </button>
                    </nav>

                    <QualityRecords key={tab} type={tab} />
                </>
            )}

            {/* 2. 불량 관리 페이지 (/quality/defect) */}
            {currentPath === "/quality/defect" && (
                <DefectManagement />
            )}

            {/* 3. 불량 차트 화면 (/quality/report) */}
            {currentPath === "/quality/report" && (
                <Report />
            )}
        </div>
    );
}
