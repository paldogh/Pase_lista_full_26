import { useState } from "react";
import "../screens/Login.css";
import { useNavigate, Link } from "react-router-dom";
import api from "../api"; // Importamos axios

function Login() {
    const navigation = useNavigate();

    //* 1. Estados para capturar el correo, la contraseña y posibles errores
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    const inicializarSesion = async (e) => {
        e.preventDefault(); // Evita recargas si alguna vez lo envuelves en un <form>
        setError(null); // Limpiamos errores previos

        try {
            //* 2. Hacemos la petición POST al endpoint del backend
            const response = await api.post("/auth/login", {
                email: email,
                password: password
            });

            //* 3. Verificamos si el backend respondió con éxito
            if (response.data.success) {
                //* Extraemos el token que viene en la respuesta (como se ve en tu Postman)
                const tokenReal = response.data.token;

                //* 4. Guardamos el token real en el almacenamiento local
                localStorage.setItem('token', tokenReal);

                //* 5. Redirigimos de forma segura al dashboard
                navigation("/dashboard");
            }
        } catch (error) {
            //* 6. Manejamos los errores (ej. 401 Correo o contraseña incorrectos)
            if (error.response && error.response.data) {
                //* Muestra el mensaje de error que mandaste desde tu backend
                setError(error.response.data.message); 
            } else {
                setError("Error de conexión con el servidor.");
            }
            console.error("Error al iniciar sesión:", error);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">

                <img
                    src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png"
                    alt="logo"
                    className="logo"
                />

                <h1>Pase de Lista QR</h1>

                <p className="subtitulo">
                    Iniciar sesión para continuar
                </p>

                {/* Mostrar mensaje de error visualmente si las credenciales fallan */}
                {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}

                {/* Vinculamos los inputs con nuestro estado (Controladores) */}
                <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button onClick={inicializarSesion}>
                    Iniciar Sesión
                </button>

                <button
                    className="register-button"
                    onClick={() => navigation("/register")}
                >
                    Crear Cuenta
                </button>

                <p className="forgot-password">
                    <Link to="/forgot-password">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </p>

                <p className="footer">
                    Universidad Tecnológica del Valle del Mezquital
                </p>

            </div>
        </div>
    );
}

export default Login;