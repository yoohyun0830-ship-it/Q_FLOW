import { useEffect, useState } from "react";
import axios from "axios";
import "../css/system.css";

const API = "http://localhost:8080/mask/anomaly-rules";
const RULE_OPTIONS = {
  "원료 칭량": [
    ["대량 원료 칭량 오차", "dispensing_error_pct", "WEIGHT_GT10_PCT"],
    ["일반 원료 칭량 오차", "dispensing_error_pct", "WEIGHT_1_10_PCT"],
    ["미량 원료 칭량 오차", "dispensing_error_g", "WEIGHT_LT1_G"]
  ],
  "가열/혼합": [
    ["가열 유지 온도 이탈", "tank_temp_c", "HEAT_HOLD_RANGE"],
    ["가열 유지 교반속도 이탈", "paddle_rpm", "HEAT_HOLD_RANGE"]
  ],
  "냉각": [["기능성 원료 투입 온도 초과", "tank_temp_c", "BEFORE_HA_UPPER"]],
  "벌크 검사": [
    ["벌크 pH 이상", "ph_measured", "RANGE"],
    ["벌크 점도 이상", "viscosity_measured", "RANGE"]
  ],
  "최종 포장 검사": [
    ["시트 중량 이상", "sheet_dry_weight_g", "RANGE"],
    ["파우치 자체중량 이상", "pouch_tare_weight_g", "RANGE"],
    ["에센스 순중량 이상", "essence_net_weight_g", "RANGE"],
    ["완제품 총중량 이상", "gross_total_weight_g", "RANGE"],
    ["실링온도 이상", "seal_temp_c", "SEAL_BOTH_RANGE"]
  ]
};
const emptyRule = () => ({ processCode: "원료 칭량", anomalyType: "대량 원료 칭량 오차", sensorName: "dispensing_error_pct", conditionType: "WEIGHT_GT10_PCT",
  warningMin: "", warningMax: "", criticalMin: "", criticalMax: "", statusValue: "", durationSeconds: 0,
  checkItems: "", responseDescription: "", isActive: true });
const processes = ["원료 칭량", "가열/혼합", "냉각", "벌크 검사", "최종 포장 검사"];
const numericFields = ["warningMin", "warningMax", "criticalMin", "criticalMax"];
const range = (min, max) => min == null ? (max == null ? "-" : "≤ " + max) : max == null ? "≥ " + min : min + " ~ " + max;
const errorMessage = error => error.response?.data?.detail || error.response?.data?.message || "요청에 실패했습니다. 서버 상태와 입력값을 확인해 주세요.";

