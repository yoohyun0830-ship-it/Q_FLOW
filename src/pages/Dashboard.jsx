import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/Dashboard.css";
import icon1 from "./img/erp_dashboard_production_clean.png";
import icon2 from "./img/erp_dashboard_quality_clean.png";
import icon3 from "./img/erp_dashboard_alert_clean.png";
import DashboardChart from "./DashboardChart";

export default function Dashboard() {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:8080/mask/batches") // 백엔드 API 엔드포인트
      .then((response) => {
        setDataList(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("데이터 로딩 실패:", error);
        setLoading(false);
      });
  }, []);

  // 최신/합계 데이터 예시 추출 (백엔드 필드명에 맞춰 변수 사용)
  const latestData = dataList.length > 0 ? dataList[dataList.length - 1] : {};

  return (
    <div>
      <div>
        <h2>대시보드</h2>
      </div>
      <div className="row1">
        <div className="dash_board1">
          <div>
            <img className="icon" src={icon1} alt="생산량 아이콘" />
          </div>
          <div className="db1_content">
            <div className="db1_text_box">
              <div>
                <p>생산량</p>
                <span>{latestData.productionQuantity}</span>
                <span>파우치</span>
              </div>
              <div>
                <p>목표 대비</p>
                <span>{latestData.targetRate}</span>
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
                <span>{latestData.defectCount}</span>
                <span>파우치</span>
              </div>
              <div>
                <p>일일 생산량 대비</p>
                <span>{latestData.defectRate}</span>
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
                <span>{latestData.alertCount}</span>
                <span>건</span>
              </div>
              <div>
                <p>목표 대비</p>
                <span>{latestData.alertTargetRate}</span>
                <span>%</span>
              </div>
            </div>
            <div>#bar형 그래프</div>
          </div>
        </div>
      </div>

      <div className="row2">
        <div className="dash_board2">
          <div className="db2_header">
            <div className="db2_title">생산량 및 불량률 추이</div>
            <select>
              <option value="lot">LOT 별</option>
              <option value="daily">일 별</option>
            </select>
          </div>
          <div>
            {loading ? (
              <div>로딩 중...</div>
            ) : (
              <DashboardChart chartData={dataList} />
            )}
          </div>
        </div>
        <div>
            <div className="db2_title">실시간 공정 현황</div>
            <div>
                <table>
                    <tbody>
                        <tr>
                            <td>① 원료 칭량</td>
                            <td><div>완료</div></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}