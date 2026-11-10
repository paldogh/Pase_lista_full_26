import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Layers, UserRound, ClipboardCheck, ScanLine, RefreshCw,
  ArrowRight, GraduationCap, CalendarDays, Activity, Clock3,
  ShieldCheck
} from "lucide-react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import api from "../api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
ChartJS.defaults.font.family = "inherit";
ChartJS.defaults.color = "#64748b";

const ESTADOS = {
  PRESENTE: { texto: "Presente", clase: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", punto: "bg-emerald-500" },
  RETARDO: { texto: "Retardo", clase: "bg-amber-50 text-amber-700 ring-amber-600/20", punto: "bg-amber-500" },
  FALTA: { texto: "Falta", clase: "bg-rose-50 text-rose-700 ring-rose-600/20", punto: "bg-rose-500" },
  JUSTIFICADA: { texto: "Justificada", clase: "bg-sky-50 text-sky-700 ring-sky-600/20", punto: "bg-sky-500" },
};

const COLUMNAS = "sm:grid-cols-[125px_minmax(0,1fr)_110px_130px]";

const formatearHora = (iso) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const formatearFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
const esHoy = (iso) => new Date(iso).toDateString() === new Date().toDateString();
const iniciales = (nombre = "") =>
  nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

function TarjetaResumen({ titulo, valor, Icono, tono, detalle }) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tono}`}>
          <Icono size={23} strokeWidth={1.9} />
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">CECyTEH</span>
      </div>
      <div className="mt-5">
        <p className="text-3xl font-extrabold tracking-tight text-slate-900">
          {(Number(valor) || 0).toLocaleString("es-MX")}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-600">{titulo}</p>
        {detalle && <p className="mt-1 text-xs text-slate-400">{detalle}</p>}
      </div>
    </article>
  );
}

function Esqueleto() {
  return (
    <div className="mx-auto flex max-w-7xl animate-pulse flex-col gap-6 p-5 md:p-8">
      <div className="h-32 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-80 rounded-2xl bg-slate-200" />
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  const cargarResumen = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/resumen", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!data.success) throw new Error(data.message);
      setResumen(data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    const id = setInterval(cargarResumen, 60000);
    return () => clearInterval(id);
  }, [cargarResumen]);

  const recargar = async () => {
    setRefrescando(true);
    await cargarResumen();
    setRefrescando(false);
  };

  if (cargando) return <Esqueleto />;

  if (!resumen) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] p-6 md:p-8">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">No se pudo cargar el panel</h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button onClick={recargar} disabled={refrescando} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#176342] px-4 py-2 text-sm font-semibold text-white hover:bg-[#104b32] disabled:opacity-60">
            <RefreshCw size={16} className={refrescando ? "animate-spin" : ""} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { tarjetas, ultimosRegistros, asistenciaSemanal } = resumen;
  const totalSemana = asistenciaSemanal.reduce(
    (acc, d) => acc + d.presente + d.retardo + d.falta + d.justificada, 0
  );
  const fechaHoy = new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const datosGrafica = {
    labels: asistenciaSemanal.map((d) => d.etiqueta),
    datasets: [
      { label: "Presente", data: asistenciaSemanal.map((d) => d.presente), backgroundColor: "#258653", borderRadius: 4, maxBarThickness: 38 },
      { label: "Retardo", data: asistenciaSemanal.map((d) => d.retardo), backgroundColor: "#e9a23b", borderRadius: 4, maxBarThickness: 38 },
      { label: "Falta", data: asistenciaSemanal.map((d) => d.falta), backgroundColor: "#d95c5c", borderRadius: 4, maxBarThickness: 38 },
      { label: "Justificada", data: asistenciaSemanal.map((d) => d.justificada), backgroundColor: "#5595c9", borderRadius: 4, maxBarThickness: 38 },
    ],
  };

  const opcionesGrafica = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, padding: 18, font: { size: 11 } } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } },
      y: { stacked: true, beginAtZero: true, suggestedMax: 5, ticks: { precision: 0, font: { size: 11 } }, grid: { color: "#edf1ee" }, border: { display: false } },
    },
  };

  return (
    <main className="min-h-screen bg-[#f4f7f5] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Encabezado institucional */}
        <header className="relative overflow-hidden rounded-2xl bg-[#123f2d] px-6 py-6 text-white shadow-sm sm:px-8">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-28 right-44 h-64 w-64 rounded-full border-[28px] border-white/5" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <GraduationCap size={31} strokeWidth={1.7} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">CECyTEH · Educación tecnológica</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Panel de control escolar</h1>
                <p className="mt-1 text-sm text-emerald-100/80">Sistema integral de registro y seguimiento de asistencia</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium capitalize text-emerald-100"><CalendarDays size={14} /> {fechaHoy}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-200/70"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Actualización automática cada minuto</div>
              </div>
              <button onClick={recargar} title="Actualizar información" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20">
                <RefreshCw size={17} className={refrescando ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </header>

        {/* Indicadores */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Activity size={17} className="text-[#176342]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Indicadores generales</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaResumen titulo="Alumnos activos" valor={tarjetas.alumnosActivos} Icono={Users} tono="bg-emerald-50 text-[#176342]" detalle="Matrícula registrada" />
            <TarjetaResumen titulo="Grupos" valor={tarjetas.grupos} Icono={Layers} tono="bg-amber-50 text-amber-700" detalle="Grupos escolares" />
            <TarjetaResumen titulo="Profesores" valor={tarjetas.profesores} Icono={UserRound} tono="bg-sky-50 text-sky-700" detalle="Personal docente" />
            <TarjetaResumen titulo="Asistencias de hoy" valor={tarjetas.asistenciasHoy} Icono={ClipboardCheck} tono="bg-violet-50 text-violet-700" detalle="Registros del día" />
          </div>
        </section>

        {/* Acceso rápido y gráfica */}
        <section className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-5">
          <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#176342] to-[#0e4a32] p-6 text-white shadow-sm sm:p-7 xl:col-span-2">
            <div className="pointer-events-none absolute -bottom-10 -right-8 text-white/[0.08]"><ScanLine size={190} strokeWidth={1} /></div>
            <div className="relative z-10">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><ScanLine size={23} /></div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">Acceso directo</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight">Pase de lista</h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-emerald-50/80">Registra y consulta la asistencia de los estudiantes de manera ágil y centralizada.</p>
            </div>
            <button onClick={() => navigate("/asistencia")} className="relative z-10 mt-7 inline-flex w-fit cursor-pointer items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#145637] shadow-sm transition hover:gap-4 hover:bg-emerald-50">
              Abrir módulo de asistencia <ArrowRight size={17} />
            </button>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#258653]" /><h2 className="text-base font-extrabold text-slate-800">Comportamiento de asistencia</h2></div>
                <p className="mt-1 text-xs text-slate-400">Concentrado de los últimos 7 días</p>
              </div>
              <span className="rounded-lg bg-[#edf5ef] px-3 py-1.5 text-xs font-bold text-[#176342]">{totalSemana.toLocaleString("es-MX")} registros</span>
            </div>
            <div className="relative h-60 w-full sm:h-64">
              <Bar data={datosGrafica} options={opcionesGrafica} />
              {totalSemana === 0 && <div className="absolute inset-0 flex items-center justify-center"><p className="rounded-lg border border-slate-100 bg-white/90 px-4 py-2 text-sm font-medium text-slate-500 shadow-sm">Sin registros en los últimos 7 días</p></div>}
            </div>
          </div>
        </section>

        {/* Actividad reciente */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf5ef] text-[#176342]"><Clock3 size={19} /></div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800">Actividad reciente</h2>
                <p className="mt-0.5 text-xs text-slate-400">Últimos movimientos de asistencia registrados</p>
              </div>
            </div>
            <button onClick={() => navigate("/asistencia")} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#176342] transition hover:bg-[#edf5ef]">Consultar asistencias <ArrowRight size={14} /></button>
          </div>

          {ultimosRegistros.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><ClipboardCheck size={22} /></div>
              <p className="text-sm font-semibold text-slate-600">Aún no hay registros de asistencia</p>
              <p className="mt-1 text-xs text-slate-400">Los movimientos aparecerán aquí cuando se registre una asistencia.</p>
            </div>
          ) : (
            <div role="table" className="w-full">
              <div role="row" className={`hidden ${COLUMNAS} gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 sm:grid`}>
                <span role="columnheader">Hora</span><span role="columnheader">Alumno</span><span role="columnheader">Grupo</span><span role="columnheader">Estado</span>
              </div>
              <div className="divide-y divide-slate-100">
                {ultimosRegistros.map((r) => {
                  const est = ESTADOS[r.estado];
                  return (
                    <div key={r.id} role="row" className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-[#f8fbf8] ${COLUMNAS} sm:px-6`}>
                      <div role="cell" className="text-sm text-slate-700">
                        <span className="font-bold tabular-nums">{formatearHora(r.fechaHora)}</span>
                        {!esHoy(r.fechaHora) && <span className="ml-2 text-xs text-slate-400">{formatearFecha(r.fechaHora)}</span>}
                      </div>
                      <div role="cell" className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f2eb] text-xs font-extrabold text-[#176342]">{iniciales(r.alumno)}</span>
                        <span className="truncate text-sm font-semibold text-slate-800">{r.alumno}</span>
                      </div>
                      <div role="cell"><span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{r.grupo}</span></div>
                      <div role="cell"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${est?.clase ?? "bg-slate-50 text-slate-600 ring-slate-500/20"}`}><span className={`h-1.5 w-1.5 rounded-full ${est?.punto ?? "bg-slate-400"}`} />{est?.texto ?? r.estado}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 pb-2 text-center text-[11px] text-slate-400 sm:flex-row sm:text-left">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Sistema de control escolar · CECyTEH</span>
          <span>Información actualizada automáticamente</span>
        </footer>
      </div>
    </main>
  );
}

export default Dashboard;
