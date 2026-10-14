import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import "../css/header.css";

export default function Header({ onToggleSidebar }) {
  const [userName, setUserName] = useState("관리자");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    // 로그인 시 저장해 둔 사용자 이름과 권한을 가져옴
    const storedName = localStorage.getItem("userName");
    const storedRole = localStorage.getItem("userRole");

    if (storedName) {
      setUserName(storedName);
    }
    if (storedRole) {
      setUserRole(storedRole);
    }
  }, []);

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

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="header-user">
          {userName} {userRole ? `(${userRole})` : ""}
        </span>
      </div>
    </header>
  );
}