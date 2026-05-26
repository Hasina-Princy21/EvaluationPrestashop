import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import "./Sidebar.css";

const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/backoffice/login");
  };

  return (
    <aside className="backoffice-sidebar">
      <div className="sidebar-brand">
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="brand-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="21" x2="9" y2="9"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
        </svg>
        <span className="brand-text">PrestaShop Admin</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/backoffice" 
          end
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span className="nav-label">Tableau de bord</span>
        </NavLink>

        <NavLink 
          to="/backoffice/import" 
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span className="nav-label">Import des données</span>
        </NavLink>

        <NavLink 
          to="/backoffice/stock" 
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <path d="M3.27 6.96 12 12l8.73-5.04"></path>
            <path d="M12 22V12"></path>
          </svg>
          <span className="nav-label">Stock produit</span>
        </NavLink>

        <NavLink 
          to="/backoffice/resetdata" 
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          <span className="nav-label">Reset Data</span>
        </NavLink>

        <NavLink 
          to="/backoffice/orders" 
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span className="nav-label">Gestion de commande</span>
        </NavLink>

        <NavLink 
          to="/backoffice/statistics" 
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span className="nav-label">Statistiques</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span className="nav-label">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
