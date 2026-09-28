import { useState } from "react";

export default function AnomalyPopup(){

    // 이상치 상세창 열림/닫힘 상태
    const [isOpen, setIsOpen] = useState(true);

    // 창이 닫힌 상태면 화면에 표시하지 않음
    if(isOpen == false){
        return null;
    }

    return(
        <div>
            <h3>⚠ 이상치 상세정보</h3>

            <p>이상 발생 알림 테스트</p>

            <button onClick={() => setIsOpen(false)}>
                확인 처리
            </button>
        </div>
    );
}