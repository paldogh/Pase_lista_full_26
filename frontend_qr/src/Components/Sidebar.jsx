import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarCheck, ChartNoAxesCombined, Menu, X,
  LogOut, ShieldCheck, Leaf
} from "lucide-react";

const NAVIGATION = [
  { label: "General", items: [
    { to: "/dashboard", label: "Panel principal", icon: LayoutDashboard },
  ]},
  { label: "Comunidad escolar", items: [
    { to: "/alumnos", label: "Alumnos", icon: Users },
  ]},
  { label: "Control académico", items: [
    { to: "/asistencia", label: "Asistencias", icon: CalendarCheck },
    { to: "/reportes", label: "Reportes", icon: ChartNoAxesCombined },
  ]},
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const cerrarSesion = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  return <>
    <button className="mobile-menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
      <Menu size={21} />
    </button>
    {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}
    <aside className={`institutional-sidebar ${mobileOpen ? "is-open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-symbol"><Leaf size={24} strokeWidth={2.2} /></div>
        <div className="brand-copy"><strong>CECyTE<span>H</span></strong><small>HIDALGO · CONTROL ESCOLAR</small></div>
        <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
      </div>
      <div className="sidebar-context"><span className="context-dot" /> SISTEMA INTEGRAL <span className="context-version">v1.0</span></div>
      <nav className="sidebar-navigation" aria-label="Navegación principal">
        {NAVIGATION.map((group) => <section className="nav-group" key={group.label}>
          <p className="nav-group-label">{group.label}</p>
          {group.items.map(({ to, label, icon: Icon }) => <NavLink
            key={to} to={to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          ><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{to === "/dashboard" && <span className="nav-active-mark" />}</NavLink>)}
        </section>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-security"><ShieldCheck size={17} /><span><b>Entorno protegido</b><small>Acceso institucional</small></span></div>
        <button className="sidebar-logout" onClick={cerrarSesion}><LogOut size={17} /> Cerrar sesión</button>
        <div className="sidebar-footer">CECyTE Hidalgo <span>·</span> Educación que transforma</div>
      </div>
    </aside>
  </>;
}
