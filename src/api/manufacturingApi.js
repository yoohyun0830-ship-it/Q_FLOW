import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080"
});

// 화면에서 사용할 데이터 종류
export const dataTypes = {
    sensor: {
        title: "공정 센서 측정이력",
        path: null,
        id: "sensor_id",
        date: "timestamp",
        searchKey: "execution_id",
        searchLabel: "공정 실행번호",

        columns: [
            ["sensor_id", "측정번호"],
            ["timestamp", "측정시간"],
            ["paddle_rpm", "교반 RPM"],
            ["ph_level", "pH"],
            ["bulk_viscosity_cps", "점도(cP)"]
        ],

        fields: [
            ["sensor_id", "측정번호"],
            ["execution_id", "공정 실행번호"],
            ["timestamp", "측정시간"],
            ["paddle_rpm", "교반 RPM"],
            ["homomixer_rpm", "호모믹서 RPM"],
            ["ph_level", "pH"],
            ["bulk_viscosity_cps", "점도(cP)"],
            ["motor_torque_pct", "모터 토크(%)"],
            ["vacuum_kpa", "진공도(kPa)"],
            ["cooling_valve_pct", "냉각밸브(%)"],
            ["userId", "작업자 ID"],
            ["record_source", "데이터 출처"]
        ]
    },

    material: {
        title: "원료 칭량",
        path: "/mask/material-dispensing",
        id: "dispenseId",
        date: "dispensedAt",
        searchKey: "batchId",
        searchLabel: "LOT 번호",

        columns: [
            ["dispenseId", "칭량번호"],
            ["batchId", "LOT 번호"],
            ["materialName", "원료명"],
            ["actualQtyKg", "실제량(kg)"],
            ["dispensedAt", "칭량시간"],
            ["status", "상태"]
        ],

        fields: [
            ["dispenseId", "칭량번호"],
            ["batchId", "LOT 번호"],
            ["materialCode", "원료코드"],
            ["materialName", "원료명"],
            ["rawMaterialLot", "원료 LOT"],
            ["targetQtyKg", "목표량(kg)"],
            ["actualQtyKg", "실제량(kg)"],
            ["dispensedAt", "칭량시간"],
            ["status", "상태"],
            ["userId", "작업자 ID"]
        ]
    },

    process: {
        title: "공정 실행",
        path: null,
        id: "execution_id",
        date: "start_time",
        searchKey: "batchId",
        searchLabel: "LOT 번호",

        columns: [
            ["execution_id", "공정 실행번호"],
            ["batchId", "LOT 번호"],
            ["process_code", "공정"],
            ["start_time", "시작시간"],
            ["end_time", "종료시간"],
            ["status", "상태"]
        ],

        fields: [
            ["execution_id", "공정 실행번호"],
            ["batchId", "LOT 번호"],
            ["process_code", "공정"],
            ["start_time", "시작시간"],
            ["end_time", "종료시간"],
            ["duration_min", "소요시간(분)"],
            ["status", "상태"],
            ["record_source", "데이터 출처"]
        ]
    },

    bulk: {
        title: "벌크 검사",
        path: "/mask/bulk-qc",
        id: "qc_id",
        date: "sample_time",
        searchKey: "batchId",
        searchLabel: "LOT 번호",

        columns: [
            ["qc_id", "검사번호"],
            ["sample_time", "검사시간"],
            ["batchId", "LOT 번호"],
            ["ph_measured", "pH"],
            ["viscosity_measured", "점도(cP)"],
            ["overall_qc_result", "검사결과"]
        ],

        fields: [
            ["qc_id", "검사번호"],
            ["batchId", "LOT 번호"],
            ["sample_time", "검사시간"],
            ["userId", "작업자 ID"],
            ["ph_measured", "측정 pH"],
            ["ph_criteria", "pH 합격범위"],
            ["viscosity_measured", "측정 점도"],
            ["viscosity_criteria", "점도 합격범위"],
            ["specific_gravity", "비중"],
            ["sg_criteria", "비중 합격범위"],
            ["appearance_code", "외관"],
            ["microbubble_code", "미세기포"],
            ["microbial_cfu", "미생물(CFU)"],
            ["overall_qc_result", "종합결과"],
            ["qc_notes_code", "검사 비고"]
        ]
    },

    filling: {
        title: "충진·포장",
        path: "/mask/filling-packagings",
        id: "pouch_id",
        date: "timestamp",
        searchKey: "batchId",
        searchLabel: "LOT 번호",

        columns: [
            ["pouch_id", "제품번호"],
            ["batchId", "LOT 번호"],
            ["timestamp", "검사시간"],
            ["packaging_line", "포장라인"],
            ["essence_net_weight_g", "에센스 중량(g)"],
            ["final_disposition", "최종 판정"]
        ],

        fields: [
            ["pouch_id", "제품번호"],
            ["batchId", "LOT 번호"],
            ["timestamp", "검사시간"],
            ["packaging_line", "포장라인"],
            ["sheet_material_code", "시트 자재코드"],
            ["sheet_lot_no", "시트 LOT"],
            ["sheet_dry_weight_g", "시트 중량(g)"],
            ["fill_weight_1st_g", "1차 충진량(g)"],
            ["fill_weight_2nd_g", "2차 충진량(g)"],
            ["essence_net_weight_g", "에센스 순중량(g)"],
            ["pouch_tare_weight_g", "파우치 중량(g)"],
            ["gross_total_weight_g", "완제품 총중량(g)"],
            ["upper_seal_temp_c", "상부 실링온도(℃)"],
            ["lower_seal_temp_c", "하부 실링온도(℃)"],
            ["seal_pressure_bar", "실링압력(bar)"],
            ["n2_residual_o2_pct", "잔존 산소비율(%)"],
            ["checkweigher_status", "중량검사"],
            ["metal_detector_status", "금속검사"],
            ["vision_inspection_status", "비전검사"],
            ["final_disposition", "최종 판정"],
            ["userId", "작업자 ID"]
        ]
    },

    anomaly: {
        title: "이상 발생",
        path: "/mask/anomaly-events",
        id: "anomalyId",
        date: "occurredAt",
        searchKey: "batchId",
        searchLabel: "LOT 번호",

        columns: [
            ["anomalyId", "알람번호"],
            ["occurredAt", "발생시간"],
            ["processCode", "공정"],
            ["sensorName", "측정항목"],
            ["severity", "심각도"],
            ["actionStatus", "조치상태"]
        ],

        fields: [
            ["anomalyId", "알람번호"],
            ["batchId", "LOT 번호"],
            ["occurredAt", "발생시간"],
            ["processCode", "공정"],
            ["sensorName", "측정항목"],
            ["measuredValue", "측정값"],
            ["severity", "심각도"],
            ["alarmMessage", "알람 메시지"],
            ["actionStatus", "조치상태"],
            ["actionNote", "조치내용"],
            ["actionTime", "조치시간"],
            ["userId", "작업자 ID"]
        ]
    },

    changes: {
        title: "데이터 변경이력",
        path: "/api/data-change-logs",
        id: "change_id",
        date: "changed_at",
        searchKey: "record_id",
        searchLabel: "데이터번호",

        columns: [
            ["change_id", "변경번호"],
            ["changed_at", "변경시간"],
            ["table_name", "테이블"],
            ["column_name", "변경항목"],
            ["change_type", "변경유형"],
            ["userId", "작업자 ID"]
        ],

        fields: [
            ["change_id", "변경번호"],
            ["table_name", "테이블"],
            ["record_id", "데이터번호"],
            ["column_name", "변경항목"],
            ["change_type", "변경유형"],
            ["userId", "작업자 ID"],
            ["changed_at", "변경시간"]
        ]
    }
};

