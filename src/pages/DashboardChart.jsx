
import React from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// 'YYYY-MM-DD HH:mm:ss.SSS' 또는 기타 ISO 포맷 안전 파싱 함수
const parseDateCustom = (dateStr) => {
  if (!dateStr) return null;

  if (typeof dateStr !== 'string') {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = dateStr.trim();

  // '2023-01-05 12:37:00.450' 형태 전용 정규식 파싱
  const regex = /^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/;
  const match = str.match(regex);

  if (match) {
    const [, year, month, day, hours, minutes, seconds, ms] = match;
    const parsedDate = new Date(
      Number(year),
      Number(month) - 1, // 월은 0부터 시작
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
      ms ? Number(ms.padEnd(3, '0')) : 0
    );
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  // 표준 ISO 포맷 처리 시도 (예: 2023-01-05T12:37:00.450Z)
  const fallbackDate = new Date(str.replace(' ', 'T'));
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

const DashboardChart = ({ packagingData = [], batchesData = [], filterOption = 'timely' }) => {
  let labels = [];
  let goodValues = [];
  let defectValues = [];

  if (filterOption === 'nowLot') {
    // 1. 최신 LOT 추출
    const latestBatch = batchesData.length > 0 ? batchesData[batchesData.length - 1] : null;
    const latestBatchId = latestBatch ? (latestBatch.batchId || latestBatch.batch_id) : null;

    // 2. 최신 LOT 데이터 필터링
    const latestPackaging = packagingData.filter((item) => {
      if (!latestBatchId) return true;
      const itemBatchId = item.batchId || item.batch_id;
      return itemBatchId === latestBatchId;
    });

    if (latestPackaging.length > 0) {
      // 3. 날짜 문자열 커스텀 파싱 및 유효성 검사
      const validItems = latestPackaging
        .map((item) => {
          const rawDate = item.createdAt || item.created_at || item.timestamp;
          const dateObj = parseDateCustom(rawDate);
          return { ...item, dateObj };
        })
        .filter((item) => item.dateObj !== null)
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      if (validItems.length > 0) {
        const minDate = validItems[0].dateObj;
        const maxDate = validItems[validItems.length - 1].dateObj;

        // 시작 시각 (15분 단위 내림)
        const start = new Date(minDate);
        start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0);

        // 종료 시각 (15분 단위 올림)
        const end = new Date(maxDate);
        end.setMinutes(Math.ceil(end.getMinutes() / 15) * 15, 0, 0);

        // 시작시각과 종료시각이 완전히 같으면 최소 1시간(4개 슬롯) 생성
        if (start.getTime() === end.getTime()) {
          end.setMinutes(end.getMinutes() + 60);
        }

        // 4. 15분 간격 구간(슬롯) 연속 생성
        const timeMap = {};
        let current = new Date(start);

        while (current <= end) {
          const hh = String(current.getHours()).padStart(2, '0');
          const mm = String(current.getMinutes()).padStart(2, '0');
          const timeKey = `${hh}:${mm}`;

          timeMap[timeKey] = { good: 0, defect: 0 };
          current = new Date(current.getTime() + 15 * 60 * 1000); // 15분 증가
        }

        // 5. 데이터를 15분 단위 해당 슬롯에 집계
        validItems.forEach((item) => {
          const hh = String(item.dateObj.getHours()).padStart(2, '0');
          const mm = String(Math.floor(item.dateObj.getMinutes() / 15) * 15).padStart(2, '0');
          const timeKey = `${hh}:${mm}`;

          const disposition = item.finalDisposition || item.final_disposition || '';

          if (timeMap[timeKey]) {
            if (disposition.includes('ACCEPTED')) {
              timeMap[timeKey].good += 1;
            } else if (disposition.includes('REJECTED')) {
              timeMap[timeKey].defect += 1;
            }
          }
        });

        labels = Object.keys(timeMap);
        goodValues = labels.map((k) => timeMap[k].good);
        defectValues = labels.map((k) => timeMap[k].defect);
      }
    }

    // 데이터가 없거나 파싱 실패 시 기본 레이블
    if (labels.length === 0) {
      labels = ['12:00', '12:15', '12:30', '12:45', '13:00'];
      goodValues = [0, 0, 0, 0, 0];
      defectValues = [0, 0, 0, 0, 0];
    }
  } else {
    // -------------------------------------------------------------
    // 옵션 B: 최근 5개 LOT
    // -------------------------------------------------------------
    const recentBatches = batchesData.slice(-5);

    if (recentBatches.length > 0) {
      labels = recentBatches.map((batch, index) => {
        return batch.batchCode || batch.batch_code || batch.batchId || `LOT-${index + 1}`;
      });

      recentBatches.forEach((batch) => {
        const bId = batch.batchId || batch.batch_id;
        const batchPackagings = packagingData.filter(
          (item) => (item.batchId || item.batch_id) === bId
        );

        let goodCount = 0;
        let defectCount = 0;

        batchPackagings.forEach((item) => {
          const disposition = item.finalDisposition || item.final_disposition || '';
          if (disposition.includes('ACCEPTED')) {
            goodCount += 1;
          } else if (disposition.includes('REJECTED')) {
            defectCount += 1;
          }
        });

        if (goodCount === 0 && defectCount === 0) {
          const actual = Number(batch.actualUnits || batch.actual_units || 0);
          const defect = Number(batch.defectUnits || batch.defect_units || 0);
          goodCount = Math.max(0, actual - defect);
          defectCount = defect;
        }

        goodValues.push(goodCount);
        defectValues.push(defectCount);
      });
    } else {
      labels = ['LOT-1', 'LOT-2', 'LOT-3', 'LOT-4', 'LOT-5'];
      goodValues = [0, 0, 0, 0, 0];
      defectValues = [0, 0, 0, 0, 0];
    }
  }

  const data = {
    labels: labels,
    datasets: [
      {
        label: '불량 수량',
        data: defectValues,
        backgroundColor: '#bfdbfe',
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
      },
      {
        label: '양품 수량',
        data: goodValues,
        backgroundColor: '#3b82f6',
        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
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
      y: { stacked: true, grid: { color: '#f3f4f6' } },
    },
  };

  return (
    <div style={{ width: '100%', height: '350px' }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default DashboardChart;