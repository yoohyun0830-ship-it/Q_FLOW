
import "../css/report.css";
import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function ReportPage() {
  // Canvas 요소 참조를 위한 ref
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);

  // Chart 인스턴스 저장용 ref
  const chartInstance1 = useRef(null);
  const chartInstance2 = useRef(null);

  useEffect(() => {
    const days = ["4-16", "4-19", "4-20", "4-22", "4-23", "4-24", "4-25"];

    // 1. 라인 차트 생성 (생산량 및 불량률 추이)
    if (chartRef1.current) {
      // 기존 차트가 존재하면 파괴
      if (chartInstance1.current) {
        chartInstance1.current.destroy();
      }

      chartInstance1.current = new Chart(chartRef1.current, {
        type: "line",
        data: {
          labels: days,
          datasets: [
            {
              label: "데이터 없음",
              data: [0, 0, 0, 0, 0, 0, 0], // 빈 데이터 표시용 샘플
              borderColor: "#cbd5e1",
              backgroundColor: "rgba(203, 213, 225, 0.2)",
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, suggestedMax: 10 } },
        },
      });
    }

    // 2. 도넛 차트 생성 (불량 유형 분포)
    if (chartRef2.current) {
      // 기존 차트가 존재하면 파괴
      if (chartInstance2.current) {
        chartInstance2.current.destroy();
      }

      chartInstance2.current = new Chart(chartRef2.current, {
        type: "doughnut",
        data: {
          labels: ["데이터 없음"],
          datasets: [
            {
              data: [1],
              backgroundColor: ["#e5e7eb"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }

    // 언마운트 시 차트 파괴 (메모리 누수 방지)
    return () => {
      if (chartInstance1.current) chartInstance1.current.destroy();
      if (chartInstance2.current) chartInstance2.current.destroy();
    };
  }, []);

  return (
    <div className="report-page">
      {/* 상단 툴바 */}
      <div className="report-toolbar">
        <span>기간</span>
        <input type="date" />
        <span>~</span>
        <input type="date" />

        <select>
          <option>일별</option>
          <option>주별</option>
          <option>월별</option>
        </select>

        <button className="primary">조회</button>
      </div>

      {/* 차트 영역 (가로 2열) */}
      <div className="report-grid">
        <div className="report-card">
          <h3>생산량 및 불량률 추이</h3>
          <div className="chart-wrapper">
            {/* id 대신 ref를 사용하여 직접 참조 */}
            <canvas ref={chartRef1}></canvas>
          </div>
        </div>

        <div className="report-card">
          <h3>불량 유형 분포</h3>
          <div className="chart-wrapper">
            {/* id 대신 ref를 사용하여 직접 참조 */}
            <canvas ref={chartRef2}></canvas>
          </div>
        </div>
      </div>

      {/* 하단 분석 테이블 */}
      <div className="report-card mt-16">
        <h3>원인 후보 분석 (정상 vs 불량 공정조건 비교)</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>공정조건</th>
              <th>정상 평균</th>
              <th>불량 평균</th>
              <th>차이</th>
              <th>확인 우선도</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="report-empty-state">
                비교할 데이터가 없습니다
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}