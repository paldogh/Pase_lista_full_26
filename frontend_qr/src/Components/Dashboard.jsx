import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, ClipboardCheck, Camera, ImageOff, CalendarCheck, UserX, ScanLine,
  RefreshCw, ArrowUpRight, ChevronRight, CalendarDays,
  Clock3, Activity, ShieldCheck, AlertCircle, Timer
} from "lucide-react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import api from "../api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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
const hora = (iso) => new Date(iso).toLocaleTimeString("es-MX", {
  hour: "2-digit", minute: "2-digit",
});
const fechaCorta = (iso) => new Date(iso).toLocaleDateString("es-MX", {
  day: "2-digit", month: "short",
});
const esHoy = (iso) => new Date(iso).toDateString() === new Date().toDateString();
const iniciales = (nombre = "") => nombre.split(" ").filter(Boolean).slice(0, 2)
  .map((parte) => parte[0]).join("").toUpperCase();

function IconoKpi({ icon: Icon, tone }) {
  return (
    <span className={`cecyte-kpi-icon ${tone}`}>
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

function TarjetaKpi({ titulo, valor, icon, tone, nota, accion }) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <IconoKpi icon={icon} tone={tone} />
        {accion && <ArrowUpRight size={16} className="text-slate-300" aria-hidden="true" />}
      </div>
      <div className="mt-5">
        <p className="text-[clamp(1.65rem,2.5vw,2.15rem)] font-semibold tracking-[-0.055em] text-slate-900 tabular-nums">
          {numero(valor)}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-600">{titulo}</p>
        {nota && <p className="mt-1 text-xs text-slate-400">{nota}</p>}
      </div>
    </>
  );

  if (accion) {
    return <button type="button" onClick={accion} className="cecyte-kpi cecyte-kpi-action text-left">{contenido}</button>;
  }
  return <article className="cecyte-kpi">{contenido}</article>;
}

