import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AnomalyPopup from "./AnomalyPopup";

export default function MainLayout() {
    // 사이드바 접힘/펼침 상태 (false: 펼침, true: 접힘)
    const [isCollapsed, setIsCollapsed] = useState(false);

    // 토글 핸들러
    const handleToggleSidebar = () => {
        setIsCollapsed((prev) => !prev);
    };

    return (
        <div className="main-layout" style={{ display: "flex", minHeight: "100vh" }}>
            {/* Sidebar에 접힘 상태 전달 */}
            <Sidebar isCollapsed={isCollapsed} />

            <div className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header에 토글 함수 전달 */}
                <Header onToggleSidebar={handleToggleSidebar} />

                <main className="page-content" style={{ flex: 1 }}>
                    <Outlet />
                </main>
            </div>

            <AnomalyPopup />
        </div>
    );
}