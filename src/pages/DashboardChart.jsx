
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Chart.js 필수 모듈 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// 🚀 props로 chartData를 받도록 변경 (기본값 [] 설정)
const DashboardChart = ({ chartData = [] }) => {
  // 1. 백엔드에서 전달받은 배열 데이터에서 X축(날짜)과 Y축(생산량, 불량률) 데이터 추출
  // ※ 백엔드 DTO / DB 컬럼명에 따라 item.date, item.productionQuantity 등을 수정하세요.
  const labels = chartData.map((item) => item.date || item.createdAt || '날짜');
  const productionValues = chartData.map((item) => item.productionQuantity || 0);
  const defectValues = chartData.map((item) => item.defectRate || 0);

  // 2. 차트 데이터 구성
  const data = {
    labels: labels.length > 0 ? labels : ['9/16', '9/17', '9/18', '9/19', '9/20'], // 데이터 없을 시 임시 예시
    datasets: [
      {
        type: 'bar',
        label: '생산량(파우치)',
        data: productionValues,
        backgroundColor: '#3b82f6', // 파란색 막대
        yAxisID: 'y_production',
        barPercentage: 0.6,
        borderRadius: 4,
        // 막대 위 수치 데이터 라벨 설정
        datalabels: {
          color: '#1d4ed8',
          anchor: 'end',
          align: 'top',
          font: { weight: 'bold', size: 12 },
          formatter: (value) => (value ? value.toLocaleString() : 0),
        },
      },
      {
        type: 'line',
        label: '불량률(%)',
        data: defectValues,
        borderColor: '#ef4444', // 빨간색 라인
        backgroundColor: '#ef4444',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: '#ef4444',
        yAxisID: 'y_defect',
        // 꺾은선 점 위 수치 데이터 라벨 설정
        datalabels: {
          color: '#ffffff',
          anchor: 'center',
          align: 'top',
          offset: 10,
          font: { weight: 'bold', size: 12 },
          formatter: (value) => `${Number(value || 0).toFixed(2)}%`,
        },
      },
    ],
  };

  // 3. 차트 옵션 설정 (이중 Y축)
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { size: 13, weight: '500' },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      // 왼쪽 Y축: 생산량 (막대용)
      y_production: {
        type: 'linear',
        position: 'left',
        min: 0,
        suggestedMax: 50000, // 동적 데이터에 맞춰 가변 적용되도록 suggestedMax 사용
        title: {
          display: true,
          text: '생산량(파우치)',
          font: { size: 12 },
        },
        ticks: {
          stepSize: 10000,
          callback: (value) => value.toLocaleString(),
        },
        grid: { color: '#f3f4f6' },
      },
      // 오른쪽 Y축: 불량률 (라인용)
      y_defect: {
        type: 'linear',
        position: 'right',
        min: 0.0,
        suggestedMax: 2.0,
        title: {
          display: true,
          text: '불량률(%)',
          font: { size: 12 },
        },
        ticks: {
          stepSize: 0.5,
          callback: (value) => Number(value).toFixed(1),
        },
        grid: { drawOnChartArea: false }, // 격자선 중복 방지
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '350px' }}>
      <Chart type="bar" data={data} options={options} />
    </div>
  );
};

export default DashboardChart;