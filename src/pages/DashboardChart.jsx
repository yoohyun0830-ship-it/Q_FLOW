import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ★ 별도 패키지 설치 없이 막대 위에 양품/불량 수량을 그려주는 커스텀 플러그인
const customDataLabels = {
  id: 'customDataLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value && value > 0) {
          const x = bar.x;
          const barHeight = Math.abs(bar.base - bar.y);
          const centerY = (bar.base + bar.y) / 2;

          // 막대 높이가 충분히 크면 막대 안 중앙에 흰색 표시
          if (barHeight >= 15) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(value.toLocaleString(), x, centerY);
          } else {
            // 막대 높이가 너무 얇을 경우(불량 수가 적을 때) 막대 상단 외부에 표시
            ctx.fillStyle = datasetIndex === 0 ? '#ff4d4f' : '#3b82f6';
            ctx.fillText(value.toLocaleString(), x, bar.y - 8);
          }
        }
      });
    });

    ctx.restore();
  },
};

const DashboardChart = ({ batchId, filterOption }) => {
  const [rawList, setRawList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get('http://localhost:8080/mask/filling-packagings')
      .then((res) => {
        setRawList(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('포장 데이터 로딩 에러:', err);
        setLoading(false);
      });
  }, []);

  // 1. LOT 시작 시각 기준 고정 15분(900초) 고정 간격 집계 함수
  const get15MinData = () => {
    const filtered = rawList.filter((item) => {
      if (!batchId) return true;
      const itemBatchId = item.batchId || item.batch_id;
      return itemBatchId === batchId;
    });

    if (filtered.length === 0) {
      return { labels: [], passValues: [], failValues: [] };
    }

    let minTimeMs = Infinity;
    filtered.forEach((item) => {
      const timeStr = item.timestamp || item.created_at || item.packagingTime || item.packaging_time;
      if (!timeStr) return;
      const timeMs = new Date(timeStr).getTime();
      if (!isNaN(timeMs) && timeMs < minTimeMs) {
        minTimeMs = timeMs;
      }
    });

    if (minTimeMs === Infinity) {
      return { labels: [], passValues: [], failValues: [] };
    }

    const startTime = new Date(minTimeMs);
    startTime.setMilliseconds(0);
    const startTimeMs = startTime.getTime();

    const intervalMs = 15 * 60 * 1000; // 15분
    const timeSlots = {};

    filtered.forEach((item) => {
      const timeStr = item.timestamp || item.created_at || item.packagingTime || item.packaging_time;
      if (!timeStr) return;

      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return;

      const diffMs = date.getTime() - startTimeMs;
      if (diffMs < 0) return;

      const slotIndex = Math.floor(diffMs / intervalMs);
      const slotStartMs = startTimeMs + slotIndex * intervalMs;
      const slotStartDate = new Date(slotStartMs);

      const hour = String(slotStartDate.getHours()).padStart(2, '0');
      const min = String(slotStartDate.getMinutes()).padStart(2, '0');
      const sec = String(slotStartDate.getSeconds()).padStart(2, '0');
      const slotKey = `${hour}:${min}:${sec}`;

      if (!timeSlots[slotKey]) {
        timeSlots[slotKey] = { pass: 0, fail: 0, slotOrder: slotIndex };
      }

      const disposition = (item.finalDisposition || item.final_disposition || '').toUpperCase();
      if (
        disposition.includes('DISP_ACCEPTED') ||
        disposition.includes('ACCEPTED') ||
        disposition.includes('PASS') ||
        disposition.includes('OK')
      ) {
        timeSlots[slotKey].pass += 1;
      } else {
        timeSlots[slotKey].fail += 1;
      }
    });

    const sortedKeys = Object.keys(timeSlots).sort(
      (a, b) => timeSlots[a].slotOrder - timeSlots[b].slotOrder
    );

    return {
      labels: sortedKeys,
      passValues: sortedKeys.map((k) => timeSlots[k].pass),
      failValues: sortedKeys.map((k) => timeSlots[k].fail),
    };
  };

  // 2. 최근 LOT 5개 집계 함수
  const getRecentLotData = () => {
    const lotMap = {};

    rawList.forEach((item) => {
      const itemBatchId = item.batchId || item.batch_id || '미지정';
      if (!lotMap[itemBatchId]) {
        lotMap[itemBatchId] = { pass: 0, fail: 0 };
      }

      const disposition = (item.finalDisposition || item.final_disposition || '').toUpperCase();
      if (
        disposition.includes('DISP_ACCEPTED') ||
        disposition.includes('ACCEPTED') ||
        disposition.includes('PASS') ||
        disposition.includes('OK')
      ) {
        lotMap[itemBatchId].pass += 1;
      } else {
        lotMap[itemBatchId].fail += 1;
      }
    });

    const lotKeys = Object.keys(lotMap).slice(-5);
    return {
      labels: lotKeys,
      passValues: lotKeys.map((k) => lotMap[k].pass),
      failValues: lotKeys.map((k) => lotMap[k].fail),
    };
  };

  const { labels, passValues, failValues } =
    filterOption === 'recentLot' ? getRecentLotData() : get15MinData();

  const data = {
    labels: labels.length > 0 ? labels : ['데이터 없음'],
    datasets: [
      {
        label: '불량 수량', // 아래쪽 빨간색
        data: labels.length > 0 ? failValues : [0],
        backgroundColor: '#ff4d4f',
        barPercentage: 0.5,
      },
      {
        label: '양품 수량', // 위쪽 파란색
        data: labels.length > 0 ? passValues : [0],
        backgroundColor: '#72b0f5',
        barPercentage: 0.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, grid: { borderDash: [4, 4] } },
    },
  };

  if (loading) {
    return (
      <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        데이터 로딩 중...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '650px' }}>
      <Bar data={data} options={options} plugins={[customDataLabels]} />
    </div>
  );
};

export default DashboardChart;