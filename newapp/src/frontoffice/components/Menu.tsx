import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Menu.css';

const Menu: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const customerId = localStorage.getItem("customerId");
        setIsLoggedIn(!!customerId && customerId !== "0");
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem("customerId");
        localStorage.removeItem("cartId");
        localStorage.removeItem("cart");
        setIsLoggedIn(false);
        alert("Vous avez été déconnecté.");
        navigate("/front");
    };

    return (
        <nav className="front-menu">
            <Link to="/front" className="menu-logo">PrestaShop</Link>
            <div className="menu-links">
                <Link to="/front" className="menu-link">Accueil</Link>
                <Link to="/front/cart" className="menu-link">Panier</Link>
                <Link to="/front/commandes" className="menu-link">Commandes</Link>
                {isLoggedIn ? (
                    <button onClick={handleLogout} className="menu-link logout-btn">
                        Déconnexion
                    </button>
                ) : (
                    <Link to="/front/login" className="menu-link">Login</Link>
                )}
            </div>
        </nav>
    );
};

export default Menu;

