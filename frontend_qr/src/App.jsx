import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Components/login";
import Dashboard from "./Components/Dashboard";
import Alumnos from "./Components/Alumnos";
import Sidebar from "./Components/Sidebar";
import Materias from "./Components/Materias";
import Reportes from "./Components/Reportes";
import PaseLista from "./Components/PaseLista";
import Register from "./Components/Register";
import ForgotPassword from "./Components/ForgotPassword";
import ResetPassword from "./Components/ResetPassword";
import Asistencia from "./Components/Asistencia";
import Profesores from "./Components/Profesores";
import Grupos from "./Components/Grupos";
import "./styles/Institutional.css";

function RutaPrivada({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/*" element={
        <RutaPrivada>
          <div className="institutional-app">
            <Sidebar />
            <main className="institutional-main">
              <div className="institutional-content">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/alumnos" element={<Alumnos />} />
                  <Route path="/profesores" element={<Profesores />} />
                  <Route path="/grupos" element={<Grupos />} />
                  <Route path="/materias" element={<Materias />} />
                  <Route path="/pases-lista" element={<PaseLista />} />
                  <Route path="/asistencia" element={<Asistencia />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </RutaPrivada>
      } />
    </Routes>
  );
}

export default App;
