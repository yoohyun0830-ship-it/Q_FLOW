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

// 💡 부모로부터 isCollapsed 상태 수신
export default function Sidebar({ isCollapsed }) {
    const { pathname } = useLocation();
    const isAnomalyMenu = pathname === "/anomaly" || pathname.startsWith("/anomaly/");
    const isQualityMenu = pathname === "/quality" || pathname.startsWith("/quality/");
    const isDataMenu = pathname === "/data" || pathname.startsWith("/data/");

    return (
        <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>

            {/* 로고 */}
            <div className="sidebar-logo">
                <h1>Q-FLOW</h1>
                {!isCollapsed && <p>Sheet Mask Smart Factory</p>}
            </div>

            {/* 메뉴 */}
            <nav className="sidebar-menu">

                <NavLink to="/dashboard" title="대시보드">
                    <House className="menu-icon" />
                    {!isCollapsed && <span>대시보드</span>}
                </NavLink>

                <NavLink to="/process" title="공정 모니터링">
                    <Activity className="menu-icon" />
                    {!isCollapsed && <span>공정 모니터링</span>}
                </NavLink>

                <NavLink to="/production" title="생산 관리">
                    <Settings className="menu-icon" />
                    {!isCollapsed && <span>생산 관리</span>}
                </NavLink>

                {/* 품질 관리 */}
                <div className="alarm-menu-group">
                    <NavLink to="/quality" end title="품질 관리">
                        <ShieldCheck className="menu-icon" />
                        {!isCollapsed && <span>품질 관리</span>}
                        {!isCollapsed && (
                            <span className="alarm-menu-arrow">
                                {isQualityMenu ? "▾" : "▸"}
                            </span>
                        )}
                    </NavLink>

                    {!isCollapsed && isQualityMenu && (
                        <div className="alarm-submenu">
                            <NavLink to="/quality/report">
                                불량 & 분석 리포트
                            </NavLink>
                            <NavLink to="/quality/approval">
                                LOT 출하 승인
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* 이벤트 / 알림 */}
                <div className="alarm-menu-group">
                    <NavLink to="/anomaly" end title="이벤트 / 알람">
                        <Bell className="menu-icon" />
                        {!isCollapsed && <span>이벤트 / 알람</span>}
                        {!isCollapsed && (
                            <span className="alarm-menu-arrow">
                                {isAnomalyMenu ? "▾" : "▸"}
                            </span>
                        )}
                    </NavLink>

                    {!isCollapsed && isAnomalyMenu && (
                        <div className="alarm-submenu">
                            <NavLink to="/anomaly/actions">
                                조치 내역
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* 제조데이터 관리 */}
                <div className="alarm-menu-group">
                    <NavLink to="/data" end title="제조데이터 관리">
                        <Database className="menu-icon" />
                        {!isCollapsed && <span>제조데이터 관리</span>}
                        {!isCollapsed && (
                            <span className="alarm-menu-arrow">
                                {isDataMenu ? "▾" : "▸"}
                            </span>
                        )}
                    </NavLink>

                    {!isCollapsed && isDataMenu && (
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

                <NavLink to="/report" title="분석 및 리포트">
                    <BarChart3 className="menu-icon" />
                    {!isCollapsed && <span>분석 및 리포트</span>}
                </NavLink>

                <NavLink to="/system" title="시스템 관리">
                    <Cog className="menu-icon" />
                    {!isCollapsed && <span>시스템 관리</span>}
                </NavLink>

            </nav>

        </aside>
    );
}