// 화면 표시값
export function showValue(key, value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    const dateFields = [
        "timestamp",
        "dispensedAt",
        "sample_time",
        "start_time",
        "end_time",
        "occurredAt",
        "actionTime",
        "changed_at",
        "startTime",
        "endTime"
    ];

    if (dateFields.includes(key)) {
        return String(value).replace("T", " ").slice(0, 19);
    }

    return String(value);
}

// 오류 메시지
export function requestError(error) {
    if (error.response) {
        return `조회 실패: HTTP ${error.response.status}`;
    }

    if (error.isAxiosError) {
        return "Spring 서버 주소와 실행 상태, CORS 설정을 확인해 주세요.";
    }

    return error.message || "조회 중 오류가 발생했습니다.";
}

// 목록조회
// 벌크 검사도 페이지 객체가 아닌 배열을 받음
export async function loadRecords(config, signal, batchId = "") {
    if (!config.path) {
        throw new Error(
            "이 데이터의 조회 API가 아직 연결되지 않았습니다."
        );
    }

    const params = {};

    // LOT별 이력 화면에서 벌크 검사 조회 시
    // batchId 조건을 서버에 전달
    if (
        config.path === "/mask/bulk-qc" &&
        batchId.trim()
    ) {
        params.batchId = batchId.trim();
    }

    const response = await api.get(config.path, {
        signal,
        params
    });

    if (!Array.isArray(response.data)) {
        throw new Error(
            "목록조회 API가 배열을 반환하는지 확인해 주세요."
        );
    }

    return response.data;
}

// PK 개별조회
export async function loadRecord(config, id, signal) {
    const response = await api.get(
        `${config.path}/${encodeURIComponent(id)}`,
        { signal }
    );

    if (!response.data || response.data[config.id] == null) {
        throw new Error(
            "PK 개별조회 응답을 확인해 주세요."
        );
    }

    return response.data;
}

// LOT 기본정보 조회
export async function loadLot(batchId, signal) {
    const response = await api.get(
        `/mask/batches/${encodeURIComponent(batchId)}`,
        { signal }
    );

    if (!response.data || !response.data.batchId) {
        throw new Error(
            "LOT 개별조회 응답을 확인해 주세요."
        );
    }

    return response.data;
}