export default function SystemPage() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyRule);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try { setRules((await axios.get(API)).data); return true; }
    catch (e) { setError(errorMessage(e)); return false; }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const controller = new AbortController();
    axios.get(API, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setRules(response.data); })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const change = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  // DB의 기존 규칙도 선택 목록에 포함해 이전 데이터 편집을 지원한다.
  const optionsFor = process => {
    const options = (RULE_OPTIONS[process] || []).map(([anomalyType, sensorName, conditionType]) => ({ anomalyType, sensorName, conditionType }));
    rules.filter(rule => rule.processCode === process).forEach(rule => {
      if (!options.some(option => option.anomalyType === rule.anomalyType)) options.push(rule);
    });
    return options;
  };
  const selectType = (process, type) => {
    const option = optionsFor(process).find(item => item.anomalyType === type);
    setForm(prev => ({ ...prev, processCode: process, anomalyType: option?.anomalyType || "",
      sensorName: option?.sensorName || "", conditionType: option?.conditionType || "RANGE" }));
  };
  const edit = rule => {
    const next = emptyRule();
    Object.keys(next).forEach(key => { next[key] = rule[key] ?? (key === "isActive" ? false : ""); });
    setForm(next); setEditingId(rule.ruleId); setError(""); setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setEditingId(null); setForm(emptyRule()); };
  const submit = async e => {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    const payload = { ...form, durationSeconds: Number(form.durationSeconds), statusValue: form.statusValue.trim() || null };
    numericFields.forEach(key => { payload[key] = form[key] === "" ? null : Number(form[key]); });
    try {
      if (editingId !== null) await axios.put(API + "/" + editingId, payload);
      else await axios.post(API, payload);
      reset();
      const loaded = await load();
      setMessage(loaded ? "규칙을 저장했습니다." : "저장은 완료했지만 목록을 새로 불러오지 못했습니다.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const toggle = async id => {
    setSaving(true); setError(""); setMessage("");
    try { await axios.put(API + "/" + id + "/change"); await load(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const table = (items, editable) => <div className="rule-table-scroll"><table className="system-table">
    <thead><tr><th>ID</th><th>공정 / 이상 유형</th><th>검사항목 / 조건</th><th>주의 범위</th><th>심각 기준 범위</th><th>지속</th><th>사용 여부</th>{editable && <th>수정</th>}</tr></thead>
    <tbody>{items.length === 0 ? <tr><td colSpan={editable ? 8 : 7} className="empty-cell">{loading ? "불러오는 중…" : "등록된 규칙이 없습니다."}</td></tr> : items.map(rule => <tr key={rule.ruleId}>
      <td>{rule.ruleId}</td><td>{rule.processCode}<br />{rule.anomalyType}</td><td>{rule.sensorName}<br />{rule.conditionType}</td>
      <td>{range(rule.warningMin, rule.warningMax)}</td><td>{range(rule.criticalMin, rule.criticalMax)}</td><td>{rule.durationSeconds}초</td>
      <td>{editable ? <label><input type="checkbox" aria-label={rule.anomalyType + " 사용 여부"} checked={Boolean(rule.isActive)} disabled={saving || loading} onChange={() => toggle(rule.ruleId)} /> {rule.isActive ? "사용 중" : "비활성"}</label> : "사용 중"}</td>
      {editable && <td><button type="button" disabled={saving || loading} onClick={() => edit(rule)}>수정</button></td>}
    </tr>)}</tbody>
  </table></div>;
  return <div className="system-page">
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="system-grid">
      <div className="system-card"><div className="card-header"><h3>{editingId === null ? "이상 규칙 등록" : "이상 규칙 수정 (#" + editingId + ")"}</h3></div>
        <form className="card-body" onSubmit={submit}>
          <fieldset disabled={saving} className="rule-fields">
          <label className="form-row">공정<select className="form-select" name="processCode" value={form.processCode} onChange={e => selectType(e.target.value, optionsFor(e.target.value)[0]?.anomalyType)}>{[...new Set([...processes, form.processCode])].map(p => <option key={p}>{p}</option>)}</select></label>
          <label className="form-row">이상 유형<select className="form-select" name="anomalyType" value={form.anomalyType} required onChange={e => selectType(form.processCode, e.target.value)}>{optionsFor(form.processCode).map(option => <option key={option.anomalyType} value={option.anomalyType}>{option.anomalyType}</option>)}</select></label>
          <label className="form-row">검사항목 코드<input className="form-input" value={form.sensorName} readOnly /></label>
          <label className="form-row">조건 유형<input className="form-input" value={form.conditionType} readOnly /></label>
          {[["warningMin", "주의 하한"], ["warningMax", "주의 상한"], ["criticalMin", "심각 하한"], ["criticalMax", "심각 상한"]].map(([name, label]) => <label className="form-row" key={name}>{label}<input className="form-input" type="number" step="0.001" name={name} value={form[name]} onChange={change} /></label>)}
          <p>적용하지 않는 하한·상한은 비워 두세요. 기준값은 소수점 3자리까지 입력할 수 있습니다.</p>
          <label className="form-row">지속시간(초)<input className="form-input" type="number" min="0" max="2147483647" step="1" required name="durationSeconds" value={form.durationSeconds} onChange={change} /></label>
          <label className="form-row"><input type="checkbox" name="isActive" checked={form.isActive} onChange={change} /> 사용 여부</label>
          <p>동일 공정·검사항목·조건의 규칙을 활성화하면 기존 활성 규칙은 비활성화됩니다.</p>
          <div className="form-row"><button className="save-btn" type="submit">{saving ? "저장 중…" : editingId === null ? "등록" : "수정 저장"}</button><button type="button" onClick={reset}>{editingId === null ? "초기화" : "수정 취소"}</button></div>
          </fieldset>
        </form>
      </div>
      <div className="system-card"><div className="card-header"><h3>활성 규칙 현황</h3></div><div className="card-body">{table(rules.filter(r => r.isActive), false)}</div></div>
    </div>
    <div className="system-card mt-16"><div className="card-header"><h3>전체 이상 규칙</h3><button type="button" disabled={loading || saving} onClick={load}>새로고침</button></div><div className="card-body">{table(rules, true)}</div></div>
  </div>;
}
