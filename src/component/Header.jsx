import { Menu } from "lucide-react";
import "../css/header.css";

export default function Header({ onToggleSidebar }) {
  return (
    <header className="main-header">
      <div className="header-left">
        <button
          onClick={onToggleSidebar}
          className="menu-toggle-btn"
          title="메뉴 토글"
        >
          <Menu size={20} />
        </button>
        <span className="header-title">Q-FLOW 제조공정 관리 시스템</span>
      </div>

      <span className="header-user">관리자</span>
    </header>
  );
}