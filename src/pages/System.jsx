import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/system.css";

const API_BASE_URL = "http://localhost:8080/mask/anomaly-rules";

// 💡 공정별 종속 검사항목 매핑 데이터
const SENSOR_MAP = {
  OP_S01_SOLUBILIZE: [
    { value: "raw_material_weight", label: "원료 칭량 (raw_material_weight)" },
    { value: "ph_level", label: "pH 농도 (ph_level)" },
  ],
  OP_S02_HEATING_MIX: [
    { value: "tank_temp_c", label: "탱크 온도 (tank_temp_c)" },
    { value: "paddle_rpm", label: "교반 속도 (paddle_rpm)" },
    { value: "heating_pressure", label: "가열 압력 (heating_pressure)" },
  ],
  OP_S03_COOLING_FINISH: [
    { value: "cooling_temp_c", label: "냉각 온도 (cooling_temp_c)" },
    { value: "bulk_viscosity_cps", label: "점도 (bulk_viscosity_cps)" },
  ],
  BULK_QC: [
    { value: "qc_ph_level", label: "QC pH (qc_ph_level)" },
    { value: "qc_viscosity", label: "QC 점도 (qc_viscosity)" },
    { value: "microbe_test_status", label: "미생물 검사 (microbe_test_status)" },
  ],
  LINE_PKG_02: [
    { value: "filling_volume_ml", label: "충진량 (filling_volume_ml)" },
    { value: "sealing_temp_c", label: "실링 온도 (sealing_temp_c)" },
    { value: "metal_detector_status", label: "금속 검출기 (metal_detector_status)" },
  ],
};

