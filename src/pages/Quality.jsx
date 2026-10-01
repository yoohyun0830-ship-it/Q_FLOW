import { useState, useEffect } from "react";

// 품질관리 css 연결
import "../css/quality.css";
import axios from "axios";

export default function Quality(){
    
    // 현재 선택된 품질관리 탭
    const [tab, setTab] = useState("bulk");

    // Spring에서 받아온 벌크 품질검사 데이터 저장
    const [bulkQc, setBulkQc] = useState([]);

    // Spring에서 받아온 완제품 품질검사 데이터 저장
    const [finishedQc, setFinishedQc] = useState([]);

    // 완제품 품질검사 검색 결과
    const [filteredFinishedQc, setFilteredFinishedQc] = useState([]);

    // 완제품 검사 현재 페이지
    const [finishedPage, setFinishedPage] = useState(1);

    // 한 페이지에 보여줄 데이터 개수
    const finishedPageSize = 20;

    // 상세조회에서 선택한 벌크 품질검사 데이터
    const [selectedBulkQc, setSelectedBulkQc] = useState(null);

    // 품질검사 검색 조건
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedLot, setSelectLot] = useState("");
    const [selectedResult, setSelectedResult] = useState("");

    // 검색결과로 화면에 출력할 벌크 품질검사 데이터
    const [filteredBulkQc, setFilteredBulQc] = useState([]);

    // 벌크 품질검사 전체조회
    useEffect(() => {
        axios
            .get("http://localhost:8080/mask/bulk-qc")
            .then((response) =>{
                console.log("벌크 품질검사:" , response.data)
                setBulkQc(response.data);
                setFilteredBulQc(response.data);
            })    
            .catch((error)=>{
                console.log("벌크 품질검사 조회 실패" , error);
            });
    },[]);

    // 완제품 품질검사 전체조회
    useEffect(() => {
        axios
            .get("http://localhost:8080/mask/filling-packagings")
            .then((response) =>{
                console.log("완제품 품질검사:" , response.data);
                setFinishedQc(response.data);
                setFilteredFinishedQc(response.data);
            })
            .catch((error)=>{
                console.log("완제품 품질덤사 조회 실페" , error);
            });
    },[]);

    // 완제품 검사 페이지네이션
    // 전체 페이지 수
    const finishedTotalPages = Math.ceil(
    filteredFinishedQc.length / finishedPageSize
    );

    // 현재 페이지 시작 위치
    const finishedStartIndex =
    (finishedPage - 1) * finishedPageSize;

    // 현재 페이지에서 보여줄 데이터 20개
    const currentFinishedQc = filteredFinishedQc.slice(
    finishedStartIndex,
    finishedStartIndex + finishedPageSize
);
    
    // 벌크 품질검사 검색
    const searchBulQc = () => {
        const result = bulkQc.filter((qc)=>{
            
            // LOT 조건
            const lotMatch = selectedLot === "" ||
            qc.batchId === selectedLot;

            // 검사 결과 조건
            const resultMatch = selectedResult === "" ||
            qc.overall_qc_result === selectedResult;

            // 검사일자
            const qcDate = qc.sample_time?
            qc.sample_time.substring(0,10) : "";

            // 시작일 조건
            const startMatch = startDate === "" ||
            qcDate >= startDate;

            // 종료일 조건
            const endMatch = endDate === "" ||
            qcDate <= endDate;

            return(
                lotMatch &&
                resultMatch &&
                startMatch &&
                endMatch
            );
        });

        setFilteredBulQc(result);
    };

    // 완제품 품질검사 검색
    const searchFinishedQc = () => {

        const result = finishedQc.filter((item) => {

            // LOT 조건
            const lotMatch =
                selectedLot === "" ||
                item.batchId === selectedLot;

            // 검사 결과 조건
            const resultMatch =
                selectedResult === "" ||
                item.final_disposition === selectedResult;

            // 검사일자
            const finishedDate = item.timestamp
                ? item.timestamp.substring(0, 10)
                : "";

            // 시작일 조건
            const startMatch =
                startDate === "" ||
                finishedDate >= startDate;

            // 종료일 조건
            const endMatch =
                endDate === "" ||
                finishedDate <= endDate;

            return (
                lotMatch &&
                resultMatch &&
                startMatch &&
                endMatch
            );
        });

        setFilteredFinishedQc(result);

        // 검색하면 1페이지부터 보여주기
        setFinishedPage(1);
    };

    return(
        <>
        {/*============================
            1. 품질관리 페이지 제목 
        ================================*/}
        <div className="quality-page">

            <div className="quality-header">
                <h1>품질 관리</h1>
                <p>벌크부터 완제품까지, 품질을 관리합니다</p>
            </div>

         {/*============================
             2. 품질검사 조회 조건 
        ================================*/}
        <div className="quality-filter">

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

            {/* LOT선택 */}
            <select
                value={selectedLot}
                onChange={(event)=> setSelectLot(event.target.value)}
            >
                <option value=""> 전체 LOT</option>
                {bulkQc.map((qc)=>(
                    <option 
                        key={qc.qc_id}
                        value={qc.batchId}
                    >
                        {qc.batchId}
                    </option>
                ))}
            </select>

            {/* 검사 결과 선택 */}
            <select
                value={selectedResult}
                onChange={(event) => setSelectedResult(event.target.value)}
            >
                <option value="">전체결과</option>
                {tab === "bulk" ? (<>
                <option value="QC_RESULT_PASS">합격</option>
                <option value="QC_RESULT_FAIL">불합격</option>
                </>):(<>
                <option value="DISP_ACCEPTED">합격</option>
                <option value="DISP_REJECTED">불합격</option>
                </>)}
                
            </select>
            
            { /* 조회버튼 */}
            <button className="quality-search-btn"
                    onClick={() => {
                        if (tab === "bulk") { searchBulQc();
                        } else { searchFinishedQc();}
                    }}
            >
                조회
            </button>
        </div>

         {/*============================
                3. 품질관리 탭 
        ================================*/}
        <div className="quality-tabs">

            {/* 벌크 품질검사 */}
            <button className={tab === "bulk" ? "active" : ""}
                    onClick={()=>setTab("bulk")}
            >
                벌크 검사
            </button>
            
            {/* 완제품 품질검사 */}
            <button className={tab === "finished" ? "active" : ""}
                    onClick={()=>setTab("finished")}
            >
                완제품 검사
            </button>
        </div>

         {/*============================
                4. 품질관리 내용
        ================================*/}
        <div className="quality-content">

        {/*============================
                4-1. 벌크 품질검사 
        ================================*/}
        {tab === "bulk" && (
            <div className="quality-table-wrap">
                <table className="quality-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>LOT 번호</th>
                            <th>pH</th>
                            <th>점도</th>
                            <th>비중</th>
                            <th>외관</th>
                            <th>미세기포</th>
                            <th>미생물</th>
                            <th>검사 결과</th>
                            <th>상세</th>
                        </tr>
                    </thead>
                    <tbody>

                        {/* 벌크 품질검사 데이터가 존재하면 출력 */}
                        {filteredBulkQc.length>0?(
                          filteredBulkQc.map((qc, index) => (
                                <tr key={qc.qc_id}>
                                    {/* 순번 */}
                                    <td>{index + 1}</td>

                                    {/* LOT 번호 */}
                                    <td>{qc.batchId}</td>

                                    {/* pH */}
                                    <td>{qc.ph_measured}</td>

                                    {/* 점도 */}
                                    <td>{qc.viscosity_measured}</td>

                                    {/* 비중 */}
                                    <td>{qc.specific_gravity}</td>

                                    {/* 외관 */}
                                    <td>
                                        {qc.appearance_code === "APP_PASS_PALEBLUE"
                                            ? "적합"
                                            : qc.appearance_code}
                                    </td>

                                    {/* 미세기포 */}
                                    <td>
                                        {qc.microbubble_code === "BUBBLE_PASS_ZERO"
                                            ? "없음"
                                            : qc.microbubble_code}
                                    </td>

                                    {/* 미생물 */}
                                    <td>{qc.microbial_cfu} CFU</td>

                                    {/* 최종 검사 결과 */}
                                    <td>
                                        <span className=
                                        {qc.overall_qc_result === "QC_RESULT_PASS"
                                            ? "quality-result-pass"
                                            : qc.overall_qc_result === "QC_RESULT_FAIL"
                                            ? "quality-result-fail"
                                            : ""}
                                            >
                                                {qc.overall_qc_result === "QC_RESULT_PASS"
                                                    ? "합격"
                                                    : qc.overall_qc_result === "QC_RESULT_FAIL"
                                                    ? "불합격"
                                                    : qc.overall_qc_result} 
                                        </span>
                                    </td>
                                    {/* 상세조회 */}
                                    <td>
                                        <button
                                            className="quality-detail-btn"
                                            onClick={() => setSelectedBulkQc(qc)}
                                        >
                                            상세
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td 
                                    colSpan="10"
                                    className="quality-no-data"
                                >조회된 벌크검사 데이터가 없습니다.
                                </td>
                            </tr>
                        )}
                        
                    </tbody>
                </table>
            </div>
        )}

        {/*============================
                4-2. 완제품 품질검사 
        ================================*/}
        {tab === "finished" && (
            <div className="quality-table-wrap">
                <table className="quality-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>LOT 번호</th>
                            <th>제품 ID</th>
                            <th>충진량(g)</th>
                            <th>상부 실링온도(℃)</th>
                            <th>하부 실링온도(℃)</th>
                            <th>실링 압력(bar)</th>
                            <th>중량 검사</th>
                            <th>금속 검사</th>
                            <th>비전 검사</th>
                            <th>검사 결과</th>
                        </tr>
                    </thead>
                    <tbody>
                        {finishedQc.length > 0? (
                            currentFinishedQc.map((item, index)=>(
                                <tr key={item.pouch_id}>

                                    {/* 순번 */}
                                    <td>{finishedStartIndex + index + 1}</td>

                                    {/* LOT번호 */}
                                    <td>{item.batchId}</td>

                                    {/* 제품ID */}
                                    <td>{item.pouch_id}</td>

                                    {/* 충진량 */}
                                    <td>{item.essence_net_weight_g}</td>

                                    {/* 상부 실링온도 */}
                                    <td>{item.upper_seal_temp_c}</td>

                                    {/* 하부 실링온도 */}
                                    <td>{item.lower_seal_temp_c}</td>

                                    {/* 실링압력 */}
                                    <td>{item.seal_pressure_bar}</td>

                                    {/* 중량 검사 */}
                                    <td>{item.checkweigher_status}</td>

                                    {/* 금속 검사 */}
                                    <td>{item.metal_detector_status}</td>

                                    {/* 비전 검사 */}
                                    <td>{item.vision_inspection_status}</td>

                                    {/* 최종 검사 결과 */}
                                    <td>{item.final_disposition}</td>
                                </tr>
                                ))
                            ):(
                                <tr>
                                    <td
                                        colSpan="11"
                                        className="quality-no-data"
                                    >
                                        조회된 완제품 품질검사 데이터가 없습니다.
                                    </td>
                                </tr>
                            )}
                    </tbody>
                </table>
                
                {/* 완제품 검사 페이지네이션 */}
                {finishedTotalPages > 1 && (
                    <div className="quality-pagination">

                        {/* 이전 */}
                        <button
                            onClick={() =>
                                setFinishedPage((prev) => prev - 1)
                            }
                            disabled={finishedPage === 1}
                        >
                            이전
                        </button>

                        {/* 현재 페이지 */}
                        <span>
                            {finishedPage} / {finishedTotalPages}
                        </span>

                        {/* 다음 */}
                        <button
                            onClick={() =>
                                setFinishedPage((prev) => prev + 1)
                            }
                            disabled={finishedPage === finishedTotalPages}
                        >
                            다음
                        </button>

                    </div>
                )}
                </div>)}
            </div>
            
        </div>
            {/* ========================================
                    5. 벌크 품질검사 상세조회 모달
            ======================================== */}
            {selectedBulkQc && (
                <div className="quality-modal-overlay">

                    <div className="quality-modal">

                        {/* 모달 상단 */}
                        <div className="quality-modal-header">

                            <div>
                                <h2>벌크 품질검사 상세</h2>
                                <p>{selectedBulkQc.batchId}</p>
                            </div>

                            <button
                                className="quality-modal-close"
                                onClick={() => setSelectedBulkQc(null)}
                            >
                                ×
                            </button>

                        </div>

                        {/* 검사 기본정보 */}
                        <div className="quality-detail-section">
                            <h3>검사 정보</h3>

                            <div className="quality-detail-grid">
                                <div className="quality-detail-item">
                                    <span>QC 번호</span>
                                    <strong>{selectedBulkQc.qc_id}</strong>
                                </div>

                                <div className="quality-detail-item">
                                    <span>LOT 번호</span>
                                    <strong>{selectedBulkQc.batchId}</strong>
                                </div>

                                <div className="quality-detail-item">
                                    <span>검사 시간</span>
                                    <strong>
                                        {selectedBulkQc.sample_time
                                            ? selectedBulkQc.sample_time.replace("T", " ")
                                            : "-"}
                                    </strong>
                                </div>

                                <div className="quality-detail-item">
                                    <span>검사자</span>
                                    <strong>
                                        {selectedBulkQc.userId ?? "-"}
                                    </strong>
                                </div>

                            </div>

                        </div>

                        {/* 주요 품질 측정값 */}
                        <div className="quality-detail-section">
                            <h3>품질 측정 결과</h3>

                            <div className="quality-detail-grid">

                                {/* pH */}
                                <div className="quality-detail-item">
                                    <span>pH</span>

                                    <strong>
                                        {selectedBulkQc.ph_measured}
                                    </strong>

                                    <small>
                                        기준: {selectedBulkQc.ph_criteria
                                            ?.replace("_", " ~ ")}
                                    </small>
                                </div>

                                {/* 점도 */}
                                <div className="quality-detail-item">
                                    <span>점도</span>

                                    <strong>
                                        {selectedBulkQc.viscosity_measured}
                                    </strong>

                                    <small>
                                        기준: {selectedBulkQc.viscosity_criteria
                                            ?.replace("_", " ~ ")}
                                    </small>
                                </div>

                                {/* 비중 */}
                                <div className="quality-detail-item">
                                    <span>비중</span>

                                    <strong>
                                        {selectedBulkQc.specific_gravity}
                                    </strong>

                                    <small>
                                        기준: {selectedBulkQc.sg_criteria
                                            ?.replace("_", " ~ ")}
                                    </small>
                                </div>

                                {/* 미생물 */}
                                <div className="quality-detail-item">
                                    <span>미생물</span>

                                    <strong>
                                        {selectedBulkQc.microbial_cfu} CFU
                                    </strong>
                                </div>

                            </div>

                        </div>

                        {/* 기타 검사 결과 */}
                        <div className="quality-detail-section">

                            <h3>기타 검사 결과</h3>

                            <div className="quality-detail-grid">

                                <div className="quality-detail-item">
                                    <span>외관</span>
                                    <strong>
                                        {selectedBulkQc.appearance_code ===
                                        "APP_PASS_PALEBLUE"
                                            ? "적합"
                                            : selectedBulkQc.appearance_code}
                                    </strong>
                                </div>

                                <div className="quality-detail-item">
                                    <span>미세기포</span>
                                    <strong>
                                        {selectedBulkQc.microbubble_code ===
                                        "BUBBLE_PASS_ZERO"
                                            ? "없음"
                                            : selectedBulkQc.microbubble_code}
                                    </strong>
                                </div>


                                <div className="quality-detail-item">
                                    <span>최종 검사 결과</span>

                                    <strong
                                        className={
                                            selectedBulkQc.overall_qc_result ===
                                            "QC_RESULT_PASS"
                                                ? "quality-result-pass"
                                                : selectedBulkQc.overall_qc_result ===
                                                "QC_RESULT_FAIL"
                                                ? "quality-result-fail"
                                                : ""
                                        }
                                    >
                                        {selectedBulkQc.overall_qc_result ===
                                        "QC_RESULT_PASS"
                                            ? "합격"
                                            : selectedBulkQc.overall_qc_result ===
                                            "QC_RESULT_FAIL"
                                            ? "불합격"
                                            : selectedBulkQc.overall_qc_result}
                                    </strong>
                                </div>

                            </div>

                        </div>

                        {/* 비고 */}
                        <div className="quality-detail-section">
                            <h3>비고</h3>

                            <div className="quality-detail-note">
                                {selectedBulkQc.qc_notes_code || "-"}
                            </div>

                        </div>

                        {/* 모달 하단 */}
                        <div className="quality-modal-footer">
                            <button
                                onClick={() => setSelectedBulkQc(null)}
                            >
                                닫기
                            </button>

                        </div>

                    </div>

                </div>

            )}
            </>
            );
            }