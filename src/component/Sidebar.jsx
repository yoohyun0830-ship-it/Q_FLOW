import { NavLink, useLocation } from "react-router-dom";
import {
    House,
    Activity,
    Settings,
    ShieldCheck,
    Bell,
    Database,
    BarChart3,
    Cog
} from "lucide-react";

import "../css/sidebar.css";

export default function Sidebar() {

    const { pathname } = useLocation();
    const isAnomalyMenu = pathname === "/anomaly" || pathname.startsWith("/anomaly/");
    const isDataMenu =  pathname === "/data" || pathname.startsWith("/data/");

    return (
        <aside className="sidebar">

            {/* 로고 */}
            <div className="sidebar-logo">
                <h1>Q-FLOW</h1>
                <p>Sheet Mask Smart Factory</p>
            </div>

            {/* 메뉴 */}
            <nav className="sidebar-menu">

                <NavLink to="/dashboard">
                    <House className="menu-icon" />
                    <span>대시보드</span>
                </NavLink>

                <NavLink to="/process">
                    <Activity className="menu-icon" />
                    <span>공정 모니터링</span>
                </NavLink>

                <NavLink to="/production">
                    <Settings className="menu-icon" />
                    <span>생산 관리</span>
                </NavLink>

                <NavLink to="/quality">
                    <ShieldCheck className="menu-icon" />
                    <span>품질 관리</span>
                </NavLink>

                {/* 이벤트 / 알림 */}
                <div className="alarm-menu-group">
                    {/* 큰 메뉴 클릭 → 알람 메인 화면 */}
                    <NavLink to="/anomaly" end>
                        <Bell className="menu-icon" />
                        <span>이벤트 / 알람</span>
                        <span className="alarm-menu-arrow">
                            {isAnomalyMenu ? "▾" : "▸"}
                        </span>
                    </NavLink>

                    {/* 알람 메뉴에 들어오면 하위 메뉴 표시 */}
                    {isAnomalyMenu && (
                        <div className="alarm-submenu">
                            <NavLink to="/anomaly/actions">
                                조치 내역
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* 제조데이터 관리 */}
                <div className="alarm-menu-group">
                    <NavLink to="/data" end>
                        <Database className="menu-icon" />
                        <span>제조데이터 관리</span>

                        <span className="alarm-menu-arrow">
                            {isDataMenu ? "▾" : "▸"}
                        </span>
                    </NavLink>

                    {isDataMenu && (
                        <div className="alarm-submenu">
                            <NavLink to="/data/lots">
                                LOT별 이력 조회
                            </NavLink>

                            <NavLink to="/data/changes">
                                데이터 변경이력
                            </NavLink>
                        </div>
                    )}
                </div>

                <NavLink to="/report">
                    <BarChart3 className="menu-icon" />
                    <span>분석 및 리포트</span>
                </NavLink>

                <NavLink to="/system">
                    <Cog className="menu-icon" />
                    <span>시스템 관리</span>
                </NavLink>

            </nav>


        </aside>
    );
}