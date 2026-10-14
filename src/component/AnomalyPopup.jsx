
import { useEffect, useState } from "react";
import axios from "axios";
import "../css/anomalyPopup.css";

export default function AnomalyPopup() {

    // 팝업 표시 상태
    const [isOpen, setIsOpen] = useState(true);

        useEffect(() => {
        const fetchAnomalies = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:8080/mask/anomaly-events",
                    {
                        params: {
                            actionStatus: "미확인",
                            page: 0
                        }
                    }
                );

                const dbAnomalies = response.data.content.map((item) => ({
                id: item.anomalyId,
                batchId: item.batchId ?? "-",
                processName: item.processCode ?? "-",
                itemName: item.sensorName ?? item.anomalyType ?? "이상 감지",

                measuredValue: item.measuredValue ?? "-",
                unit: "",
                normalRange: "정보 없음",
                criticalRange: "정보 없음",

                level: item.severity === "심각" ? "CRITICAL" : "WARNING",
                message: item.alarmMessage ?? "이상치가 감지되었습니다.",

                actionStatus: item.actionStatus,
                executionId: item.executionId
            }));

            console.log("팝업용 변환 데이터:", dbAnomalies);
            // DB에서 조회한 이상치 목록 저장
            setAnomalies(dbAnomalies);

            // 현재 선택된 이상치가 있으면 유지, 없으면 첫 번째 선택
            setSelectedAnomalyId((prev) => {
                if (dbAnomalies.length === 0) return null;

                const stillExists = dbAnomalies.some(
                    (item) => item.id === prev
                );

                return stillExists ? prev : dbAnomalies[0].id;
            });
                        } catch (error) {
                console.error("이상치 조회 실패:", error);
            }
        };

            // 화면 진입 시 즉시 조회
            fetchAnomalies();

            // 5초마다 새로운 이상치 확인
            const intervalId = setInterval(() => {
                fetchAnomalies();
            }, 5000);

            // 컴포넌트 종료 시 반복 조회 중지
            return () => {
                clearInterval(intervalId);
            };
        }, []);

    // DB에서 조회한 이상치 목록
    const [anomalies, setAnomalies] = useState([]);

    // 현재 상세정보를 보여줄 알림 ID
    const [selectedAnomalyId, setSelectedAnomalyId] = useState(null);

    // 선택한 알림 데이터
    const anomaly = anomalies.find(
        (item) => item.id === selectedAnomalyId
    );

    // 이상치별 관리자 조치 입력값 저장
    const [actionForms, setActionForms] = useState({});

    // 현재 선택된 이상치의 입력값
    const currentForm = actionForms[selectedAnomalyId] || {
        manager: "",
        actionType: "PROCESS_ADJUST",
        actionDetail: "",
        notes: ""
    };

    const {
        manager,
        actionType,
        actionDetail,
        notes
    } = currentForm;

    // 현재 이상치의 입력값만 변경
    const updateActionForm = (field, value) => {
        setActionForms((prev) => ({
            ...prev,
            [selectedAnomalyId]: {
                manager: "",
                actionType: "PROCESS_ADJUST",
                actionDetail: "",
                notes: "",
                ...prev[selectedAnomalyId],
                [field]: value
            }
        }));
    };

    // 조치상태 선택 목록
    const actionOptions = [
        { value: "PROCESS_ADJUST", label: "공정 조건 조정" },
        { value: "EQUIPMENT_CHECK", label: "설비 점검" },
        { value: "REINSPECTION", label: "재측정 / 재검사" },
        { value: "PRODUCTION_PAUSE", label: "생산 일시정지" },
        { value: "OTHER", label: "기타" }
    ];

    const severityClass =
        anomaly?.level === "CRITICAL"
            ? "critical"
            : anomaly?.level === "WARNING"
            ? "warning"
            : "normal";

    const severityLabel =
        anomaly?.level === "CRITICAL"
            ? "심각"
            : anomaly?.level === "WARNING"
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

        // 현재 알림만 목록에서 제거
        const remainingAnomalies = anomalies.filter(
            (item) => item.id !== selectedAnomalyId
        );

        setAnomalies(remainingAnomalies);

        // 처리한 알림의 입력값 삭제
        setActionForms((prev) => {
            const updated = { ...prev };
            delete updated[selectedAnomalyId];
            return updated;
        });

        // 남은 알림 중 첫 번째 알림 표시
        if (remainingAnomalies.length > 0) {
            setSelectedAnomalyId(remainingAnomalies[0].id);
        } else {
            setIsOpen(false);
        }
    };

    if (!isOpen || !anomaly) return null;

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
                                updateActionForm("manager", e.target.value)
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
                                            updateActionForm("actionType", option.value)
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
                                    updateActionForm("actionDetail", e.target.value)
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
                                updateActionForm("notes", e.target.value)
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

                    {/* 다른 이상치 알림 목록 */}
                    {anomalies.length > 1 && (
                        <div className="anomaly-notification-list">

                            {anomalies
                                .filter((item) => item.id !== selectedAnomalyId)
                                .map((item) => (

                                    <button
                                        key={item.id}
                                        type="button"
                                        className="anomaly-notification-card"
                                        onClick={() => {
                                            setSelectedAnomalyId(item.id);
                                        }}
                                    >
                                        <div className="anomaly-notification-info">
                                            <strong>{item.itemName} 이상 감지</strong>
                                            <span>
                                                {item.batchId} · {item.processName}
                                            </span>
                                        </div>

                                        <span
                                            className={`anomaly-notification-level ${
                                                item.level === "CRITICAL"
                                                    ? "critical"
                                                    : "warning"
                                            }`}
                                        >
                                            {item.level === "CRITICAL"
                                                ? "심각"
                                                : "주의"}
                                        </span>
                                    </button>

                                ))}
                        </div>
                    )}

        </div>
    );
}
