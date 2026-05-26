import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import "./login.css";

const Login = () => {
    const [credentials, setCredentials] = useState(
        {
            email: 'admin@gmail.com',
            password: 'admin'
        }
    );

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const hanlderlogin = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const success = login(credentials.email, credentials.password);
        if (success) {
            navigate('/backoffice');
        } else {
            alert('Invalid credentials');
        }
    };

    return (
        <div className="backoffice-login-container">
            <div className="backoffice-login-card">
                <h1>BackOffice Login</h1>
                <form onSubmit={hanlderlogin} className="backoffice-login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email"
                            name="email"
                            id="email"
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                            required
                            placeholder="Enter your email"
                        />
                    </div>                
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            type="password"
                            name="password"
                            id="password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            required
                            placeholder="Enter your password"
                        />
                    </div>
                    <button type="submit" className="login-button">Se connecter</button>
                </form>
            </div>
        </div>
    );
};

export default Login;