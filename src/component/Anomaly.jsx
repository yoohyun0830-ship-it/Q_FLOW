
import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8080/mask/anomaly-events";

export default function Anomaly() {
    const [anomalies, setAnomalies] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchAnomalies = async (pageNumber = 0) => {
        try {
            setLoading(true);
            setError("");

            const response = await axios.get(API_URL, {
                params: { page: pageNumber },
                withCredentials: true,
            });

            const result = response.data;

            setAnomalies(result.content ?? []);
            setTotalPages(result.totalPages ?? 0);
            setTotalElements(result.totalElements ?? 0);
            setPage(pageNumber);
        } catch (err) {
            console.error("이상내역 조회 오류:", err);
            setError("이상내역을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnomalies(0);
    }, []);

    const formatDate = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleString("ko-KR");
    };

    const showDetail = async (anomalyId) => {
        try {
            const response = await axios.get(
                `${API_URL}/${anomalyId}`,
                { withCredentials: true }
            );

            setSelected(response.data);
        } catch (err) {
            console.error("상세조회 오류:", err);
            alert("상세정보를 불러오지 못했습니다.");
        }
    };

    return (
        <div style={{ padding: "24px" }}>
            <h2>이상관리</h2>
            <p>전체 공정의 이상 발생 및 조치 이력을 조회합니다.</p>

            <div style={{ margin: "20px 0" }}>
                <strong>전체 이상내역: {totalElements}건</strong>
            </div>

            {error && <p style={{ color: "red" }}>{error}</p>}

            {loading ? (
                <p>조회 중...</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            textAlign: "center",
                        }}
                    >
                        <thead>
                            <tr>
                                {[
                                    "이상번호",
                                    "LOT 번호",
                                    "발생 공정",
                                    "이상 유형",
                                    "심각도",
                                    "발생시간",
                                    "처리 상태",
                                    "조치 담당자",
                                    "상세",
                                ].map((title) => (
                                    <th
                                        key={title}
                                        style={{
                                            padding: "12px",
                                            borderBottom: "2px solid #ddd",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {title}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {anomalies.map((item) => (
                                <tr key={item.anomalyId}>
                                    <td>{item.anomalyId}</td>
                                    <td>{item.batchId ?? "-"}</td>
                                    <td>{item.processCode ?? "-"}</td>
                                    <td>{item.anomalyType ?? "-"}</td>
                                    <td>{item.severity ?? "-"}</td>
                                    <td>{formatDate(item.occurredAt)}</td>
                                    <td>{item.actionStatus ?? "-"}</td>
                                    <td>{item.userId ?? "-"}</td>
                                    <td>
                                        <button
                                            onClick={() =>
                                                showDetail(item.anomalyId)
                                            }
                                        >
                                            상세보기
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {anomalies.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ padding: "24px" }}>
                                        조회된 이상내역이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "16px",
                    marginTop: "24px",
                }}
            >
                <button
                    disabled={loading || page === 0}
                    onClick={() => fetchAnomalies(page - 1)}
                >
                    이전
                </button>

                <span>
                    {totalPages === 0 ? 0 : page + 1} / {totalPages}
                </span>

                <button
                    disabled={loading || page + 1 >= totalPages}
                    onClick={() => fetchAnomalies(page + 1)}
                >
                    다음
                </button>
            </div>

            {selected && (
                <div
                    style={{
                        marginTop: "32px",
                        padding: "24px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <h3>이상 발생 상세정보</h3>
                        <button onClick={() => setSelected(null)}>
                            닫기
                        </button>
                    </div>

                    <p>이상번호: {selected.anomalyId}</p>
                    <p>LOT 번호: {selected.batchId ?? "-"}</p>
                    <p>발생 공정: {selected.processCode ?? "-"}</p>
                    <p>이상 유형: {selected.anomalyType ?? "-"}</p>
                    <p>측정 항목: {selected.sensorName ?? "-"}</p>
                    <p>측정값: {selected.measuredValue ?? "-"}</p>
                    <p>심각도: {selected.severity ?? "-"}</p>
                    <p>알람 메시지: {selected.alarmMessage ?? "-"}</p>
                    <p>발생시간: {formatDate(selected.occurredAt)}</p>
                    <p>처리 상태: {selected.actionStatus ?? "-"}</p>
                    <p>조치 담당자 사원번호: {selected.userId ?? "-"}</p>
                    <p>조치시간: {formatDate(selected.actionTime)}</p>

                    <h4>조치내역</h4>
                    <pre
                        style={{
                            whiteSpace: "pre-wrap",
                            background: "#f5f6f8",
                            padding: "16px",
                            borderRadius: "6px",
                        }}
                    >
                        {selected.actionNote || "등록된 조치내역이 없습니다."}
                    </pre>
                </div>
            )}
        </div>
    );
}
