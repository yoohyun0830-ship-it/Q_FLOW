import { useState, useEffect } from "react";

// 품질관리 css 연결
import "../css/quality.css";
import axios from "axios";

export default function Quality(){
    
    // 현재 선택된 품질관리 탭
    const [tab, setTab] = useState("bulk");

    // Spring에서 받아온 벌크 품질검사 데이터 저장
    const [bulkQc, setBulkQc] = useState([]);

    // 벌크 품질검사 전체조회
    useEffect(() => {
        axios
            .get("http://localhost:8080/mask/bulk-qc")
            .then((response) =>{
                console.log("벌크 품질검사:" , response.data)
                setBulkQc(response.data.content);
            })    
            .catch((error)=>{
                console.log("벌크 품질검사 조회 실패" , error);
            });
    },[]);
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
            <input type="date" />
            <span>~</span>
            {/* 조회 종료일 */}
            <input type="date" />

            {/* LOT선택 */}
            <select>
                <option> 전체 LOT</option>
            </select>

            {/* 검사 결과 선택 */}
            <select>
                <option>전체결과</option>
                <option>합격</option>
                <option>불합격</option>
            </select>

            { /* 조회버튼 */}
            <button className="quality-search-btn">
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
                        </tr>
                    </thead>
                    <tbody>
                        {/* 벌크 품질검사 데이터가 존재하면 출력 */}
                        {bulkQc.length>0?(
                            bulkQc.map((qc, index) => (
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
                                        {qc.overall_qc_result === "QC_RESULT_PASS"
                                            ? "합격"
                                            : qc.overall_qc_result === "QC_RESULT_FAIL"
                                            ? "불합격"
                                            : qc.overall_qc_result}
                                    </td>

                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td 
                                    colSpan="9"
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
                            <th>충진량</th>
                            <th>실링 온도</th>
                            <th>실링 압력</th>
                            <th>중량 검사</th>
                            <th>금속 검사</th>
                            <th>비전 검사</th>
                            <th>검사 결과</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td
                                colSpan="10"
                                className="quality-no-data"
                            >
                                조회된 완제품 품질검사 데이터가 없습니다.
                            </td>
                        </tr>
                    </tbody>
                </table>
                </div>)}
            </div>
            
    </div>
        </>
    );
}