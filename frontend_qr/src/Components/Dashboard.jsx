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

  // Se conserva el endpoint actual. No se realizan cambios al backend ni a otros módulos.
  const cargarResumen = useCallback(async (silencioso = false) => {
    try {
      const { data } = await api.get("/dashboard/resumen");
      if (!data?.success) throw new Error(data?.message || "Respuesta no válida del servidor.");
      setResumen(data.data);
      setUltimaActualizacion(new Date());
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
      if (!silencioso) setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    const intervalo = window.setInterval(() => cargarResumen(true), 60000);
    return () => window.clearInterval(intervalo);
  }, [cargarResumen]);

  const recargar = async () => {
    setRefrescando(true);
    await cargarResumen();
  };

  const tarjetas = resumen?.tarjetas || {};
  const registros = resumen?.ultimosRegistros || [];
  const semana = resumen?.asistenciaSemanal || [];

  // Solo se utilizan listas opcionales si el endpoint ya las proporciona.
  const grupos = resumen?.asistenciaPorGrupo || resumen?.grupos || [];
  const alumnosRiesgo = resumen?.alumnosConInasistencias || resumen?.alumnosRiesgo || [];

  const activos = Number(tarjetas.alumnosActivos || 0);
  const presentes = Number(tarjetas.presentesHoy || 0);
  const retardos = Number(tarjetas.retardosHoy || 0);
  const faltas = Number(tarjetas.faltasHoy || 0);
  const justificadas = Number(tarjetas.justificadasHoy || 0);
  const sinRegistro = Number(tarjetas.alumnosSinRegistroHoy || 0);
  const asistenciasRegistradas = Number(tarjetas.asistenciasHoy ?? (presentes + retardos + faltas + justificadas));

  // Porcentaje calculado con estados de asistencia efectiva; justificadas y faltas no cuentan como presentes.
  const porcentajeAsistencia = activos > 0
    ? Math.min(100, ((presentes + retardos) / activos) * 100)
    : 0;
  const porcentajeFotos = Math.min(100, Math.max(0, Number(
    tarjetas.porcentajeFotos ??
    (activos ? (Number(tarjetas.alumnosConFoto || 0) / activos) * 100 : 0)
  )));

  const totalSemana = useMemo(
    () => semana.reduce((total, dia) => total + Number(dia.presente || 0) +
      Number(dia.retardo || 0) + Number(dia.falta || 0) + Number(dia.justificada || 0), 0),
    [semana]
  );

  const datosBarras = useMemo(() => ({
    labels: semana.map((dia) => dia.etiqueta),
    datasets: [
      { label: "Presentes", data: semana.map((d) => Number(d.presente || 0)), backgroundColor: "#16856b", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
      { label: "Retardos", data: semana.map((d) => Number(d.retardo || 0)), backgroundColor: "#e8a23a", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
      { label: "Faltas", data: semana.map((d) => Number(d.falta || 0)), backgroundColor: "#b94b55", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
      { label: "Justificadas", data: semana.map((d) => Number(d.justificada || 0)), backgroundColor: "#8296b5", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
    ],
  }), [semana]);

  const datosTendencia = useMemo(() => ({
    labels: semana.map((dia) => dia.etiqueta),
    datasets: [{
      label: "Registros diarios",
      data: semana.map((d) => Number(d.presente || 0) + Number(d.retardo || 0) + Number(d.falta || 0) + Number(d.justificada || 0)),
      borderColor: "#64132f",
      backgroundColor: "rgba(100,19,47,.08)",
      pointBackgroundColor: "#64132f",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: .35,
      fill: true,
    }],
  }), [semana]);

  const datosDistribucion = useMemo(() => ({
    labels: ["Presentes", "Retardos", "Faltas", "Justificadas"],
    datasets: [{
      data: [presentes, retardos, faltas, justificadas],
      backgroundColor: ["#16856b", "#e8a23a", "#b94b55", "#8296b5"],
      borderColor: "#fff",
      borderWidth: 3,
      hoverOffset: 5,
    }],
  }), [presentes, retardos, faltas, justificadas]);

  const opcionesBarras = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, boxHeight: 7, padding: 15, color: "#667085", font: { size: 11 } } },
      tooltip: { backgroundColor: "#25151c", padding: 11, cornerRadius: 9, titleFont: { weight: "600" }, bodyFont: { size: 11 } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: "#8993a2", font: { size: 11 } } },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: "#8993a2", font: { size: 10 } }, grid: { color: "#f0f2f5" }, border: { display: false } },
    },
  }), []);

  const opcionesLinea = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#25151c", padding: 10, cornerRadius: 9 } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: "#8993a2", font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, color: "#8993a2", font: { size: 10 } }, grid: { color: "#f0f2f5" }, border: { display: false } },
    },
  }), []);

  const opcionesDona = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, padding: 13, color: "#667085", font: { size: 10 } } },
      tooltip: { backgroundColor: "#25151c", padding: 10, cornerRadius: 9 },
    },
  }), []);

  const gruposOrdenados = useMemo(() => [...grupos].sort((a, b) =>
    Number(b.faltas ?? b.falta ?? 0) - Number(a.faltas ?? a.falta ?? 0)
  ), [grupos]);

  const alumnosOrdenados = useMemo(() => [...alumnosRiesgo].sort((a, b) =>
    Number(b.faltas ?? b.totalFaltas ?? 0) - Number(a.faltas ?? a.totalFaltas ?? 0)
  ), [alumnosRiesgo]);

  if (cargando && !resumen) return <Esqueleto />;

  if (!resumen) {
    return (
      <main className="cecyte-dashboard">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-7 shadow-sm">
          <span className="cecyte-kpi-icon tone-wine"><AlertCircle size={20} /></span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">No se pudo cargar el panel</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button onClick={recargar} disabled={refrescando} className="cecyte-primary-btn mt-5">
            <RefreshCw size={16} className={refrescando ? "animate-spin" : ""} /> Intentar nuevamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="cecyte-dashboard">
      <style>{`
.cecyte-dashboard{--wine:#64132f;--wine-dark:#4d1026;min-height:100vh;background:#f5f7fa;padding:clamp(.8rem,2.4vw,2rem);color:#172235}
.cecyte-dashboard .cecyte-kpi,.cecyte-dashboard .cecyte-panel{min-width:0;border:1px solid #e7eaf0;border-radius:16px;background:#fff;box-shadow:0 2px 8px rgba(22,31,48,.025),0 10px 28px rgba(22,31,48,.025)}
.cecyte-dashboard .cecyte-kpi{display:flex;min-height:145px;flex-direction:column;justify-content:space-between;padding:1.1rem}
.cecyte-dashboard .cecyte-kpi-action{width:100%;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .2s}
.cecyte-dashboard .cecyte-kpi-action:hover{transform:translateY(-2px);border-color:#d8c1ca;box-shadow:0 12px 30px rgba(100,19,47,.07)}
.cecyte-dashboard button:focus-visible{outline:3px solid rgba(100,19,47,.2);outline-offset:3px}
.cecyte-dashboard .cecyte-kpi-icon{display:inline-flex;width:40px;height:40px;flex:0 0 40px;align-items:center;justify-content:center;border-radius:12px}
.cecyte-dashboard .tone-wine{background:#f5edf0;color:#64132f}.cecyte-dashboard .tone-green{background:#eaf5f1;color:#16856b}.cecyte-dashboard .tone-orange{background:#fbf3e8;color:#bd7924}.cecyte-dashboard .tone-slate{background:#eef1f5;color:#64748b}
.cecyte-dashboard .cecyte-panel{padding:clamp(1rem,1.8vw,1.4rem)}
.cecyte-dashboard .cecyte-eyebrow{color:#9a7c88;font-size:10px;font-weight:750;letter-spacing:.15em;text-transform:uppercase}
.cecyte-dashboard .cecyte-icon-btn{display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border:1px solid #e2e6ec;border-radius:11px;background:white;color:#667085}
.cecyte-dashboard .cecyte-icon-btn:hover{border-color:#d7bdc7;color:var(--wine)}
.cecyte-dashboard .cecyte-primary-btn{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:9px;border-radius:11px;background:var(--wine);padding:0 16px;color:white;font-size:13px;font-weight:650}
.cecyte-dashboard .cecyte-primary-btn:hover{background:var(--wine-dark)}.cecyte-dashboard .cecyte-primary-btn:disabled{opacity:.6;cursor:wait}
.cecyte-dashboard .cecyte-text-btn{display:inline-flex;align-items:center;gap:5px;color:var(--wine);font-size:12px;font-weight:700}
.cecyte-dashboard .cecyte-status{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:650;white-space:nowrap}
.cecyte-dashboard .cecyte-status i{width:6px;height:6px;border-radius:50%}
.cecyte-dashboard .cecyte-status .presente{background:#16856b}.cecyte-dashboard .cecyte-status .retardo{background:#d28a27}.cecyte-dashboard .cecyte-status .falta{background:#b94b55}.cecyte-dashboard .cecyte-status .justificada{background:#8296b5}.cecyte-dashboard .cecyte-status .neutral{background:#94a3b8}
.cecyte-dashboard .cecyte-status.presente{background:#edf7f3;color:#14765f}.cecyte-dashboard .cecyte-status.retardo{background:#fbf4e9;color:#9b681e}.cecyte-dashboard .cecyte-status.falta{background:#fbefef;color:#a83d48}.cecyte-dashboard .cecyte-status.justificada{background:#eff3f8;color:#617894}.cecyte-dashboard .cecyte-status.neutral{background:#f1f3f6;color:#64748b}
.cecyte-dashboard .cecyte-executive{border:1px solid #5c1832;border-radius:17px;background:radial-gradient(ellipse at 100% 0%,rgba(255,255,255,.12),transparent 45%),linear-gradient(135deg,#741b3b 0%,#4d1026 100%);padding:clamp(1.2rem,2.4vw,1.8rem);color:white;box-shadow:0 12px 30px rgba(77,16,38,.10)}
.cecyte-dashboard .cecyte-progress{height:8px;overflow:hidden;border-radius:99px;background:#e9edf2}.cecyte-dashboard .cecyte-progress>span{display:block;height:100%;border-radius:99px;transition:width .5s}
@media(max-width:640px){.cecyte-dashboard .cecyte-kpi{min-height:132px;padding:.9rem}.cecyte-dashboard .cecyte-panel{border-radius:14px}}
@media(prefers-reduced-motion:reduce){.cecyte-dashboard *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}}
      `}</style>

      <div className="mx-auto flex max-w-[1500px] flex-col gap-5 sm:gap-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">CECyTE Hidalgo · Dirección y coordinación</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-.045em] text-slate-900 sm:text-3xl">Panel ejecutivo</h1>
            <p className="mt-1.5 text-sm text-slate-500">Indicadores clave para el seguimiento de asistencia y puntualidad escolar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium capitalize text-slate-600">
              <CalendarDays size={15} className="text-slate-400" /> {fechaCompleta()}
            </span>
            <button type="button" onClick={recargar} disabled={refrescando} title="Actualizar información" aria-label="Actualizar información" className="cecyte-icon-btn">
              <RefreshCw size={16} className={refrescando ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error && <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertCircle size={16} /> No se pudo actualizar. Se conservan los últimos datos cargados.</div>}

        <section className="cecyte-executive">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/60">Indicador principal · Hoy</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-5xl font-semibold tracking-[-.06em] tabular-nums sm:text-6xl">{porcentajeAsistencia.toFixed(1)}%</span>
                <span className="pb-2 text-sm text-white/75">asistencia sobre la matrícula activa</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">Calculado con presentes y retardos registrados. Las faltas justificadas y los alumnos sin registro se mantienen diferenciados.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
              <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs text-white/65">Matrícula activa</p><p className="mt-1 text-2xl font-semibold tabular-nums">{numero(activos)}</p></div>
              <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs text-white/65">Registros del día</p><p className="mt-1 text-2xl font-semibold tabular-nums">{numero(asistenciasRegistradas)}</p></div>
              <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs text-white/65">Faltas marcadas</p><p className="mt-1 text-2xl font-semibold tabular-nums">{numero(faltas)}</p></div>
              <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs text-white/65">Sin registro</p><p className="mt-1 text-2xl font-semibold tabular-nums">{numero(sinRegistro)}</p></div>
            </div>
          </div>
          <div className="mt-5 border-t border-white/15 pt-4">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-white/70"><span>Porcentaje de asistencia registrado</span><span>{porcentajeAsistencia.toFixed(1)}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${porcentajeAsistencia}%` }} /></div>
          </div>
        </section>

        <section aria-label="Indicadores del día" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TarjetaKpi titulo="Presentes" valor={presentes} icon={Users} tone="tone-green" nota="Registros con estado presente" accion={() => navigate("/asistencia")} />
          <TarjetaKpi titulo="Retardos" valor={retardos} icon={Timer} tone="tone-orange" nota="Alumnos que llegaron tarde" accion={() => navigate("/reportes")} />
          <TarjetaKpi titulo="Faltas registradas" valor={faltas} icon={UserX} tone="tone-wine" nota="Inasistencias marcadas" accion={() => navigate("/reportes")} />
          <TarjetaKpi titulo="Justificadas" valor={justificadas} icon={ShieldCheck} tone="tone-slate" nota="Registros justificados" accion={() => navigate("/reportes")} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,.85fr)]">
          <div className="cecyte-panel min-w-0">
            <TituloPanel eyebrow="Comportamiento semanal" titulo="Asistencia del plantel" descripcion="Comparativo diario de presentes, retardos, faltas y justificadas" icon={BarChart3} />
            <div className="relative h-[250px] w-full sm:h-[290px]">
              {totalSemana > 0 ? <Bar data={datosBarras} options={opcionesBarras} /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin registros en el periodo disponible.</div>}
            </div>
          </div>

          <div className="cecyte-panel min-w-0">
            <TituloPanel eyebrow="Distribución de hoy" titulo="Estados de asistencia" descripcion="Composición de los registros capturados en la jornada" icon={PieChart} />
            <div className="relative mx-auto h-[220px] max-w-[300px]">
              {(presentes + retardos + faltas + justificadas) > 0
                ? <Doughnut data={datosDistribucion} options={opcionesDona} />
                : <div className="flex h-full items-center justify-center text-sm text-slate-400">Aún no hay registros para distribuir.</div>}
              {(presentes + retardos + faltas + justificadas) > 0 && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-7"><span className="text-3xl font-semibold tracking-tight text-slate-900">{numero(presentes + retardos + faltas + justificadas)}</span><span className="text-[10px] uppercase tracking-wider text-slate-400">registros</span></div>}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="cecyte-panel min-w-0">
            <TituloPanel eyebrow="Tendencia semanal" titulo="Volumen de registros por día" descripcion="Permite observar días con menor actividad de captura." icon={TrendingUp} />
            <div className="relative h-[205px] w-full">
              {totalSemana > 0 ? <Line data={datosTendencia} options={opcionesLinea} /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No hay datos semanales disponibles.</div>}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">Esta gráfica muestra cantidad de registros, no porcentaje de asistencia diario, porque la matrícula por día no viene en el resumen actual.</p>
          </div>

          <div className="cecyte-panel flex min-w-0 flex-col">
            <TituloPanel eyebrow="Alertas para dirección" titulo="Situaciones que requieren seguimiento" descripcion="Indicadores operativos del día." icon={AlertTriangle} />
            <div className="space-y-3">
              <div className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                <span className="mt-0.5 text-rose-600"><UserX size={18} /></span>
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{numero(faltas)} faltas registradas</p><p className="mt-1 text-xs leading-5 text-slate-500">Revisar incidencias y dar seguimiento con tutoría cuando corresponda.</p></div>
              </div>
              <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                <span className="mt-0.5 text-amber-600"><Clock3 size={18} /></span>
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{numero(retardos)} retardos</p><p className="mt-1 text-xs leading-5 text-slate-500">Observar puntualidad y posibles patrones recurrentes.</p></div>
              </div>
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="mt-0.5 text-slate-500"><CalendarCheck size={18} /></span>
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{numero(sinRegistro)} alumnos sin registro</p><p className="mt-1 text-xs leading-5 text-slate-500">Pendientes de verificar; no equivalen automáticamente a faltas.</p></div>
              </div>
            </div>
            <button type="button" onClick={() => navigate("/reportes")} className="cecyte-text-btn mt-auto self-start pt-5">Consultar reportes <ChevronRight size={15} /></button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="cecyte-panel min-w-0">
            <TituloPanel eyebrow="Análisis por grupo" titulo="Grupos con mayor inasistencia" descripcion="Ordenados por número de faltas para facilitar la priorización." icon={BarChart3} />
            {gruposOrdenados.length > 0 ? (
              <div className="space-y-4">
                {gruposOrdenados.slice(0, 7).map((grupo, index) => {
                  const total = Number(grupo.totalAlumnos ?? grupo.matricula ?? grupo.total ?? 0);
                  const faltasGrupo = Number(grupo.faltas ?? grupo.falta ?? 0);
                  const tasa = Number(grupo.porcentajeFaltas ?? (total > 0 ? faltasGrupo / total * 100 : 0));
                  return <div key={grupo.grupoId || grupo.id || grupo.grupo || grupo.nombre || index}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-slate-700">{grupo.grupo || grupo.nombre || `Grupo ${index + 1}`}</span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">{numero(faltasGrupo)} faltas{total > 0 ? ` · ${tasa.toFixed(1)}%` : ""}</span>
                    </div>
                    <div className="cecyte-progress"><span style={{ width: `${Math.min(100, Math.max(0, tasa))}%`, background: "#b94b55" }} /></div>
                  </div>;
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                El resumen actual no incluye faltas agrupadas por grupo. Para no mostrar información ficticia, este análisis se habilitará cuando el endpoint proporcione esos datos.
              </div>
            )}
          </div>

          <div className="cecyte-panel min-w-0">
            <TituloPanel eyebrow="Seguimiento individual" titulo="Alumnos con faltas recurrentes" descripcion="Casos que podrían requerir acompañamiento académico o tutorial." icon={UserRoundSearch} />
            {alumnosOrdenados.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {alumnosOrdenados.slice(0, 7).map((alumno, index) => (
                  <div key={alumno.alumnoId || alumno.id || index} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{alumno.alumno || alumno.nombre || "Alumno"}</p><p className="mt-0.5 text-xs text-slate-400">{alumno.grupo || "Grupo no disponible"}</p></div>
                    <span className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700">{numero(alumno.faltas ?? alumno.totalFaltas ?? 0)} faltas</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                El resumen actual no incluye historial de faltas por alumno. No se inventan nombres ni incidencias; el listado requiere que la API ya entregue ese desglose.
              </div>
            )}
            <button type="button" onClick={() => navigate("/reportes")} className="cecyte-text-btn mt-4">Abrir reportes <ChevronRight size={15} /></button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.65fr)]">
          <div className="cecyte-panel overflow-hidden !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div><p className="cecyte-eyebrow">Actividad reciente</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Últimos registros</h2></div>
              <button type="button" onClick={() => navigate("/asistencia")} className="cecyte-text-btn">Ver asistencias <ArrowUpRight size={15} /></button>
            </div>
            {registros.length === 0 ? <div className="px-6 py-10 text-center text-sm text-slate-400">Todavía no hay registros de asistencia.</div> : <>
              <div className="hidden grid-cols-[105px_minmax(0,1fr)_110px_120px] gap-3 bg-slate-50/80 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:grid"><span>Hora</span><span>Alumno</span><span>Grupo</span><span>Estado</span></div>
              <div className="divide-y divide-slate-100">
                {registros.slice(0, 8).map((registro) => {
                  const estado = ESTADOS[registro.estado] || { texto: registro.estado || "Sin estado", clase: "neutral", punto: "neutral" };
                  return <article key={registro.id} className="grid grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[105px_minmax(0,1fr)_110px_120px] sm:gap-3 sm:px-5">
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={13} className="text-slate-300" /><span className="font-medium tabular-nums">{hora(registro.fechaHora)}</span><span className="hidden text-slate-400 md:inline">{fechaCorta(registro.fechaHora)}</span></div>
                    <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5edf0] text-[10px] font-semibold text-[#64132f]">{iniciales(registro.alumno)}</span><span className="truncate text-sm font-medium text-slate-800">{registro.alumno}</span></div>
                    <div className="text-xs font-medium text-slate-500">{registro.grupo || "—"}</div>
                    <div><span className={`cecyte-status ${estado.clase}`}><i className={estado.punto} />{estado.texto}</span></div>
                  </article>;
                })}
              </div>
            </>}
          </div>

          <div className="cecyte-panel flex min-w-0 flex-col">
            <TituloPanel eyebrow="Calidad de expediente" titulo="Fotografías del alumnado" descripcion="Indicador complementario para identificación." icon={Camera} />
            <div className="mt-1 flex items-end justify-between gap-3"><span className="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">{porcentajeFotos.toFixed(1)}%</span><ImageOff size={22} className="text-emerald-700" /></div>
            <div className="cecyte-progress mt-3"><span style={{ width: `${porcentajeFotos}%`, background: "#16856b" }} /></div>
            <div className="mt-2 flex justify-between gap-2 text-xs text-slate-400"><span>{numero(tarjetas.alumnosConFoto)} con fotografía</span><span>{numero(tarjetas.alumnosSinFoto)} pendientes</span></div>
            <button type="button" onClick={() => navigate("/alumnos")} className="cecyte-text-btn mt-auto self-start pt-5">Revisar expedientes <ChevronRight size={15} /></button>
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-2 pb-2 text-[11px] text-slate-400 sm:flex-row sm:items-center">
          <span>CECyTE Hidalgo · Sistema integral de control escolar</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Actualización automática cada minuto{ultimaActualizacion ? ` · Actualizado ${hora(ultimaActualizacion.toISOString())}` : ""}</span>
        </footer>
      </div>
    </main>
  );
}

export default Dashboard;