function Esqueleto() {
  return (
    <main className="cecyte-dashboard animate-pulse">
      <div className="mx-auto max-w-[1440px] space-y-7">
        <div className="h-16 rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-slate-200" />)}
        </div>
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

  const cargarResumen = useCallback(async (silencioso = false) => {
    try {
      const { data } = await api.get("/dashboard/resumen");
      if (!data?.success) throw new Error(data?.message || "Respuesta no válida del servidor.");
      setResumen(data.data);
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
  const porcentajeFotos = Math.min(100, Math.max(0, Number(
    tarjetas.porcentajeFotos ??
    (tarjetas.alumnosActivos ? (tarjetas.alumnosConFoto / tarjetas.alumnosActivos) * 100 : 0)
  )));
  const totalSemana = useMemo(
    () => semana.reduce((total, dia) => total + Number(dia.presente || 0) +
      Number(dia.retardo || 0) + Number(dia.falta || 0) + Number(dia.justificada || 0), 0),
    [semana]
  );

  const datosGrafica = useMemo(() => ({
    labels: semana.map((dia) => dia.etiqueta),
    datasets: [
      { label: "Presente", data: semana.map((d) => d.presente || 0), backgroundColor: "#16856b", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
      { label: "Retardo", data: semana.map((d) => d.retardo || 0), backgroundColor: "#e8a23a", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
      { label: "Falta", data: semana.map((d) => d.falta || 0), backgroundColor: "#b94b55", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
      { label: "Justificada", data: semana.map((d) => d.justificada || 0), backgroundColor: "#8296b5", borderRadius: 5, maxBarThickness: 34, borderSkipped: false },
    ],
  }), [semana]);

  const opcionesGrafica = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, boxHeight: 7, padding: 18, color: "#667085", font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "#25151c",
        padding: 11,
        cornerRadius: 9,
        titleFont: { weight: "600" },
        bodyFont: { size: 11 },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: "#8993a2", font: { size: 11 } } },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: "#8993a2", font: { size: 10 } }, grid: { color: "#f0f2f5" }, border: { display: false } },
    },
  }), []);

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
      <style>{`\n/* CECyTE Hidalgo · Dashboard minimalista */
.cecyte-dashboard {
  --wine: #64132f;
  --wine-dark: #4d1026;
  --green: #16856b;
  --orange: #e8a23a;
  min-height: 100vh;
  background: #f7f8fa;
  padding: clamp(1rem, 2.7vw, 2.25rem);
  color: #172235;
}

.cecyte-dashboard .cecyte-kpi,
.cecyte-dashboard .cecyte-panel {
  border: 1px solid #e7eaf0;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(22, 31, 48, .025), 0 10px 28px rgba(22, 31, 48, .025);
}

.cecyte-dashboard .cecyte-kpi {
  display: flex;
  min-height: 158px;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.25rem 1.35rem;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.cecyte-dashboard .cecyte-kpi-action {
  width: 100%;
  cursor: pointer;
}

.cecyte-dashboard .cecyte-kpi-action:hover {
  transform: translateY(-2px);
  border-color: #d8c1ca;
  box-shadow: 0 12px 30px rgba(100, 19, 47, .07);
}

.cecyte-dashboard .cecyte-kpi-action:focus-visible,
.cecyte-dashboard button:focus-visible {
  outline: 3px solid rgba(100, 19, 47, .2);
  outline-offset: 3px;
}

.cecyte-dashboard .cecyte-kpi-icon {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.cecyte-dashboard .tone-wine { background: #f5edf0; color: #64132f; }
.cecyte-dashboard .tone-green { background: #eaf5f1; color: #16856b; }
.cecyte-dashboard .tone-orange { background: #fbf3e8; color: #bd7924; }
.cecyte-dashboard .tone-slate { background: #eef1f5; color: #64748b; }

.cecyte-dashboard .cecyte-panel {
  min-width: 0;
  padding: clamp(1.15rem, 2vw, 1.55rem);
}

.cecyte-dashboard .cecyte-eyebrow {
  color: #9a7c88;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.cecyte-dashboard .cecyte-icon-btn {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e6ec;
  border-radius: 11px;
  background: white;
  color: #667085;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .04);
  transition: all .18s ease;
}

.cecyte-dashboard .cecyte-icon-btn:hover {
  border-color: #d7bdc7;
  color: var(--wine);
}

.cecyte-dashboard .cecyte-primary-btn {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 11px;
  background: var(--wine);
  padding: 0 16px;
  color: white;
  font-size: 13px;
  font-weight: 650;
}

.cecyte-dashboard .cecyte-primary-btn:hover { background: var(--wine-dark); }
.cecyte-dashboard .cecyte-primary-btn:disabled { opacity: .6; cursor: wait; }

.cecyte-dashboard .cecyte-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--wine);
  font-size: 12px;
  font-weight: 700;
  transition: gap .18s ease;
}
.cecyte-dashboard .cecyte-text-btn:hover { gap: 9px; }

.cecyte-dashboard .cecyte-cta {
  min-height: 300px;
  overflow: hidden;
  border: 1px solid #5c1832;
  border-radius: 17px;
  background:
    radial-gradient(ellipse at 100% 0%, rgba(255,255,255,.12), transparent 45%),
    linear-gradient(135deg, #741b3b 0%, #4d1026 100%);
  padding: clamp(1.4rem, 2.5vw, 2rem);
  box-shadow: 0 12px 30px rgba(77, 16, 38, .12);
}

.cecyte-dashboard .cecyte-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}
.cecyte-dashboard .cecyte-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.cecyte-dashboard .cecyte-status .presente { background: #16856b; }
.cecyte-dashboard .cecyte-status .retardo { background: #d28a27; }
.cecyte-dashboard .cecyte-status .falta { background: #b94b55; }
.cecyte-dashboard .cecyte-status .justificada { background: #8296b5; }
.cecyte-dashboard .cecyte-status .neutral { background: #94a3b8; }
.cecyte-dashboard .cecyte-status.presente { background: #edf7f3; color: #14765f; }
.cecyte-dashboard .cecyte-status.retardo { background: #fbf4e9; color: #9b681e; }
.cecyte-dashboard .cecyte-status.falta { background: #fbefef; color: #a83d48; }
.cecyte-dashboard .cecyte-status.justificada { background: #eff3f8; color: #617894; }
.cecyte-dashboard .cecyte-status.neutral { background: #f1f3f6; color: #64748b; }

@media (max-width: 640px) {
  .cecyte-dashboard { padding: 1rem .8rem; }
  .cecyte-dashboard .cecyte-kpi { min-height: 138px; padding: 1rem; }
  .cecyte-dashboard .cecyte-panel { border-radius: 14px; }
  .cecyte-dashboard .cecyte-cta { min-height: 260px; border-radius: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .cecyte-dashboard *,
  .cecyte-dashboard *::before,
  .cecyte-dashboard *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
  }
}
\n      `}</style>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-[.19em] text-slate-400">CECyTE Hidalgo · Control escolar</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-.045em] text-slate-900 sm:text-[2.15rem]">Panel principal</h1>
            <p className="mt-1.5 text-sm text-slate-500">Resumen operativo del control de asistencia.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium capitalize text-slate-600 shadow-sm">
              <CalendarDays size={15} className="text-slate-400" /> {fechaCompleta()}
            </span>
            <button type="button" onClick={recargar} disabled={refrescando} title="Actualizar información" aria-label="Actualizar información" className="cecyte-icon-btn">
              <RefreshCw size={16} className={refrescando ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={16} /> No se pudo actualizar la información. Se muestran los últimos datos disponibles.
          </div>
        )}

        <section aria-label="Indicadores de asistencia del plantel" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TarjetaKpi titulo="Alumnos activos" valor={tarjetas.alumnosActivos} icon={Users} tone="tone-wine" accion={() => navigate("/alumnos")} />
          <TarjetaKpi titulo="Asistencias registradas hoy" valor={tarjetas.asistenciasHoy} icon={ClipboardCheck} tone="tone-green" nota={`${numero(tarjetas.presentesHoy)} presentes · ${numero(tarjetas.retardosHoy)} retardos`} accion={() => navigate("/asistencia")} />
          <TarjetaKpi titulo="Faltas registradas hoy" valor={tarjetas.faltasHoy} icon={UserX} tone="tone-orange" nota="Faltas marcadas explícitamente" accion={() => navigate("/reportes")} />
          <TarjetaKpi titulo="Alumnos sin registro hoy" valor={tarjetas.alumnosSinRegistroHoy} icon={CalendarCheck} tone="tone-slate" nota="Pendientes de verificar; no equivale automáticamente a falta" accion={() => navigate("/reportes")} />
          <TarjetaKpi titulo="Alumnos con fotografía" valor={tarjetas.alumnosConFoto} icon={Camera} tone="tone-green" nota={`${porcentajeFotos.toFixed(1)}% de cobertura`} accion={() => navigate("/alumnos")} />
          <TarjetaKpi titulo="Fotografías pendientes" valor={tarjetas.alumnosSinFoto} icon={ImageOff} tone="tone-orange" nota="Alumnos activos sin fotografía" accion={() => navigate("/alumnos")} />
        </section>

        <section className="cecyte-panel grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="cecyte-eyebrow">Expedientes digitales</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Cobertura fotográfica</h2>
              </div>
              <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{porcentajeFotos.toFixed(1)}%</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Avance de expedientes visuales del alumnado activo.</p>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#16856b] transition-all duration-700" style={{ width: `${porcentajeFotos}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
              <span>{numero(tarjetas.alumnosConFoto)} expedientes con foto</span>
              <span>{numero(tarjetas.alumnosSinFoto)} pendientes</span>
            </div>
          </div>
          <div className="flex flex-col justify-center border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><ShieldCheck size={17} className="text-[#16856b]" /> Expediente visual</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Mantén actualizado el expediente fotográfico para agilizar la identificación durante el acceso al plantel.</p>
            <button type="button" onClick={() => navigate("/alumnos")} className="cecyte-text-btn mt-4 self-start">Revisar alumnos <ChevronRight size={15} /></button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Desglose de asistencia de hoy">
          <article className="cecyte-panel !p-4">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Presentes hoy</span><span className="cecyte-kpi-icon tone-green"><Users size={18} /></span></div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{numero(tarjetas.presentesHoy)}</p>
            <p className="mt-1 text-xs text-slate-500">Registros con estado presente</p>
          </article>
          <article className="cecyte-panel !p-4">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Retardos hoy</span><span className="cecyte-kpi-icon tone-orange"><Timer size={18} /></span></div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{numero(tarjetas.retardosHoy)}</p>
            <p className="mt-1 text-xs text-slate-500">Registros con estado retardo</p>
          </article>
          <article className="cecyte-panel !p-4">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Justificadas hoy</span><span className="cecyte-kpi-icon tone-slate"><ShieldCheck size={18} /></span></div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{numero(tarjetas.justificadasHoy)}</p>
            <p className="mt-1 text-xs text-slate-500">Registros con estado justificada</p>
          </article>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(270px,.78fr)_minmax(0,1.7fr)]">
          <div className="cecyte-cta flex flex-col justify-between gap-8">
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15"><ScanLine size={21} /></span>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[.18em] text-white/55">Control de asistencia</p>
              <h2 className="mt-2 max-w-xs text-2xl font-semibold leading-tight tracking-[-.035em] text-white">Comienza el pase de lista.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">Accede al registro de asistencia y consulta la actividad de tus grupos.</p>
            </div>
            <button type="button" onClick={() => navigate("/asistencia")} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 text-sm font-semibold text-[#64132f] transition hover:bg-rose-50">
              Iniciar pase de lista <ArrowUpRight size={16} />
            </button>
          </div>

          <section className="cecyte-panel min-w-0">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="cecyte-eyebrow">Actividad semanal</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Registro de asistencia</h2>
                <p className="mt-1 text-xs text-slate-400">Comparativo diario de presentes, retardos, faltas y justificadas</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">{numero(totalSemana)} registros</span>
            </div>
            <div className="relative h-[260px] w-full">
              <Bar data={datosGrafica} options={opcionesGrafica} />
              {totalSemana === 0 && <div className="absolute inset-0 flex items-center justify-center"><span className="rounded-lg border border-slate-100 bg-white/90 px-4 py-2 text-sm text-slate-400">Sin registros en los últimos 7 días</span></div>}
            </div>
          </section>
        </section>

        <section className="cecyte-panel overflow-hidden !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <p className="cecyte-eyebrow">Actividad reciente del plantel</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Últimos registros</h2>
            </div>
            <button type="button" onClick={() => navigate("/asistencia")} className="cecyte-text-btn">Ver asistencias <ArrowUpRight size={15} /></button>
          </div>

          {registros.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Activity size={21} /></span>
              <p className="mt-3 text-sm font-medium text-slate-700">Todavía no hay registros</p>
              <p className="mt-1 text-xs text-slate-400">Cuando se registre asistencia, aparecerá aquí.</p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[130px_minmax(0,1fr)_140px_140px] gap-4 bg-slate-50/80 px-6 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-slate-400 sm:grid">
                <span>Hora</span><span>Alumno</span><span>Grupo</span><span>Estado</span>
              </div>
              <div className="divide-y divide-slate-100">
                {registros.map((registro) => {
                  const estado = ESTADOS[registro.estado] || { texto: registro.estado || "Sin estado", clase: "neutral", punto: "neutral" };
                  return (
                    <article key={registro.id} className="grid grid-cols-2 items-center gap-x-3 gap-y-2 px-5 py-4 transition hover:bg-slate-50/70 sm:grid-cols-[130px_minmax(0,1fr)_140px_140px] sm:gap-4 sm:px-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock3 size={14} className="text-slate-300" />
                        <span className="font-medium tabular-nums">{hora(registro.fechaHora)}</span>
                        {!esHoy(registro.fechaHora) && <span className="hidden text-xs text-slate-400 md:inline">{fechaCorta(registro.fechaHora)}</span>}
                      </div>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5edf0] text-[11px] font-semibold text-[#64132f]">{iniciales(registro.alumno)}</span>
                        <span className="truncate text-sm font-medium text-slate-800">{registro.alumno}</span>
                      </div>
                      <div><span className="text-xs font-medium text-slate-500">{registro.grupo}</span></div>
                      <div><span className={`cecyte-status ${estado.clase}`}><i className={estado.punto} />{estado.texto}</span></div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 pb-2 text-[11px] text-slate-400">
          <span>CECyTE Hidalgo · Sistema integral de control escolar</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Actualización automática cada minuto</span>
        </footer>
      </div>
    </main>
  );
}

export default Dashboard;
