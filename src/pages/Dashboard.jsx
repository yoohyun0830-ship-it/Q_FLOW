import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/Dashboard.css";
import icon1 from "./img/erp_dashboard_production_clean.png";
import icon2 from "./img/erp_dashboard_quality_clean.png";
import icon3 from "./img/erp_dashboard_alert_clean.png";
import DashboardChart from "./DashboardChart";
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [packagingList, setPackagingList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOption, setFilterOption] = useState("nowLot");

  useEffect(() => {
    setLoading(true);

    axios
      .get("http://localhost:8080/mask/filling-packagings")
      .then((pkgRes) => {
        setPackagingList(pkgRes.data || []);
        return axios.get("http://localhost:8080/mask/batches");
      })
      .then((batchRes) => {
        setBatchesList(batchRes.data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("데이터 로딩 실패:", error);
        setLoading(false);
      });
  }, []);

  // batches 전체 데이터를 활용해 평균 불량률 계산
  const totalBatchTargetUnits = batchesList.reduce((acc, curr) => {
    const target = curr.targetUnits ?? curr.target_units ?? 0;
    return acc + Number(target);
  }, 0);

  const totalBatchDefectUnits = batchesList.reduce((acc, curr) => {
    const defect = curr.defectUnits ?? curr.defect_units ?? 0;
    return acc + Number(defect);
  }, 0);

  const avgDefectRate =
    totalBatchTargetUnits > 0
      ? (totalBatchDefectUnits / totalBatchTargetUnits) * 100
      : 0;

  // 가장 최근 LOT 및 LOT ID 추출 (id, batchNo, batchCode 등 안전하게 방어)
  const latestBatch = batchesList.length > 0 ? batchesList[batchesList.length - 1] : null;
  const latestBatchId = latestBatch 
    ? (latestBatch.batchId || latestBatch.batch_id || latestBatch.id || latestBatch.batchNo || '') 
    : '';

  const latestPackagingData = packagingList.filter((item) => {
    if (!latestBatchId) return true;
    const itemBatchId = item.batchId || item.batch_id;
    return itemBatchId === latestBatchId;
  });

  const actualCount = latestPackagingData.filter((item) => {
    const disposition = item.finalDisposition || item.final_disposition || "";
    return disposition.includes("ACCEPTED");
  }).length;

  const defectCount = latestPackagingData.filter((item) => {
    const disposition = item.finalDisposition || item.final_disposition || "";
    return disposition.includes("REJECTED");
  }).length;

  const totalInspected = latestPackagingData.length;
  const latestDefectRate = totalInspected > 0 ? (defectCount / totalInspected) * 100 : 0;
  const diffVal = latestDefectRate - avgDefectRate;
  const defectRateDiffFormatted = diffVal > 0 ? `+${diffVal.toFixed(2)}` : diffVal.toFixed(2);

  const targetUnits = 3000;
  const targetRate = targetUnits > 0 ? ((actualCount / targetUnits) * 100).toFixed(1) : "0.0";
  const anomalyCount = 0;
  const anomalyTargetRate = "0.0";

  const processStages = [
    { id: "1", name: "① 원료 칭량", status: "done", text: `${batchesList.length} / ${batchesList.length} 배치` },
    { id: "2", name: "② 가열, 혼합", status: "done", text: `${batchesList.length} / ${batchesList.length} 배치` },
    { id: "3", name: "③ 냉각, 마무리", status: "done", text: `${batchesList.length} / ${batchesList.length} 배치` },
    { id: "4", name: "④ 벌크 QC", status: "done", text: `${batchesList.length} / ${batchesList.length} 배치` },
    { id: "5", name: "⑤ 충진, 포장", status: "done", text: `${batchesList.length} / ${batchesList.length} 배치` }
  ];

  return (
    <div>
      <div>
        <h2 style={{ margin: "0px" }}>대시보드</h2>
      </div>
      <div className="row">
        <div className="dash_board1">
          <div>
            <img className="icon" src={icon1} alt="생산량 아이콘" />
          </div>
          <div className="db1_content">
            <div className="db1_text_box">
              <div>
                <p>생산량</p>
                <span>{actualCount.toLocaleString()}</span>
                <span>파우치</span>
              </div>
              <div>
                <p>목표 대비</p>
                <span>{targetRate}</span>
                <span>%</span>
              </div>
            </div>
            <div>#bar형 그래프</div>
          </div>
        </div>

        <div className="dash_board1">
          <div>
            <img className="icon" src={icon2} alt="품질 아이콘" />
          </div>
          <div className="db1_content">
            <div className="db1_text_box">
              <div>
                <p>불량 건수</p>
                <span>{defectCount.toLocaleString()}</span>
                <span>파우치</span>
              </div>
              <div>
                <p>평균 불량률 대비</p>
                <span>{defectRateDiffFormatted}</span>
                <span>%</span>
              </div>
            </div>
            <div>#bar형 그래프</div>
          </div>
        </div>

        <div className="dash_board1">
          <div>
            <img className="icon" src={icon3} alt="알림 아이콘" />
          </div>
          <div className="db1_content">
            <div className="db1_text_box">
              <div>
                <p>이상 알림 건수</p>
                <span>{anomalyCount}</span>
                <span>건</span>
              </div>
              <div>
                <p>목표 대비</p>
                <span>{anomalyTargetRate}</span>
                <span>%</span>
              </div>
            </div>
            <div>#bar형 그래프</div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="dash_board2">
          <div className="db2_header">
            <div className="db2_title">생산량 및 불량률 추이</div>
            <select value={filterOption} onChange={(e) => setFilterOption(e.target.value)}>
              <option value="nowLot">현재 LOT 15분 간격</option>
              <option value="recentLot">최근 LOT 5개</option>
            </select>
          </div>
          <div>
            {loading ? (
              <div>로딩 중...</div>
            ) : (
              <DashboardChart
                batchId={latestBatchId}
                filterOption={filterOption} 
              />
            )}
          </div>
        </div>
        <Link to="/process">
          <div className="dash_board2">
            <div className="db2_title">실시간 공정 현황</div>
            <div>
              <table>
                <tbody>
                  {processStages.map((stage) => (
                    <tr key={stage.id}>
                      <td>{stage.name}</td>
                      <td>
                        <div className={stage.status}>
                          {stage.status === "done" ? "완료" : stage.status === "ing" ? "진행" : "대기"}
                        </div>
                      </td>
                      <td>{stage.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}