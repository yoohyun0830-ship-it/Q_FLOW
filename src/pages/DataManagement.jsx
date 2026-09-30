import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import ManufacturingRecords from "../component/ManufacturingRecords";

import {
    dataTypes,
    loadLot,
    showValue,
    requestError
} from "../api/manufacturingApi.js";

import "../css/dataManagement.css";

// --------------------------------------------------
// 1. 큰 메뉴: 공정별 원본 데이터
// --------------------------------------------------
function RawDataPage() {
    const [type, setType] = useState("material");

    return (
        <>
            <h1>공정별 원본 데이터</h1>

            <p className="manufacturing-subtitle">
                데이터 종류를 선택하고 저장된 원본 기록을 확인합니다.
            </p>

            <div className="manufacturing-type">
                <label>
                    데이터 종류

                    <select
                        value={type}
                        onChange={event => setType(event.target.value)}
                    >
                        {[
                            "sensor",
                            "material",
                            "process",
                            "bulk",
                            "filling"
                        ].map(key => (
                            <option key={key} value={key}>
                                {dataTypes[key].title}
                                {!dataTypes[key].path && " · 연결 준비"}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <ManufacturingRecords
                key={type}
                type={type}
            />
        </>
    );
}

// --------------------------------------------------
// 2. 하위 메뉴: LOT별 이력 조회
// --------------------------------------------------
function LotHistoryPage() {
    const [input, setInput] = useState("");
    const [request, setRequest] = useState(null);

    const [lot, setLot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [type, setType] = useState("bulk");

    useEffect(() => {
        if (!request) return;

        const controller = new AbortController();

        async function fetchLot() {
            setLoading(true);
            setError("");
            setLot(null);

            try {
                const result = await loadLot(
                    request.batchId,
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setLot(result);
                }

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

        fetchLot();

        return () => controller.abort();

    }, [request]);

    function handleSearch(event) {
        event.preventDefault();

        const batchId = input.trim();

        if (!batchId) {
            setError("LOT 번호를 입력해 주세요.");
            return;
        }

        setLot(null);
        setError("");
        setLoading(true);

        // 같은 LOT도 다시 조회할 수 있도록 객체로 저장
        setRequest(previous => ({
            batchId,
            version: (previous?.version || 0) + 1
        }));
    }

    return (
        <>
            <h1>LOT별 이력 조회</h1>

            <p className="manufacturing-subtitle">
                하나의 LOT에 연결된 제조·검사 기록을 확인합니다.
            </p>

            <form
                className="manufacturing-search"
                onSubmit={handleSearch}
            >
                <label className="manufacturing-keyword">
                    LOT 번호

                    <input
                        value={input}
                        onChange={event => setInput(event.target.value)}
                        placeholder="정확한 LOT 번호를 입력하세요"
                        required
                    />
                </label>

                <button
                    type="submit"
                    className="manufacturing-primary"
                    disabled={loading}
                >
                    조회
                </button>
            </form>

            {loading && (
                <p className="manufacturing-message" role="status">
                    LOT 정보를 조회하고 있습니다…
                </p>
            )}

            {error && (
                <p className="manufacturing-error" role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && lot && (
                <>
                    <section className="manufacturing-card manufacturing-lot">
                        <h2>{lot.batchId}</h2>

                        <div className="manufacturing-lot-info">
                            <div>
                                <span>제품명</span>
                                <strong>
                                    {showValue("productName", lot.productName)}
                                </strong>
                            </div>

                            <div>
                                <span>시작 일시</span>
                                <strong>
                                    {showValue("startTime", lot.startTime)}
                                </strong>
                            </div>

                            <div>
                                <span>종료 일시</span>
                                <strong>
                                    {showValue("endTime", lot.endTime)}
                                </strong>
                            </div>

                            <div>
                                <span>상태</span>
                                <strong>
                                    {showValue("status", lot.status)}
                                </strong>
                            </div>
                        </div>
                    </section>

                    <div
                        className="manufacturing-tabs"
                        aria-label="LOT 이력 종류"
                    >
                        {[
                            "material",
                            "process",
                            "bulk",
                            "filling",
                            "anomaly"
                        ].map(key => (
                            <button
                                type="button"
                                key={key}
                                aria-pressed={type === key}
                                onClick={() => setType(key)}
                            >
                                {dataTypes[key].title}
                            </button>
                        ))}
                    </div>

                    <ManufacturingRecords
                        key={`${lot.batchId}-${type}-${request.version}`}
                        type={type}
                        batchId={lot.batchId}
                    />
                </>
            )}

            {!request && !error && (
                <section className="manufacturing-card">
                    <p className="manufacturing-message">
                        조회할 LOT 번호를 입력해 주세요.
                    </p>
                </section>
            )}
        </>
    );
}

// --------------------------------------------------
// 3. 현재 주소에 따라 화면 선택
// --------------------------------------------------
export default function DataManagement() {
    const { pathname } = useLocation();
    const path = pathname.replace(/\/+$/, "");

    return (
        <div className="manufacturing-page">
            {path === "/data/lots" ? (
                <LotHistoryPage />
            ) : path === "/data/changes" ? (
                <>
                    <h1>데이터 변경이력</h1>

                    <p className="manufacturing-subtitle">
                        누가 어떤 값을 변경했는지 기록을 확인합니다.
                    </p>

                    <ManufacturingRecords
                        key="changes"
                        type="changes"
                    />
                </>
            ) : (
                <RawDataPage />
            )}
        </div>
    );
}