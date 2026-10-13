
import { useState } from "react";
import "../css/anomalyPopup.css";

export default function AnomalyPopup() {

    // 팝업 표시 상태
    const [isOpen, setIsOpen] = useState(true);

    // 테스트용 이상 데이터
    const anomaly = {
        batchId: "LOT20230112-003",
        processName: "가열/혼합",
        itemName: "탱크 온도",
        measuredValue: 66.0,
        unit: "°C",
        normalRange: "61 ~ 64",
        criticalRange: "60°C 미만 / 65°C 초과",
        level: "CRITICAL",
        message: "탱크 온도가 심각 상한 65°C를 초과했습니다."
    };

    // 관리자 조치 입력
    const [manager, setManager] = useState("");
    const [actionType, setActionType] = useState("PROCESS_ADJUST");
    const [actionDetail, setActionDetail] = useState("");
    const [notes, setNotes] = useState("");

    // 조치상태 선택 목록
    const actionOptions = [
        { value: "PROCESS_ADJUST", label: "공정 조건 조정" },
        { value: "EQUIPMENT_CHECK", label: "설비 점검" },
        { value: "REINSPECTION", label: "재측정 / 재검사" },
        { value: "PRODUCTION_PAUSE", label: "생산 일시정지" },
        { value: "OTHER", label: "기타" }
    ];

    // 심각도별 스타일
    const severityClass =
        anomaly.level === "CRITICAL"
            ? "critical"
            : anomaly.level === "WARNING"
            ? "warning"
            : "normal";

    const severityLabel =
        anomaly.level === "CRITICAL"
            ? "심각"
            : anomaly.level === "WARNING"
            ? "주의"
            : "정상";

    // 확인 및 조치 완료
    const handleConfirm = () => {

        if (anomaly.level === "CRITICAL") {

            // 1. 사원번호 유효성 검사
            if (!/^[1-9]\d*$/.test(manager.trim())) {
                alert("올바른 사원번호를 입력해 주세요.");
                return;
            }

            // 2. 기타 선택 시 비고 필수
            if (actionType === "OTHER" && !actionDetail.trim()) {
                alert("비고를 입력해 주세요.");
                return;
            }

            // 3. 조치내용 필수 입력 검사
            if (!notes.trim()) {
                alert("조치내용을 입력해 주세요.");
                return;
            }

            // 4. 선택한 조치상태
            const selectedAction = actionOptions.find(
                (option) => option.value === actionType
            );

            // 5. 테스트용 콘솔 출력
            console.log("관리자 조치내역:", {
                batchId: anomaly.batchId,
                userId: Number(manager),
                actionStatus: actionType,
                actionStatusLabel: selectedAction?.label,
                actionDetail: notes.trim(),
                remarks:
                    actionType === "OTHER"
                        ? actionDetail.trim()
                        : null
            });
        }

        // 검증 완료 후 팝업 닫기
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className={`anomaly-popup ${severityClass}`}>

            {/* 팝업 제목 */}
            <div className="anomaly-popup-header">
                <h3>⚠ 공정 이상 감지</h3>

                <span className={`anomaly-level ${severityClass}`}>
                    {severityLabel}
                </span>
            </div>

            {/* 이상 상세정보 */}
            <div className="anomaly-popup-body">

                {/* 발생 정보 */}
                <div className="anomaly-section-title">
                    발생 정보
                </div>

                <div className="anomaly-info-row">
                    <span>LOT 번호</span>
                    <strong>{anomaly.batchId}</strong>
                </div>

                <div className="anomaly-info-row">
                    <span>공정명</span>
                    <strong>{anomaly.processName}</strong>
                </div>

                <div className="anomaly-info-row">
                    <span>측정항목</span>
                    <strong>{anomaly.itemName}</strong>
                </div>

                {/* 측정 결과 */}
                <div className="anomaly-section-title">
                    측정 결과
                </div>

                <div className="anomaly-value-grid">

                    <div className="anomaly-value-card">
                        <span>실제 측정값</span>
                        <strong className="anomaly-danger-value">
                            {anomaly.measuredValue}{anomaly.unit}
                        </strong>
                    </div>

                    <div className="anomaly-value-card">
                        <span>정상 범위</span>
                        <strong>
                            {anomaly.normalRange}{anomaly.unit}
                        </strong>
                    </div>

                </div>

                <div className="anomaly-info-row">
                    <span>{severityLabel} 판정 기준</span>
                    <strong>{anomaly.criticalRange}</strong>
                </div>

                {/* 이상 메시지 */}
                <div className="anomaly-message">
                    <strong>⚠ {severityLabel} 기준 초과</strong>
                    <p>{anomaly.message}</p>
                </div>

            </div>

            {/* 심각 단계에서만 관리자 조치 입력 */}
            {anomaly.level === "CRITICAL" && (
                <div className="anomaly-action-form">

                    <h4 className="anomaly-section-title">
                        관리자 조치내역
                    </h4>

                    {/* 담당 관리자 */}
                    <div className="anomaly-form-field">
                        <label>담당 관리자 (사원번호) *</label>

                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={manager}
                            onChange={(e) =>
                                setManager(e.target.value)
                            }
                            placeholder="사원번호를 입력하세요"
                        />
                    </div>

                    {/* 조치상태 선택 */}
                    <div className="anomaly-form-field">
                        <label>조치상태 *</label>

                        <div className="anomaly-action-options">
                            {actionOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={`anomaly-action-card ${
                                        actionType === option.value
                                            ? "selected"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="anomalyActionType"
                                        value={option.value}
                                        checked={actionType === option.value}
                                        onChange={() =>
                                            setActionType(option.value)
                                        }
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 기타 선택 시 비고 입력 */}
                    {actionType === "OTHER" && (
                        <div className="anomaly-form-field">
                            <label>비고 *</label>

                            <textarea
                                value={actionDetail}
                                onChange={(e) =>
                                    setActionDetail(e.target.value)
                                }
                                placeholder="기타 조치에 대한 내용을 입력하세요."
                                rows={3}
                                required
                            />
                        </div>
                    )}

                    {/* 조치내용 - 필수 입력 */}
                    <div className="anomaly-form-field">
                        <label>조치내용 *</label>

                        <textarea
                            value={notes}
                            onChange={(e) =>
                                setNotes(e.target.value)
                            }
                            placeholder="실제로 수행한 조치 내용을 상세히 입력하세요."
                            rows={3}
                            required
                        />
                    </div>

                </div>
            )}

            {/* 확인 및 조치 완료 버튼 */}
            <button
                type="button"
                className="anomaly-confirm-btn"
                onClick={handleConfirm}
            >
                {anomaly.level === "CRITICAL"
                    ? "조치 완료"
                    : "확인 처리"}
            </button>

        </div>
    );
}
