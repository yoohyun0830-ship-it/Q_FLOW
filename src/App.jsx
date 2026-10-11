import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "./component/MainLayout";

import "./App.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import Process from "./pages/Process";
import Quality from "./pages/Quality";
import Anomaly from "./pages/Anomaly";
import DataManagement from "./pages/DataManagement";

// 추가
import System from "./pages/System";

function App() {

    return (
        <BrowserRouter>
            <Routes>
                {/* 로그인 화면 */}
                <Route path="/" element={<Login />} />

                {/* 로그인 이후 공통 화면 */}
                <Route element={<MainLayout />}>

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}/>

                    <Route
                        path="/production"
                        element={<Production />}/>

                    <Route
                        path="/process"
                        element={<Process />}/>

                    <Route
                        path="/quality"
                        element={<Quality />}/>
                    
                    {/* 2. [신규 추가] 불량 관리 페이지 */}
                    <Route 
                        path="/quality/defect" element={<Quality />} />

                    {/* 3. 불량 & 분석 리포트 페이지 */}
                    <Route 
                        path="/quality/report" element={<Quality />} />
                        
                    <Route
                        path="/anomaly"
                        element={<Anomaly key="overview" />}/>
                        {/* 조치 내역 */}
                    <Route
                        path="/anomaly/actions"
                        element={<Anomaly key="actions" view="actions" />}/>

                    {/* 제조데이터 관리 메인 */}
                    <Route
                        path="/data"
                        element={<DataManagement />}
                    />

                    {/* LOT별 이력 */}
                    <Route
                        path="/data/lots"
                        element={<DataManagement />}
                    />

                    {/* 데이터 변경이력 */}
                    <Route
                        path="/data/changes"
                        element={<DataManagement />}
                    />


                    {/* 시스템 관리 */}
                    <Route
                        path="/system"
                        element={<System />}/>

                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;