export default function SystemPage() {
  const [rules, setRules] = useState([]);
  const [activeRules, setActiveRules] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 입력 폼 상태
  const [formData, setFormData] = useState({
    processCode: "OP_S02_HEATING_MIX",
    sensorName: "tank_temp_c",
    warningMin: "75.0",
    warningMax: "80.0",
    criticalMin: "80.0",
    criticalMax: "95.0",
    durationSeconds: 30,
    conditionType: "RANGE",
    isActive: true,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [allRes, activeRes] = await Promise.all([
        axios.get(API_BASE_URL),
        axios.get(`${API_BASE_URL}?activeOnly=true`),
      ]);
      setRules(allRes.data);
      setActiveRules(activeRes.data);
    } catch (error) {
      console.error("이상 감지 규칙 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 💡 공정(processCode) 변경 시 해당 공정의 첫 번째 검사항목으로 센서명 자동 동기화
  const handleProcessChange = (e) => {
    const selectedProcess = e.target.value;
    const availableSensors = SENSOR_MAP[selectedProcess] || [];
    const defaultSensor = availableSensors.length > 0 ? availableSensors[0].value : "";

    setFormData((prev) => ({
      ...prev,
      processCode: selectedProcess,
      sensorName: defaultSensor,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_BASE_URL, formData);
      if (response.status === 200 || response.status === 201) {
        alert("이상 판정 개정 기준이 성공적으로 저장되었습니다.");
        fetchAllData();
      }
    } catch (error) {
      console.error("규칙 저장 중 오류 발생:", error);
      alert("저장에 실패했습니다. 백엔드 서버 상태 및 입력값을 확인해 주세요.");
    }
  };

  // 💡 사용여부 토글 스위치 (하단 테이블에서 원터치 실행)
  const handleToggleStatus = async (ruleId) => {
    try {
      await axios.put(`${API_BASE_URL}/${ruleId}/toggle`);
      fetchAllData();
    } catch (error) {
      console.error("상태 토글 중 오류 발생:", error);
      alert("상태 변경에 실패했습니다. (CORS 또는 백엔드 라우팅 상태를 확인하세요)");
    }
  };

  return (
    <div className="system-page">
      <div className="system-grid">
        {/* 1. 이상 판정 기준 설정 카드 */}
        <div className="system-card anomaly-config-card">
          <div className="card-header">
            <h3>이상 판정 기준 설정</h3>
          </div>
          <form className="card-body" onSubmit={handleSubmit}>
            {/* 공정 선택 & 종속 검사 항목 동적 렌더링 */}
            <div className="form-row">
              <label className="form-label">공정 / 항목</label>
              <div className="form-input-group dual">
                <select
                  name="processCode"
                  value={formData.processCode}
                  onChange={handleProcessChange}
                  className="form-select"
                >
                  <option value="OP_S01_SOLUBILIZE">① 원료 칭량</option>
                  <option value="OP_S02_HEATING_MIX">② 가열·혼합</option>
                  <option value="OP_S03_COOLING_FINISH">③ 냉각·마무리</option>
                  <option value="BULK_QC">④ 벌크 QC</option>
                  <option value="LINE_PKG_02">⑤ 충진·포장</option>
                </select>

                {/* 선택된 공정에 종속된 검사항목만 표시 */}
                <select
                  name="sensorName"
                  value={formData.sensorName}
                  onChange={handleChange}
                  className="form-select"
                >
                  {(SENSOR_MAP[formData.processCode] || []).map((sensor) => (
                    <option key={sensor.value} value={sensor.value}>
                      {sensor.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 주의 기준값 (Warning Min / Max) */}
            <div className="form-row">
              <label className="form-label">주의 기준값</label>
              <div className="form-input-group">
                <span className="sub-label">최소값</span>
                <input
                  type="number"
                  step="0.1"
                  name="warningMin"
                  value={formData.warningMin}
                  onChange={handleChange}
                  className="form-input num-input"
                  required
                />
                <span className="sub-label">최대값</span>
                <input
                  type="number"
                  step="0.1"
                  name="warningMax"
                  value={formData.warningMax}
                  onChange={handleChange}
                  className="form-input num-input"
                  required
                />
              </div>
            </div>

            {/* 이상 기준값 (Critical Min / Max) */}
            <div className="form-row">
              <label className="form-label">이상 기준값</label>
              <div className="form-input-group">
                <span className="sub-label">최소값</span>
                <input
                  type="number"
                  step="0.1"
                  name="criticalMin"
                  value={formData.criticalMin}
                  onChange={handleChange}
                  className="form-input num-input"
                  required
                />
                <span className="sub-label">최대값</span>
                <input
                  type="number"
                  step="0.1"
                  name="criticalMax"
                  value={formData.criticalMax}
                  onChange={handleChange}
                  className="form-input num-input"
                  required
                />
              </div>
            </div>

            {/* 지속(초) */}
            <div className="form-row">
              <label className="form-label">지속(초)</label>
              <div className="form-input-group">
                <input
                  type="number"
                  name="durationSeconds"
                  value={formData.durationSeconds}
                  onChange={handleChange}
                  className="form-input num-input"
                  required
                />
              </div>
            </div>

            {/* 하단 저장 버튼 */}
            <div className="form-row footer-row end-align">
              <button type="submit" className="save-btn">
                개정판 저장
              </button>
            </div>
          </form>
        </div>

        {/* 2. 우측 상단: 현재 실시간 적용 규칙 현황 카드 */}
        <div className="system-card">
          <div className="card-header simple">
            <h3>현재 실시간 적용 규칙 현황</h3>
          </div>
          <div className="card-body">
            <table className="system-table">
              <thead>
                <tr>
                  <th>공정</th>
                  <th>검사항목</th>
                  <th>주의 범위</th>
                  <th>이상 범위</th>
                  <th>지속</th>
                </tr>
              </thead>
              <tbody>
                {activeRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      {loading ? "데이터 로딩 중..." : "적용 중인 활성 규칙이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  activeRules.map((item) => (
                    <tr key={item.ruleId}>
                      <td>{item.processCode}</td>
                      <td>{item.sensorName}</td>
                      <td>
                        {item.warningMin != null && item.warningMax != null
                          ? `${item.warningMin} ~ ${item.warningMax}`
                          : "-"}
                      </td>
                      <td>
                        {item.criticalMin != null && item.criticalMax != null
                          ? `${item.criticalMin} ~ ${item.criticalMax}`
                          : "-"}
                      </td>
                      <td>{item.durationSeconds}초</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. 하단: 공정별 이상 감지 규칙 전체 이력 (사용여부 토글 스위치 제공) */}
      <div className="system-card mt-16">
        <div className="card-header simple">
          <h3>공정별 이상 감지 규칙 전체 이력</h3>
        </div>
        <div className="card-body">
          <table className="system-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>공정코드</th>
                <th>검사 항목</th>
                <th>주의 범위</th>
                <th>이상 범위</th>
                <th>지속시간</th>
                <th>상태</th>
                <th>사용 여부 스위치</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    {loading ? "데이터를 불러오는 중입니다..." : "등록된 이상치 규칙 이력이 없습니다."}
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.ruleId} className={!rule.isActive ? "history-row" : ""}>
                    <td>{rule.ruleId}</td>
                    <td>{rule.processCode}</td>
                    <td>{rule.sensorName}</td>
                    <td>
                      {rule.warningMin != null && rule.warningMax != null
                        ? `${rule.warningMin} ~ ${rule.warningMax}`
                        : "-"}
                    </td>
                    <td>
                      {rule.criticalMin != null && rule.criticalMax != null
                        ? `${rule.criticalMin} ~ ${rule.criticalMax}`
                        : "-"}
                    </td>
                    <td>{rule.durationSeconds}초</td>
                    <td>
                      <span className={`status-badge ${rule.isActive ? "active" : "inactive"}`}>
                        {rule.isActive ? "사용 중" : "비활성"}
                      </span>
                    </td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={() => handleToggleStatus(rule.ruleId)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}