import { useState, useEffect } from "react";
import axios from "axios";

// 생산관리 페이지에서 사용할 CSS 파일 연결
import "../css/production.css";

export default function Production(){

    // 현재 선택된 탭 저장
    // 처음 페이지에 들어오면 LOT 목록 탭을 선택
    const [tab, setTab] = useState("lot");

    // Spring에서 받아온 생산 LOT 목록 저장
    const [batches, setBatches] = useState([]);

    // 현재 페이지 번호 (Spring은 0부터 시작)
    const [currentPage, setCurrentPage] = useState(0);

    // 전체 페이지 수
    const [totalPages, setTotalPages] = useState(0);

    // 전체 검색 결과 개수
    const [totalElements, setTotalElements] = useState(0);

    // 한 페이지에 출력할 개수
    const pageSize = 10;

    // Spring에서 받아온 원료 칭량이력 저장
    const [materials, setMaterials] = useState([]);

    // 상세조회한 LOT 하나를 저장
    const [selectedBatch, setSelectedBatch] = useState(null);

    // 사용자가 선택한 생산 상태
    const [statusFilter, setStatusFilter] = useState("all");

    // 조회 버튼을 눌렀을 때 실제로 적용되는 생산 상태
    const [searchStatus, setSearchStatus] = useState("all");

    // 사용자가 선택한 조회 시작일
    const [startDate, setStartDate] = useState("");

    // 사용자가 선택한 조회 종료일
    const [endDate, setEndDate] = useState("");

    // 조회 버튼을 눌렀을 때 실제 적용할 날짜
    const [searchStartDate, setSearchStartDate] = useState("");
    const [searchEndDate, setSearchEndDate] = useState("");

    // 사용자가 선택한 제품
    const [productFilter, setProductFilter] = useState("all");

    // 조회 버튼을 눌렀을 때 실제 적용되는 제품
    const [searchProduct, setSearchProduct] = useState("all");

     // 생산 LOT 전체조회 + 조건검색 + 페이징
    const fetchBatches = (page = 0) => {
        axios
            .get("http://localhost:8080/mask/batches", {
                params: {
                    startDate: searchStartDate || null,
                    endDate: searchEndDate || null,
                    productCode:
                        searchProduct === "all"
                            ? null
                            : searchProduct,
                    status:
                        searchStatus === "all"
                            ? null
                            : searchStatus,
                    page: page,
                    size: pageSize
                }
            })
            .then((response) => {

                console.log("생산 LOT 조회 :", response.data);

                // 실제 LOT 배열
                setBatches(response.data.content);

                // 페이징 정보
                setCurrentPage(response.data.number);
                setTotalPages(response.data.totalPages);
                setTotalElements(response.data.totalElements);
            })
            .catch((error) => {
                console.log("생산 LOT 조회 실패", error);
            });
    };
        // 검색 조건이 변경되면 Spring API 다시 호출
        useEffect(() => {

            fetchBatches(0);

        }, [
            searchStartDate,
            searchEndDate,
            searchStatus,
            searchProduct
        ]);

        // LOT 개별 상세조회
        const findOneBatch = (batchId) => {
        axios
            .get(`http://localhost:8080/mask/batches/${batchId}`)
            .then((response) => {

                // 상세조회 결과 확인
                console.log(response.data);

                // 조회한 LOT 하나 저장
                setSelectedBatch(response.data);

            })
            .catch((error) => {
                console.log("LOT 상세조회 실패", error);
            });

        };

    // 원료 칭량이력 전체조회
    useEffect(() => {

    axios
        .get("http://localhost:8080/mask/material-dispensing")
        .then((response) => {

            // 받아온 원료 칭량 데이터 확인
            console.log("원료 칭량이력 :", response.data);

            // materials 배열에 저장
            setMaterials(response.data);

        })
        .catch((error) => {

            console.log("원료 칭량이력 조회 실패", error);

        });

    }, []);

    // 생산 LOT 데이터에서 제품 목록 만들기
        // productName만 가져온 후 중복 제거
        const productList = [
            ...new Set(
                batches
                    .map((batch) => batch.productName)
                    .filter((productName) => productName)
            )
        ];

    // 검색 조건에 맞는 원료 칭량이력 필터링
        const filteredMaterials = materials.filter((material) => {

        // 검색조건에 의해 남은 LOT 중
        // 현재 원료 데이터의 batchId와 같은 LOT가 있는지 확인
        return batches.some(
            (batch) => batch.batchId === material.batchId
        );

        });

    // 생산관리 페이지 전체 영역
        return(
        <div className="production-page">

                {/* =========================
                    1. 생산관리 페이지 제목
                ========================== */}
                <div className="production-header">
                    <h1>생산 관리</h1>
                    <p>생산 계획, LOT, 원료, 실적을 관리합니다.</p>
                </div>


            {/* =========================
                2. 생산 데이터 검색 조건
            ========================== */}
            <div className="production-filter">

                {/* 조회 시작일 */}
                <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                />

                <span>~</span>

                {/* 조회 종료일 */}
                <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                />

               {/* 생산 상태 선택 */}
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option value="all">전체 상태</option>
                    <option value="BATCH_STATUS_IN_PROGRESS">생산중</option>
                    <option value="BATCH_STATUS_COMPLETED">완료</option>
                    <option value="BATCH_STATUS_STOPPED">중단</option>
                </select>

                {/* 제품 선택 */}
                <select
                    value={productFilter}
                    onChange={(event) => setProductFilter(event.target.value)}
                >
                    <option value="all">전체 제품</option>

                    {/* DB에서 받아온 실제 제품 목록 출력 */}
                    {productList.map((product) => (
                    <option
                        key={product.productCode}
                        value={product.productCode}
                    >
                        {product.productName}
                    </option>
                    ))}
                </select>


                {/* 조회 버튼
                    실제 검색 기능은 추후 구현 예정 */}
                <button
                className="production-search-btn"
                onClick={() => {
                    // 선택한 생산 상태를 실제 검색 조건으로 적용
                    setSearchStatus(statusFilter);

                    // 선택한 시작일과 종료일을 실제 검색 조건으로 적용
                    setSearchStartDate(startDate);
                    setSearchEndDate(endDate);

                    // 선택한 제품 적용
                    setSearchProduct(productFilter);
                }}
            >
                조회
            </button>

            </div>
            {/* =========================
                    3. 생산관리 메뉴 탭
                ========================== */}
            <div className="production-tabs">

                {/* LOT 목록 탭 */}
                <button className={tab === "lot" ? "active" : ""}
                        onClick={() => setTab("lot")}
                >
                    LOT 목록 · 상세
                </button>

                {/* 원료 칭량이력 탭 */}
                <button className={tab === "material" ? "active" : ""}
                        onClick={() => setTab("material")}
                >
                    원료 칭량이력
                </button>

                {/* 생산 실적 탭 */}
                <button className={tab === "result" ? "active" : ""}
                        onClick={() => setTab("result")}
                >
                    생산 실적
                </button>
            </div>

                {/* =============================
                    4. 선택한 탭에 따른 내용 출력
                ============================== */}
                <div className="production-content">

                {/* ==========================
                        4-1. LOT 목록 · 상세
                    ========================== */}
                    {tab === "lot" && (
                        <div className="production-table-wrap">
                            <table className="production-table">

                                {/* 테이블 제목 */}
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>LOT 번호</th>
                                        <th>제품명</th>
                                        <th>계획 수량</th>
                                        <th>실적 수량</th>
                                        <th>진행 상태</th>
                                        <th>시작 일시</th>
                                        <th>작업자</th>
                                        <th>상세</th>
                                    </tr>
                                </thead>

                                <tbody>

                                {/* LOT 데이터가 존재하면 반복해서 출력 */}
                                    {filteredBatches.length > 0 ? (

                                    filteredBatches.map((batch, index) => (

                                    <tr key={batch.batchId}>

                                        {/* 순번 */}
                                        <td>{currentPage * pageSize + index + 1}</td>

                                        {/* LOT 번호 */}
                                        <td>{batch.batchId}</td>

                                        {/* 제품명 */}
                                        <td>{batch.productName}</td>

                                        {/* 계획 생산 수량 */}
                                        <td>{batch.targetUnits}</td>

                                        {/* 실제 생산 수량 */}
                                        <td>{batch.actualUnits}</td>

                                        {/* 진행 상태 */}
                                        <td>{batch.status}</td>

                                        {/* 시작 일시 */}
                                        <td>{batch.startTime}</td>

                                        {/* 작업자 ID */}
                                        <td>{batch.userId}</td>

                                        {/* 상세조회 버튼 */}
                                        <td>
                                            <button
                                                className="production-detail-btn"
                                                onClick={() => findOneBatch(batch.batchId)}
                                            >
                                                상세
                                            </button>
                                        </td>

                                    </tr>

                                ))

                            ) : (

                                <tr>
                                    <td
                                        colSpan="9"
                                        className="production-no-data"
                                    >
                                        조회된 생산 LOT 데이터가 없습니다.
                                    </td>
                                </tr>

                            )}

                                </tbody>
                            </table>
                            <div className="production-pagination">

                            <button
                                disabled={currentPage === 0}
                                onClick={() => fetchBatches(currentPage - 1)}
                            >
                                이전
                            </button>

                            {Array.from(
                                { length: totalPages },
                                (_, index) => (
                                    <button
                                        key={index}
                                        className={
                                            currentPage === index
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() => fetchBatches(index)}
                                    >
                                        {index + 1}
                                    </button>
                                )
                            )}

                            <button
                                disabled={
                                    totalPages === 0 ||
                                    currentPage === totalPages - 1
                                }
                                onClick={() => fetchBatches(currentPage + 1)}
                            >
                                다음
                            </button>

                        </div>
                        </div>
                    )}

                {/* =====================
                    4-2. 원료 칭량이력
                ======================= */}
                    {tab === "material" && (

                    <div className="production-table-wrap">

                        <table className="production-table">

                            <thead>

                                <tr>
                                    <th>No.</th>
                                    <th>LOT 번호</th>
                                    <th>원료 코드</th>
                                    <th>원료명</th>
                                    <th>원료 LOT</th>
                                    <th>목표량</th>
                                    <th>실제량</th>
                                    <th>검증 상태</th>
                                    <th>칭량 일시</th>
                                    <th>작업자</th>
                                </tr>

                            </thead>


                            <tbody>

                                {filteredMaterials.length > 0 ? (

                                    // 원료 칭량 데이터 반복 출력
                                    filteredMaterials.map((material, index) => (

                                        <tr key={material.dispenseId}>

                                            {/* 순번 */}
                                            <td>
                                                {index + 1}
                                            </td>

                                            {/* 생산 LOT */}
                                            <td>
                                                {material.batchId}
                                            </td>

                                            {/* 원료 코드 */}
                                            <td>
                                                {material.materialCode}
                                            </td>

                                            {/* 원료명 */}
                                            <td>
                                                {material.materialName}
                                            </td>

                                            {/* 원료 자체의 LOT 번호 */}
                                            <td>
                                                {material.rawMaterialLot}
                                            </td>

                                            {/* 목표 칭량 */}
                                            <td>
                                                {material.targetQtyKg} kg
                                            </td>

                                            {/* 실제 칭량 */}
                                            <td>
                                                {material.actualQtyKg} kg
                                            </td>

                                            {/* 검증 상태 */}
                                            <td>
                                                {material.status}
                                            </td>

                                            {/* 칭량 시간 */}
                                            <td>
                                                {material.dispensedAt}
                                            </td>

                                            {/* 작업자 */}
                                            <td>
                                                {material.userId}
                                            </td>

                                        </tr>

                                    ))

                                ) : (

                                    <tr>
                                        <td
                                            colSpan="10"
                                            className="production-no-data"
                                        >
                                            조회된 원료 칭량 데이터가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                )}

                {/* =====================
                    4-3. 생산 실적
                ====================== */}
                    {tab === "result" && (

                    <div className="production-table-wrap">

                        <table className="production-table">

                            <thead>
                                <tr>
                                    <th>No.</th>
                                    <th>LOT 번호</th>
                                    <th>목표 조제량</th>
                                    <th>실제 조제량</th>
                                    <th>생산 수량</th>
                                    <th>불량 수량</th>
                                    <th>생산 시간</th>
                                </tr>
                            </thead>


                            <tbody>

                                {/* batches 데이터가 존재하면 생산 실적 출력 */}
                                {filteredBatches.length > 0 ? (

                                    filteredBatches.map((batch, index) => (

                                        <tr key={batch.batchId}>

                                            {/* 순번 */}
                                            <td>
                                                {index + 1}
                                            </td>

                                            {/* LOT 번호 */}
                                            <td>
                                                {batch.batchId}
                                            </td>

                                            {/* 목표 조제량 */}
                                            <td>
                                                {batch.targetBulkKg} kg
                                            </td>

                                            {/* 실제 조제량 */}
                                            <td>
                                                {batch.actualBulkKg} kg
                                            </td>

                                            {/* 실제 생산 수량 */}
                                            <td>
                                                {batch.actualUnits?.toLocaleString()} 개
                                            </td>

                                            {/* 불량 수량 */}
                                            <td>
                                                {batch.defectUnits?.toLocaleString()} 개
                                            </td>

                                            {/* 생산 시간 */}
                                            <td>
                                                {batch.startTime && batch.endTime
                                                    ? `${batch.startTime} ~ ${batch.endTime}`
                                                    : "-"
                                                }
                                            </td>
                                        </tr>
                                    ))

                                ) : (

                                    /* 데이터가 없을 경우 */
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="production-no-data"
                                        >
                                            조회된 생산 실적 데이터가 없습니다.
                                        </td>
                                    </tr>

                                )}

                            </tbody>

                        </table>

                    </div>

                )}
                    </div>
            {/* ================================
                    LOT 상세조회 모달
                =============================== */}

                {selectedBatch && (

                    <div className="lot-modal-overlay">

                        {/* 상세조회 팝업 */}
                        <div className="lot-modal">

                            {/* =========================
                                    모달 상단
                            ========================== */}
                            <div className="lot-modal-header">

                                <div>
                                    <h2>LOT 상세정보</h2>
                                    <p>{selectedBatch.batchId}</p>
                                </div>

                                {/* 닫기 버튼 */}
                                <button
                                    className="lot-modal-close"
                                    onClick={() => setSelectedBatch(null)}
                                >
                                    ×
                                </button>

                            </div>


                {/* =========================
                        기본 정보
                ========================== */}
                <div className="lot-detail-section">

                    <h3>기본 정보</h3>

                    <div className="lot-detail-grid">

                        <div className="lot-detail-item">
                            <span>LOT 번호</span>
                            <strong>{selectedBatch.batchId}</strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>제품 코드</span>
                            <strong>{selectedBatch.productCode}</strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>제품명</span>
                            <strong>{selectedBatch.productName}</strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>생산 상태</span>
                            <strong>{selectedBatch.status}</strong>
                        </div>

                    </div>

                </div>


                {/* =========================
                        생산 정보
                ========================== */}
                <div className="lot-detail-section">

                    <h3>생산 정보</h3>

                    <div className="lot-detail-grid">

                        <div className="lot-detail-item">
                            <span>목표 조제량</span>
                            <strong>
                                {selectedBatch.targetBulkKg} kg
                            </strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>실제 조제량</span>
                            <strong>
                                {selectedBatch.actualBulkKg} kg
                            </strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>목표 생산수량</span>
                            <strong>
                                {selectedBatch.targetUnits?.toLocaleString()} 개
                            </strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>실제 생산수량</span>
                            <strong>
                                {selectedBatch.actualUnits?.toLocaleString()} 개
                            </strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>불량수량</span>
                            <strong>
                                {selectedBatch.defectUnits?.toLocaleString()} 개
                            </strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>사용 탱크</span>
                            <strong>{selectedBatch.tankId}</strong>
                        </div>

                    </div>

                </div>


                {/* =========================
                        작업 정보
                ========================== */}
                <div className="lot-detail-section">

                    <h3>작업 정보</h3>

                    <div className="lot-detail-grid">

                        <div className="lot-detail-item">
                            <span>작업자 ID</span>
                            <strong>{selectedBatch.userId}</strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>데이터 출처</span>
                            <strong>{selectedBatch.recordSource}</strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>시작 일시</span>
                            <strong>{selectedBatch.startTime}</strong>
                        </div>

                        <div className="lot-detail-item">
                            <span>종료 일시</span>
                            <strong>{selectedBatch.endTime}</strong>
                        </div>

                    </div>
                </div>


                    {/* =========================
                            모달 하단
                    ========================== */}
                    <div className="lot-modal-footer">

                        <button
                            onClick={() => setSelectedBatch(null)}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        )}
                    </div>
                );
            }

            