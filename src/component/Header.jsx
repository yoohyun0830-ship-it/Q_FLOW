import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // useNavigate 추가
import { Menu } from "lucide-react";
import "../css/header.css";

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate(); // 페이지 이동을 위한 훅
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

  // ── 로그아웃 핸들러 ──
  const handleLogout = async () => {
    try {
      // 백엔드 로그아웃 API 호출 (세션 무효화)
      await fetch("http://localhost:8080/mask/users/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("로그아웃 통신 오류:", error);
    } finally {
      // 성공 여부와 상관없이 로컬스토리지 비우고 로그인 화면으로 이동
      localStorage.clear(); // 또는 localStorage.removeItem("userName") 등 개별 삭제
      navigate("/");
    }
  };

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

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="header-user">
          {userName} {userRole ? `(${userRole})` : ""}
        </span>
        <span>
          {/* a 태그에 onClick과 cursor 스타일을 주어 버튼처럼 동작하게 수정 */}
          <a 
            className="header-user" 
            onClick={handleLogout} 
            style={{ cursor: "pointer", textDecoration: "underline" }}
          >
            로그아웃
          </a>
        </span>
      </div>
    </header>
  );
}