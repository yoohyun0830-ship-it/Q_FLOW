import { Link } from "react-router-dom";
import "../css/sidebar.css";

export default function Sidebar(){

    return(
        <aside className="sidebar">

            <div className="sidebar-logo">
                Q-FLOW
            </div>

            <nav>
                <Link to="/dashboard">대시보드</Link>
                <Link to="/production">생산관리</Link>
                <Link to="/process">공정관리</Link>
                <Link to="/quality">품질관리</Link>
                <Link to="/anomaly">이상관리</Link>
                <Link to="/data">제조데이터 관리</Link>
            </nav>

        </aside>
    );
}