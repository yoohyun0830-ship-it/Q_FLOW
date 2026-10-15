import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:8080/mask/anomaly-events";

export default function CompletedActionPopup() {
    const [notifications, setNotifications] = useState([]);
    const [loadingId, setLoadingId] = useState(null);

    useEffect(() => {
        let active = true;

        const fetchNotifications = async () => {
            try {
                const response = await axios.get(
                    `${API}/completed-notifications`,
                    { withCredentials: true }
                );

                if (active) {
                    setNotifications(
                        Array.isArray(response.data)
                            ? response.data
                            : []
                    );
                }
            } catch (error) {
                // 공정관리자는 이 API에 접근할 수 없으므로
                // 403 오류는 정상적으로 무시
                if (
                    error.response?.status !== 403 &&
                    error.response?.status !== 401
                ) {
                    console.error("조치완료 알림 조회 실패:", error);
                }
            }
        };

        fetchNotifications();

        // 5초마다 새 조치완료 알림 확인
        const interval = setInterval(fetchNotifications, 5000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    const handleClose = async (notificationId) => {
        try {
            setLoadingId(notificationId);

            await axios.patch(
                `${API}/completed-notifications/${notificationId}/read`,
                {},
                { withCredentials: true }
            );

            setNotifications((prev) =>
                prev.filter(
                    (item) => item.notificationId !== notificationId
                )
            );
        } catch (error) {
            console.error("알림 읽음 처리 실패:", error);
            alert("알림 읽음 처리에 실패했습니다.");
        } finally {
            setLoadingId(null);
        }
    };

    if (notifications.length === 0) {
        return null;
    }

    const current = notifications[0];
    const anomaly = current.anomaly;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "28px",
                    width: "460px",
                    maxWidth: "90vw",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                }}
            >
                <h2 style={{ marginTop: 0 }}>
                    조치완료 알림
                </h2>

                <p>
                    공정관리자가 이상 알림에 대한 조치를 완료했습니다.
                </p>

                <hr />

                <p>
                    <strong>알림번호:</strong>{" "}
                    {anomaly?.anomalyId ?? "-"}
                </p>

                <p>
                    <strong>담당 공정:</strong>{" "}
                    {anomaly?.processCode ?? "-"}
                </p>

                <p>
                    <strong>이상 유형:</strong>{" "}
                    {anomaly?.anomalyType ?? "-"}
                </p>

                <p>
                    <strong>조치내용:</strong>
                </p>

                <div
                    style={{
                        whiteSpace: "pre-wrap",
                        background: "#f5f6f8",
                        padding: "12px",
                        borderRadius: "8px",
                        maxHeight: "200px",
                        overflowY: "auto",
                    }}
                >
                    {anomaly?.actionNote ?? "-"}
                </div>

                <p style={{ color: "#777", fontSize: "13px" }}>
                    남은 알림: {notifications.length}건
                </p>

                <button
                    type="button"
                    disabled={loadingId === current.notificationId}
                    onClick={() =>
                        handleClose(current.notificationId)
                    }
                    style={{
                        width: "100%",
                        padding: "12px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#2563eb",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                    }}
                >
                    {loadingId === current.notificationId
                        ? "처리 중..."
                        : "확인하고 닫기"}
                </button>
            </div>
        </div>
    );
}