import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080"
});

// 화면에서 사용할 데이터 종류
export const dataTypes = {
    sensor: {
        title: "공정 센서 측정이력",
        path: "/mask/sensor-telemetries",
        id: "sensor_id",
        date: "timestamp",
        searchKey: "execution_id",
        searchLabel: "공정 실행번호",
        serverPaging: true,

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
        serverPaging: true,

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
        path: "/mask/process-executions",
        id: "execution_id",
        date: "start_time",
        searchKey: "batchId",
        searchLabel: "LOT 번호",
        serverPaging: true,

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
        serverPaging: true,

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
        serverPaging: true,

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

        // 이상 발생도 서버 검색·페이징으로 연결
        serverPaging: true,

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
        path: "/mask/data-change-logs",
        id: "change_id",
        date: "changed_at",
        searchKey: "record_id",
        searchLabel: "데이터번호",
        serverPaging: true,

        columns: [
            ["change_id", "변경번호"],
            ["changed_at", "변경시간"],
            ["table_name", "테이블"],
            ["record_id", "데이터번호"],
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
    if (error.response?.status === 400) {
        return "검색조건과 페이지 번호를 확인해 주세요.";
    }

    if (error.response?.status === 404) {
        return "요청한 주소 또는 데이터를 찾을 수 없습니다.";
    }

    if (error.response) {
        return `조회 실패: HTTP ${error.response.status}`;
    }

    if (error.isAxiosError) {
        return "Spring 서버 주소와 실행 상태, CORS 설정을 확인해 주세요.";
    }

    return error.message || "조회 중 오류가 발생했습니다.";
}

// 원료 칭량: 전체조회 + 조건검색 + 서버 페이징
export async function loadMaterialPage(
    conditions = {},
    page = 0,
    signal
) {
    if (!Number.isInteger(page) || page < 0) {
        throw new Error("페이지 번호는 0 이상의 정수여야 합니다.");
    }

    const params = { page };

    const conditionNames = [
        "startDate",
        "endDate",
        "batchId",
        "materialCode",
        "materialName",
        "rawMaterialLot",
        "status",
        "userId"
    ];

    for (const name of conditionNames) {
        let value = conditions[name];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (value === "" || value === null || value === undefined) {
            continue;
        }

        if (name === "userId") {
            const userId = Number(value);

            if (
                !Number.isInteger(userId) ||
                userId < 1 ||
                userId > 2147483647
            ) {
                throw new Error(
                    "담당자 번호는 1~2147483647 사이의 정수로 입력해 주세요."
                );
            }

            params.userId = userId;
        } else {
            params[name] = value;
        }
    }

    if (
        params.startDate &&
        params.endDate &&
        params.startDate > params.endDate
    ) {
        throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
    }

    const response = await api.get(dataTypes.material.path, {
        signal,
        params
    });

    const data = response.data;

    if (
        !Array.isArray(data?.content) ||
        !Number.isInteger(data.page) ||
        data.page !== page ||
        data.size !== 20 ||
        !Number.isInteger(data.totalElements) ||
        data.totalElements < 0 ||
        !Number.isInteger(data.totalPages) ||
        data.totalPages < 0
    ) {
        throw new Error("원료 칭량 API의 페이지 응답을 확인해 주세요.");
    }

    return data;
}

// 공정 실행: 전체조회 + 조건검색 + 서버 페이징
export async function loadProcessPage(
    conditions = {},
    page = 0,
    signal
) {
    if (!Number.isInteger(page) || page < 0) {
        throw new Error("페이지 번호는 0 이상의 정수여야 합니다.");
    }

    const params = { page };

    const conditionNames = [
        "startDate",
        "endDate",
        "batchId",
        "processCode",
        "status"
    ];

    for (const name of conditionNames) {
        let value = conditions[name];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (value === "" || value === null || value === undefined) {
            continue;
        }

        params[name] = value;
    }

    if (
        params.startDate &&
        params.endDate &&
        params.startDate > params.endDate
    ) {
        throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
    }

    const response = await api.get(dataTypes.process.path, {
        signal,
        params
    });

    const data = response.data;

    if (
        !Array.isArray(data?.content) ||
        !Number.isInteger(data.page) ||
        data.page !== page ||
        data.size !== 20 ||
        !Number.isInteger(data.totalElements) ||
        data.totalElements < 0 ||
        !Number.isInteger(data.totalPages) ||
        data.totalPages < 0
    ) {
        throw new Error("공정 실행 API의 페이지 응답을 확인해 주세요.");
    }

    return data;
}

// 센서 측정이력: 전체조회 + 조건검색 + 서버 페이징
export async function loadSensorPage(
    conditions = {},
    page = 0,
    signal
) {
    if (!Number.isInteger(page) || page < 0) {
        throw new Error("페이지 번호는 0 이상의 정수여야 합니다.");
    }

    const params = { page };

    const conditionNames = [
        "startAt",
        "endAt",
        "batchId",
        "executionId",
        "processCode",
        "userId"
    ];

    for (const name of conditionNames) {
        let value = conditions[name];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (value === "" || value === null || value === undefined) {
            continue;
        }

        if (name === "userId") {
            const userId = Number(value);

            if (
                !Number.isInteger(userId) ||
                userId < 1 ||
                userId > 2147483647
            ) {
                throw new Error(
                    "담당자 번호는 1~2147483647 사이의 정수로 입력해 주세요."
                );
            }

            params.userId = userId;
        } else if (name === "executionId") {
            const executionId = String(value);

            if (
                !/^\d+$/.test(executionId) ||
                BigInt(executionId) < 1n ||
                BigInt(executionId) > 9223372036854775807n
            ) {
                throw new Error(
                    "공정 실행번호는 유효한 양의 정수로 입력해 주세요."
                );
            }

            params.executionId = executionId;
        } else {
            params[name] = value;
        }
    }

    const startTime = params.startAt
        ? new Date(params.startAt).getTime()
        : null;

    const endTime = params.endAt
        ? new Date(params.endAt).getTime()
        : null;

    if (
        (startTime !== null && Number.isNaN(startTime)) ||
        (endTime !== null && Number.isNaN(endTime))
    ) {
        throw new Error("측정 시작·종료 일시를 확인해 주세요.");
    }

    if (
        startTime !== null &&
        endTime !== null &&
        startTime > endTime
    ) {
        throw new Error("시작시간은 종료시간보다 늦을 수 없습니다.");
    }

    const response = await api.get(dataTypes.sensor.path, {
        signal,
        params
    });

    const data = response.data;

    if (
        !Array.isArray(data?.content) ||
        !Number.isInteger(data.page) ||
        data.page !== page ||
        data.size !== 20 ||
        !Number.isInteger(data.totalElements) ||
        data.totalElements < 0 ||
        !Number.isInteger(data.totalPages) ||
        data.totalPages < 0
    ) {
        throw new Error("센서 측정이력 API의 페이지 응답을 확인해 주세요.");
    }

    return data;
}

// 벌크 검사: 전체조회 + 조건검색 + 서버 페이징
export async function loadBulkPage(
    conditions = {},
    page = 0,
    signal
) {
    if (!Number.isInteger(page) || page < 0) {
        throw new Error("페이지 번호는 0 이상의 정수여야 합니다.");
    }

    const params = { page };

    const conditionNames = [
        "startDate",
        "endDate",
        "batchId",
        "overallQcResult",
        "userId"
    ];

    for (const name of conditionNames) {
        let value = conditions[name];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (value === "" || value === null || value === undefined) {
            continue;
        }

        if (name === "userId") {
            const userId = Number(value);

            if (
                !Number.isInteger(userId) ||
                userId < 1 ||
                userId > 2147483647
            ) {
                throw new Error(
                    "담당자 번호는 1~2147483647 사이의 정수로 입력해 주세요."
                );
            }

            params.userId = userId;
        } else {
            params[name] = value;
        }
    }

    if (
        params.startDate &&
        params.endDate &&
        params.startDate > params.endDate
    ) {
        throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
    }

    const response = await api.get(dataTypes.bulk.path, {
        signal,
        params
    });

    const data = response.data;

    if (
        !Array.isArray(data?.content) ||
        !Number.isInteger(data.page) ||
        data.page !== page ||
        data.size !== 20 ||
        !Number.isInteger(data.totalElements) ||
        data.totalElements < 0 ||
        !Number.isInteger(data.totalPages) ||
        data.totalPages < 0
    ) {
        throw new Error("벌크 검사 API의 페이지 응답을 확인해 주세요.");
    }

    return data;
}

// 충진·포장: 전체조회 + 조건검색 + 서버 페이징
export async function loadFillingPage(
    conditions = {},
    page = 0,
    signal
) {
    if (!Number.isInteger(page) || page < 0) {
        throw new Error("페이지 번호는 0 이상의 정수여야 합니다.");
    }

    const params = { page };

    const conditionNames = [
        "startDate",
        "endDate",
        "batchId",
        "packagingLine",
        "finalDisposition",
        "checkweigherStatus",
        "metalDetectorStatus",
        "visionInspectionStatus",
        "userId"
    ];

    for (const name of conditionNames) {
        let value = conditions[name];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (value === "" || value === null || value === undefined) {
            continue;
        }

        if (name === "userId") {
            const userId = Number(value);

            if (
                !Number.isInteger(userId) ||
                userId < 1 ||
                userId > 2147483647
            ) {
                throw new Error(
                    "담당자 번호는 1~2147483647 사이의 정수로 입력해 주세요."
                );
            }

            params.userId = userId;
        } else {
            params[name] = value;
        }
    }

    if (
        params.startDate &&
        params.endDate &&
        params.startDate > params.endDate
    ) {
        throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
    }

    const response = await api.get(dataTypes.filling.path, {
        signal,
        params
    });

    const data = response.data;

    if (
        !Array.isArray(data?.content) ||
        !Number.isInteger(data.page) ||
        data.page !== page ||
        data.size !== 20 ||
        !Number.isInteger(data.totalElements) ||
        data.totalElements < 0 ||
        !Number.isInteger(data.totalPages) ||
        data.totalPages < 0
    ) {
        throw new Error("충진·포장 API의 페이지 응답을 확인해 주세요.");
    }

    return data;
}

// 데이터 변경이력: 전체조회 + 조건검색 + 서버 페이징
export async function loadChangeLogPage(
    conditions = {},
    page = 0,
    signal
) {
    if (!Number.isInteger(page) || page < 0) {
        throw new Error("페이지 번호는 0 이상의 정수여야 합니다.");
    }

    const params = { page };

    const conditionNames = [
        "startDate",
        "endDate",
        "tableName",
        "recordId",
        "recordIdKeyword",
        "columnName",
        "changeType",
        "userId"
    ];

    for (const name of conditionNames) {
        let value = conditions[name];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (value === "" || value === null || value === undefined) {
            continue;
        }

        if (name === "userId") {
            const userId = Number(value);

            if (
                !Number.isInteger(userId) ||
                userId < 1 ||
                userId > 2147483647
            ) {
                throw new Error(
                    "작업자 번호는 1~2147483647 사이의 정수로 입력해 주세요."
                );
            }

            params.userId = userId;
        } else if (name === "changeType") {
            const changeType = String(value).toUpperCase();

            if (!["INSERT", "UPDATE", "DELETE"].includes(changeType)) {
                throw new Error(
                    "변경 유형은 INSERT, UPDATE, DELETE 중 하나여야 합니다."
                );
            }

            params.changeType = changeType;
        } else {
            params[name] = value;
        }
    }

    if (
        params.startDate &&
        params.endDate &&
        params.startDate > params.endDate
    ) {
        throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
    }

    const response = await api.get(dataTypes.changes.path, {
        signal,
        params
    });

    const data = response.data;

    if (
        !Array.isArray(data?.content) ||
        !Number.isInteger(data.page) ||
        data.page !== page ||
        data.size !== 20 ||
        !Number.isInteger(data.totalElements) ||
        data.totalElements < 0 ||
        !Number.isInteger(data.totalPages) ||
        data.totalPages < 0
    ) {
        throw new Error(
            "데이터 변경이력 API의 페이지 응답을 확인해 주세요."
        );
    }

    return data;
}

// 이상 발생: 전체조회 + 조건검색 + 서버 페이징
export async function loadAnomalyPage(
    conditions = {},
    page = 0,
    signal
) {
    // 페이지 번호 확인
    if (!Number.isInteger(page) || page < 0) {
        throw new Error("페이지 번호는 0 이상의 정수여야 합니다.");
    }

    // 한 페이지당 개수는 Spring에서 20으로 고정
    const params = { page };

    // Anomaly_event_SearchDto의 필드명
    const conditionNames = [
        "startDate",
        "endDate",
        "severity",
        "actionStatus",
        "batchId",
        "batchIdKeyword",
        "processCode",
        "anomalyType",
        "userId"
    ];

    // 입력한 조건만 전달
    for (const name of conditionNames) {
        let value = conditions[name];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (value === "" || value === null || value === undefined) {
            continue;
        }

        if (name === "userId") {
            const userId = Number(value);

            if (
                !Number.isInteger(userId) ||
                userId < 1 ||
                userId > 2147483647
            ) {
                throw new Error(
                    "조치 담당자 번호는 1~2147483647 사이의 정수로 입력해 주세요."
                );
            }

            params.userId = userId;
        } else {
            params[name] = value;
        }
    }

    // 발생기간 확인
    if (
        params.startDate &&
        params.endDate &&
        params.startDate > params.endDate
    ) {
        throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
    }

    // batchId: 정확히 일치
    // batchIdKeyword: 부분 일치
    const response = await api.get(dataTypes.anomaly.path, {
        signal,
        params
    });

    const data = response.data;

    // Page_response 응답 확인
    if (
        !Array.isArray(data?.content) ||
        !Number.isInteger(data.page) ||
        data.page !== page ||
        data.size !== 20 ||
        !Number.isInteger(data.totalElements) ||
        data.totalElements < 0 ||
        !Number.isInteger(data.totalPages) ||
        data.totalPages < 0
    ) {
        throw new Error(
            "이상 발생 API의 페이지 응답을 확인해 주세요."
        );
    }

    return data;
}

// 기존 배열 조회 함수
// 이전 컴포넌트의 import가 깨지지 않도록 유지
// serverPaging 테이블은 각각의 load○○Page()로 조회
export async function loadRecords(
    config,
    signal,
    batchId = ""
) {
    if (!config.path) {
        throw new Error(
            "이 데이터의 조회 API가 아직 연결되지 않았습니다."
        );
    }

    if (config.serverPaging) {
        throw new Error(
            "이 데이터는 해당 테이블의 페이지 조회 함수로 연결해 주세요."
        );
    }

    const params = {};

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
            "이 목록은 배열 응답을 사용하고 있습니다. " +
            "백엔드가 페이지 응답으로 변경됐다면 화면도 함께 수정해야 합니다."
        );
    }

    return response.data;
}

// PK 개별조회
export async function loadRecord(config, id, signal) {
    if (!config.path) {
        throw new Error(
            "이 데이터의 상세조회 API가 아직 연결되지 않았습니다."
        );
    }

    const response = await api.get(
        `${config.path}/${encodeURIComponent(id)}`,
        { signal }
    );

    if (
        !response.data ||
        response.data[config.id] == null
    ) {
        throw new Error(
            "해당 데이터가 없거나 PK 개별조회 응답이 올바르지 않습니다."
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
        throw new Error("LOT 개별조회 응답을 확인해 주세요.");
    }

    return response.data;
}