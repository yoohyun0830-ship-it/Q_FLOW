import React, { useState } from "react";
import "../css/system.css";

export default function SystemPage() {
  // 이상 판정 기준 설정 폼 상태
  const [formData, setFormData] = useState({
    processCode: "OP_S02_HEATING_MIX",
    sensorName: "tank_temp_c",
    conditionType: "RANGE",
    warningMin: "75.0",
    warningMax: "80.0",
    criticalMin: "80.0",
    criticalMax: "95.0",
    statusValue: "",
    durationSeconds: 30,
    isActive: true,
  });

  // 입력값 변경 핸들러
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 저장 버튼 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("저장될 anomaly_rule 데이터:", formData);
    alert("이상 판정 기준이 성공적으로 저장되었습니다.");
  };

  return (
    <div className="system-page">
      {/* 상단 2열 그리드 레이아웃 */}
      <div className="system-grid">
        
        {/* 이미지 스타일 반영: 이상 판정 기준 설정 카드 */}
        <div className="system-card anomaly-config-card">
          <div className="card-header">
            <h3>이상 판정 기준 설정</h3>
          </div>
          <form className="card-body" onSubmit={handleSubmit}>
            {/* 공정 및 검사 항목 선택 */}
            <div className="form-row">
              <label className="form-label">공정 / 항목</label>
              <div className="form-input-group dual">
                <select
                  name="processCode"
                  value={formData.processCode}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="OP_S01_SOLUBILIZE">① 원료 칭량</option>
                  <option value="OP_S02_HEATING_MIX">② 가열·혼합</option>
                  <option value="OP_S03_COOLING_FINISH">③ 냉각·마무리</option>
                  <option value="BULK_QC">④ 벌크 QC</option>
                  <option value="LINE_PKG_02">⑤ 충진·포장</option>
                </select>

                <select
                  name="sensorName"
                  value={formData.sensorName}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="tank_temp_c">탱크 온도 (tank_temp_c)</option>
                  <option value="paddle_rpm">교반 속도 (paddle_rpm)</option>
                  <option value="ph_level">pH 농도 (ph_level)</option>
                  <option value="bulk_viscosity_cps">점도 (bulk_viscosity_cps)</option>
                  <option value="metal_detector_status">금속 검출기 (metal_detector_status)</option>
                </select>
              </div>
            </div>

            {/* 주의 임계값 (Warning Min / Max) */}
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
                />
                <span className="sub-label">최대값</span>
                <input
                  type="number"
                  step="0.1"
                  name="warningMax"
                  value={formData.warningMax}
                  onChange={handleChange}
                  className="form-input num-input"
                />
              </div>
            </div>

            {/* 이상/위험 임계값 (Critical Min / Max) */}
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
                />
                <span className="sub-label">최대값</span>
                <input
                  type="number"
                  step="0.1"
                  name="criticalMax"
                  value={formData.criticalMax}
                  onChange={handleChange}
                  className="form-input num-input"
                />
              </div>
            </div>

            {/* 지속시간 및 상태값 */}
            <div className="form-row">
              <label className="form-label">기타 조건</label>
              <div className="form-input-group">
                <span className="sub-label">지속(초)</span>
                <input
                  type="number"
                  name="durationSeconds"
                  value={formData.durationSeconds}
                  onChange={handleChange}
                  className="form-input num-input"
                />
                <span className="sub-label">상태코드</span>
                <input
                  type="text"
                  name="statusValue"
                  placeholder="예: MD_REJECT"
                  value={formData.statusValue}
                  onChange={handleChange}
                  className="form-input text-input"
                />
              </div>
            </div>

            {/* 토글 스위치 & 저장 버튼 */}
            <div className="form-row footer-row">
              <div className="toggle-container">
                <span className="form-label">사용 여부</span>
                <span className="toggle-text">
                  {formData.isActive ? "사용함" : "사용안함"}
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <button type="submit" className="save-btn">
                저장
              </button>
            </div>
          </form>
        </div>

        {/* 오른쪽 설비/센서 목록 카드 */}
        <div className="system-card">
          <div className="card-header simple">
            <h3>설비 / 센서 등록 현황</h3>
          </div>
          <div className="card-body">
            <table className="system-table">
              <thead>
                <tr>
                  <th>설비명</th>
                  <th>공정</th>
                  <th>센서항목</th>
                  <th>단위</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>혼합탱크 #1</td>
                  <td>② 가열·혼합</td>
                  <td>tank_temp_c</td>
                  <td>°C</td>
                  <td><span className="status-badge normal">정상</span></td>
                </tr>
                <tr>
                  <td>냉각탱크 #2</td>
                  <td>③ 냉각·마무리</td>
                  <td>paddle_rpm</td>
                  <td>RPM</td>
                  <td><span className="status-badge normal">정상</span></td>
                </tr>
                <tr>
                  <td>포장라인 #2</td>
                  <td>⑤ 충진·포장</td>
                  <td>metal_detector</td>
                  <td>Status</td>
                  <td><span className="status-badge warn">주의</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 하단: 이상치 규칙 마스터 전체 테이블 */}
      <div className="system-card mt-16">
        <div className="card-header simple">
          <h3>공정별 이상 감지 규칙</h3>
        </div>
        <div className="card-body">
          <table className="system-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>공정코드</th>
                <th>이상 유형</th>
                <th>검사 항목</th>
                <th>주의 범위</th>
                <th>이상 범위</th>
                <th>지속시간</th>
                <th>사용 여부</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>OP_S02_HEATING_MIX</td>
                <td>TEMP_OVERHEAT</td>
                <td>tank_temp_c</td>
                <td>75.0 ~ 80.0</td>
                <td>80.0 ~ 95.0</td>
                <td>30초</td>
                <td><span className="status-badge active">사용</span></td>
              </tr>
              <tr>
                <td>2</td>
                <td>LINE_PKG_02</td>
                <td>METAL_DETECTED</td>
                <td>metal_detector_status</td>
                <td>-</td>
                <td>MD_REJECT</td>
                <td>0초</td>
                <td><span className="status-badge active">사용</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}