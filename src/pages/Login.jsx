import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/login.css";
import logo from "./img/qflow.png";

export default function Login() {
    const navigate = useNavigate();

    // 사용자 번호(userId)와 비밀번호를 담을 state 선언
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");

    // 로그인 버튼 클릭 시 실행
    const handleLogin = async () => {
        try {
            // 백엔드의 /mask/users/login API로 요청 전송 (숫자형으로 변환)
            const response = await fetch("http://localhost:8080/mask/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: Number(userId),
                    password: password,
                }),
            });

            if (response.ok) {
                // 로그인 성공 시 서버가 반환한 유저 정보 DTO를 받음
                const data = await response.json();
                console.log("로그인 성공:", data);
                
                // localStorage에 유저 정보 저장 (MainLayout 검문소 연동용)
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("userName", data.userName);
                localStorage.setItem("userRole", data.role);
                
                // 대시보드로 이동
                navigate("/dashboard");
            } else {
                // 실패 시 백엔드에서 보낸 에러 메시지 출력
                const errorMsg = await response.text();
                alert(errorMsg || "로그인에 실패했습니다.");
            }
        } catch (error) {
            console.error("통신 오류:", error);
            alert("서버와 통신 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="login_box">
            <img className="logo" src={logo}></img>
            <div className="login_box_comment">실시간 제조공정 모니터링 및 품질관리 시스템</div>

            <div className="login_input_box">
                <input
                    type="number"
                    placeholder="사원 번호"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                />
                <br/>
                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <br/>
                <button className="login_button" onClick={handleLogin}>로그인</button>
            </div>
        </div>
    );
}