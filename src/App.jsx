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
                        element={<Dashboard />}
                    />

                    <Route
                        path="/production"
                        element={<Production />}
                    />

                    <Route
                        path="/process"
                        element={<Process />}
                    />

                    <Route
                        path="/quality"
                        element={<Quality />}
                    />

                    <Route
                        path="/anomaly"
                        element={<Anomaly />}
                    />

                    <Route
                        path="/data"
                        element={<DataManagement />}
                    />

                </Route>

            </Routes>

        </BrowserRouter>
    );
}

export default App;