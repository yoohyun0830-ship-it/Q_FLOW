import { NavLink } from "react-router-dom";
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

                <NavLink to="/anomaly">
                    <Bell className="menu-icon" />
                    <span>이벤트 / 알람</span>
                </NavLink>

                <NavLink to="/data">
                    <Database className="menu-icon" />
                    <span>제조데이터 관리</span>
                </NavLink>

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