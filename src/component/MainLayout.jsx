import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AnomalyPopup from "./AnomalyPopup";

export default function MainLayout(){

    return(
        <div className="main-layout">
            <Sidebar />

            <div className="main-content">
                <Header />

                <main className="page-content">
                    <Outlet />
                </main>
            </div>

            <AnomalyPopup />

        </div>
    );
}