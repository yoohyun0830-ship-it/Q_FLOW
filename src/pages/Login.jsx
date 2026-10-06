import { useNavigate } from "react-router-dom";
import "../css/login.css";
export default function Login(){

    const navigate = useNavigate();

    // 로그인 버튼 클릭
    const login = () => {
        navigate("/dashboard");
    };

    return(
        <div className="login_box">
            <h1>Q-FLOW</h1>
            <p>실시간 제조공정 모니터링 및 품질관리 시스템</p>

            <div>
                <input
                    type="text" placeholder="아이디"/>

                <input type="password" placeholder="비밀번호"/>

                <button onClick={login}>로그인</button>
            </div>
        </div>
    );
}