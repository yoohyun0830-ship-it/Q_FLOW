import "../css/Process.css";
import "../css/Dashboard.css";
import { Link } from 'react-router-dom';
import icon1 from "./img/process_공정01_원료정량.png";
import icon2 from "./img/process_공정02_가열혼합.png";
import icon3 from "./img/process_공정03_냉각마무리.png";
import icon4 from "./img/process_공정04_벌크QC.png";
import icon5 from "./img/process_공정05_충진포장.png";
export default function Process(){
    return(
        <>
        <div className="pr_header_box">
        <div>
            <h2 style={{ marginBottom: "10px" , marginTop: "0px"}}>실시간 공정 모니터링</h2>
        </div>
        </div>
            <div className="pr_row1">
                <div className="pr_row1_header">
                    <div className="pr_box_title">공정 흐름도 - 현재 진행 단계</div>
                    <div className="pr_header_box2">
                    <div className="pr_header">
                        <div> ● 실시간 모니터링 중</div>
                        <Link to= "/report"><div>지난 이력 조회</div></Link>
                    </div>
                    </div>
                </div>
                <div className="pr_row1_boxs">
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <div><img src={icon1}></img></div>
                        <div className="pr_row1_box_title_text">원료 칭량</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div className="next">
                    ▶
                </div>
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <div><img src={icon2}></img></div>
                        <div className="pr_row1_box_title_text">가열, 혼합</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div className="next">
                    ▶
                </div>
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <div><img src={icon3}></img></div>
                        <div className="pr_row1_box_title_text">냉각, 마무리</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div className="next">
                    ▶
                </div>
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <div><img src={icon4}></img></div>
                        <div className="pr_row1_box_title_text">벌크 QC</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div className="next">
                    ▶
                </div><div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <div><img src={icon5}></img></div>
                        <div className="pr_row1_box_title_text">충진, 포장</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                </div>
            </div>
            <div className="pr_row2">
                <div className="pr_row2_box">
                    <p className="pr_box_title2">현재 센서 값</p>
                    <div>
                        <div className="pr_row2_table_row">
                            <div>
                                <img></img>
                                <div>
                                    <p>탱크 온도</p>
                                    <span>#온도</span><span>#상태</span>
                                    <p>#기준 명시</p>
                                </div>
                            </div>
                            <div>
                                <img></img>
                                <div>
                                    <p>효모 RPM</p>
                                    <span>#rpm</span><span>#상태</span>
                                    <p>#기준 명시</p>
                                </div>
                            </div>
                        </div>
                        <div className="pr_row2_table_row">
                            <div>
                                <img></img>
                                <div>
                                    <p>점도</p>
                                    <span>#점도</span><span>#상태</span>
                                    <p>#기준 명시</p>
                                </div>
                            </div>
                            <div>
                                <img></img>
                                <div>
                                    <p>PH</p>
                                    <span>#PH</span><span>#상태</span>
                                    <p>#기준 명시</p>
                                </div>
                            </div>
                        </div>
                        <div className="pr_row2_table_row">
                            <div>
                                <img></img>
                                <div>
                                    <p>모터 토크</p>
                                    <span>#%</span><span>#상태</span>
                                    <p>#기준 명시</p>
                                </div>
                            </div>
                            <div>
                                <img></img>
                                <div>
                                    <p>진공도</p>
                                    <span>#진공도</span><span>#상태</span>
                                    <p>#기준 명시</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pr_row2_box">
                    <p className="pr_box_title2">주요 센서 실시간 변화</p>
                    <div className="pr_row2_button">
                        <button>온도</button>
                        <button>pH</button>
                        <button>점도</button>
                        <button>RPM</button>
                        <button>모터토크</button>
                        <button>진공도</button>
                    </div>
                    <div>#그래프</div>
                </div>
            </div>
            <div>
                <p>공정 진행 이력 ( 최근 순 )</p>
                <table></table>
            </div>
        </>
    );
}

