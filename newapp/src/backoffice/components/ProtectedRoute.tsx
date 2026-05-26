import { useAuthStore } from "../store/authStore";
import { Outlet, Navigate } from "react-router-dom";

const ProtectedRoute = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    if (!isAuthenticated) {
        return <Navigate to="/backoffice/login" replace />;
    }

    // Si connecté, on affiche le contenu de la route enfant (Outlet)
    return <Outlet />;
};

export default ProtectedRoute;