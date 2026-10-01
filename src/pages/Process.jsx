import "../css/Process.css";
import { Link } from 'react-router-dom';
export default function Process(){
    return(
        <>
        <div>
            <h2 style={{ margin: "0px" }}>실시간 공정 모니터링</h2>
        </div>
        <div className="pr_header">
            <div>실시간 모니터링</div>
            <Link to= "/report"><div>이력 조회</div></Link>
        </div>
            <div className="pr_row1">
                <div>공정 흐름도 - 현재 진행 단계</div>
                <div className="pr_row1_boxs">
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <img></img>
                        <div>원료 칭량</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div>
                    ▶
                </div>
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <img></img>
                        <div>가열, 혼합</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div>
                    ▶
                </div>
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <img></img>
                        <div>원료 칭량</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div>
                    ▶
                </div>
                <div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <img></img>
                        <div>원료 칭량</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                <div>
                    ▶
                </div><div className="pr_row1_box">
                    <div className="pr_row1_box_title">
                        <img></img>
                        <div>원료 칭량</div>
                    </div>
                    <div className="">#상태</div>
                    <div>#시간 주입</div>
                    <div>배치: #LOT</div>
                </div>
                </div>
            </div>
            <div className="pr_row2">
                <div className="pr_row2_box">
                    <p>현재 센서 값</p>
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
                    <p>주요 센서 실시간 값</p>
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