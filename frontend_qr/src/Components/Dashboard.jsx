import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, ClipboardCheck, CalendarCheck, UserX, RefreshCw, ArrowUpRight,
  CalendarDays, Clock3, Activity, ShieldCheck, AlertCircle, Timer,
  TrendingUp, AlertTriangle, ChevronRight, BarChart3, PieChart,
  Camera, ImageOff, UserRoundSearch
} from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Tooltip, Legend
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import api from "../api";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend
);

const ESTADOS = {
  PRESENTE: { texto: "Presente", clase: "presente", punto: "presente" },
  RETARDO: { texto: "Retardo", clase: "retardo", punto: "retardo" },
  FALTA: { texto: "Falta", clase: "falta", punto: "falta" },
  JUSTIFICADA: { texto: "Justificada", clase: "justificada", punto: "justificada" },
};

const numero = (valor) => Number(valor || 0).toLocaleString("es-MX");
const fechaCompleta = () => new Date().toLocaleDateString("es-MX", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const hora = (iso) => iso ? new Date(iso).toLocaleTimeString("es-MX", {
  hour: "2-digit", minute: "2-digit",
}) : "—";
const fechaCorta = (iso) => iso ? new Date(iso).toLocaleDateString("es-MX", {
  day: "2-digit", month: "short",
}) : "";
const iniciales = (nombre = "") => nombre.split(" ").filter(Boolean).slice(0, 2)
  .map((parte) => parte[0]).join("").toUpperCase();

function IconoKpi({ icon: Icon, tone }) {
  return <span className={`cecyte-kpi-icon ${tone}`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>;
}

function TarjetaKpi({ titulo, valor, icon, tone, nota, accion }) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <IconoKpi icon={icon} tone={tone} />
        {accion && <ArrowUpRight size={16} className="text-slate-300" aria-hidden="true" />}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold tracking-[-.055em] text-slate-900 tabular-nums">{numero(valor)}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">{titulo}</p>
        {nota && <p className="mt-1 text-xs leading-5 text-slate-400">{nota}</p>}
      </div>
    </>
  );
  return accion
    ? <button type="button" onClick={accion} className="cecyte-kpi cecyte-kpi-action text-left">{contenido}</button>
    : <article className="cecyte-kpi">{contenido}</article>;
}

function TituloPanel({ eyebrow, titulo, descripcion, icon: Icon }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="cecyte-eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{titulo}</h2>
        {descripcion && <p className="mt-1 text-xs leading-5 text-slate-400">{descripcion}</p>}
      </div>
      {Icon && <span className="rounded-xl bg-slate-50 p-2 text-slate-400"><Icon size={18} /></span>}
    </div>
  );
}

function Esqueleto() {
  return (
    <main className="cecyte-dashboard animate-pulse">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="h-20 rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-slate-200" />)}</div>
        <div className="h-80 rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState("");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
