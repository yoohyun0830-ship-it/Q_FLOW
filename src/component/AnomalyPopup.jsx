import "../css/anomalyPopup.css";
import { useState } from "react";

export default function AnomalyPopup() {

    // 이상치 상세창 열림/닫힘 상태
    const [isOpen, setIsOpen] = useState(true);

    // 임시 이상치 데이터 (나중에 SSE 데이터로 변경)
    const anomaly = {
        batchId: "LOT20230112-003",
        processName: "가열/혼합",
        itemName: "탱크 온도",
        measuredValue: 66.0,
        unit: "°C",
        normalRange: "61 ~ 64",
        level: "심각",
        message: "탱크 온도가 심각 상한을 초과했습니다."
    };

    // 창이 닫힌 상태면 화면에 표시하지 않음
    if (isOpen === false) {
        return null;
    }

    
    return (
        <div className="anomaly-overlay">
            <div className="anomaly-popup">
                <h3>⚠ 공정 이상 감지</h3>

                <p>이상 등급: {anomaly.level}</p>
                <p>LOT 번호: {anomaly.batchId}</p>
                <p>공정명: {anomaly.processName}</p>
                <p>측정항목: {anomaly.itemName}</p>
                <p>
                    측정값: {anomaly.measuredValue}{anomaly.unit}
                </p>
                <p>
                    정상 범위: {anomaly.normalRange}{anomaly.unit}
                </p>
                <p>{anomaly.message}</p>

                <button
                    className="anomaly-confirm-btn"
                    onClick={() => setIsOpen(false)}
                >
                    확인 처리
                </button>
            </div>
        </div>
    );

}
