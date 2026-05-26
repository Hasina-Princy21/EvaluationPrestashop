import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./BackofficeLayout.css";

const BackofficeLayout = () => {
  return (
    <div className="backoffice-layout">
      <Sidebar />
      <main className="backoffice-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default BackofficeLayout;
