import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AnomalyPopup from "./AnomalyPopup";
import CompletedActionPopup from "./CompletedActionPopup";

export default function MainLayout() {
    const navigate = useNavigate();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [loginUser, setLoginUser] = useState(null);
    const [sessionError, setSessionError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        const checkSession = async () => {
            try {
                const response = await fetch(
                    "http://localhost:8080/mask/users/me",
                    {
                        credentials: "include",
                        signal: controller.signal,
                    }
                );

                if (controller.signal.aborted) return;

                // 브라우저 저장 정보가 아닌 서버 세션으로 확인
                if (response.status === 401) {
                    localStorage.removeItem("userId");
                    localStorage.removeItem("userName");
                    localStorage.removeItem("userRole");

                    navigate("/", { replace: true });
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        `로그인 상태 확인 실패: HTTP ${response.status}`
                    );
                }

                const user = await response.json();

                if (controller.signal.aborted) return;

                localStorage.setItem("userName", user.userName);
                localStorage.setItem("userRole", user.role);

                setLoginUser(user);
            } catch (error) {
                if (controller.signal.aborted) return;

                setSessionError(
                    error.message ||
                    "서버에 연결하지 못했습니다."
                );
            }
        };

        checkSession();

        return () => controller.abort();
    }, [navigate]);

    const handleToggleSidebar = () => {
        setIsCollapsed((prev) => !prev);
    };

    if (sessionError) {
        return (
            <div style={{ padding: 24 }}>
                <p>{sessionError}</p>
                <button onClick={() => window.location.reload()}>
                    다시 확인
                </button>
            </div>
        );
    }

    // 세션 확인 전에는 페이지와 팝업을 실행하지 않음
    if (!loginUser) {
        return (
            <div style={{ padding: 24 }}>
                로그인 상태를 확인하고 있습니다.
            </div>
        );
    }

    return (
        <div
            className="main-layout"
            style={{ display: "flex", minHeight: "100vh" }}
        >
            <Sidebar isCollapsed={isCollapsed} />

            <div
                className="main-content"
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Header onToggleSidebar={handleToggleSidebar} />

                <main
                    className="page-content"
                    style={{ flex: 1 }}
                >
                    <Outlet />
                </main>
            </div>

            <AnomalyPopup />

            {loginUser.role === "최고관리자" && (
                <CompletedActionPopup />
            )}
        </div>
    );
}