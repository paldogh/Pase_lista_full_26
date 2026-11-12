import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

const TIPOS = [
  { id: "general", titulo: "General", detalle: "Asistencia de toda la comunidad escolar" },
  { id: "grupo", titulo: "Por grupo", detalle: "Seguimiento de asistencia de un grupo" },
];

const ESTADOS = [
  { value: "", label: "Todos los estados" },
  { value: "PRESENTE", label: "Presente" },
  { value: "RETARDO", label: "Retardo" },
  { value: "FALTA", label: "Falta" },
  { value: "JUSTIFICADA", label: "Justificada" },
];

const styles = `
.reportes-pro { --wine:#64132f; --wine2:#4d1026; --green:#16856b; color:#172235; }
.reportes-pro * { box-sizing:border-box; }
.reportes-pro .rp-card { background:#fff; border:1px solid #e7eaf0; border-radius:17px; box-shadow:0 5px 22px rgba(25,35,55,.035); }
.reportes-pro .rp-input { width:100%; min-height:42px; border:1px solid #dfe4eb; border-radius:10px; background:#fff; padding:9px 12px; color:#243247; font-size:13px; outline:none; transition:border .18s,box-shadow .18s; }
.reportes-pro .rp-input:focus { border-color:#9d7182; box-shadow:0 0 0 3px rgba(100,19,47,.09); }
.reportes-pro .rp-label { display:block; margin-bottom:7px; color:#697586; font-size:10px; font-weight:750; letter-spacing:.12em; text-transform:uppercase; }
.reportes-pro .rp-btn { display:inline-flex; min-height:40px; align-items:center; justify-content:center; gap:8px; border:1px solid #e0e5ec; border-radius:10px; background:#fff; padding:0 15px; color:#475467; font-size:12px; font-weight:650; transition:.18s; }
.reportes-pro .rp-btn:hover { border-color:#c9aab7; color:var(--wine); }
.reportes-pro .rp-btn:disabled { opacity:.55; cursor:not-allowed; }
.reportes-pro .rp-btn-primary { border-color:var(--wine); background:var(--wine); color:#fff; }
.reportes-pro .rp-btn-primary:hover { background:var(--wine2); color:#fff; }
.reportes-pro .rp-tab { min-height:42px; border-radius:10px; padding:0 15px; color:#667085; font-size:12px; font-weight:650; }
.reportes-pro .rp-tab.active { background:var(--wine); color:#fff; box-shadow:0 4px 12px rgba(100,19,47,.16); }
.reportes-pro .rp-kpi { padding:17px 18px; min-height:116px; }
.reportes-pro .rp-kpi-num { margin-top:13px; font-size:29px; line-height:1; font-weight:700; letter-spacing:-.055em; font-variant-numeric:tabular-nums; }
.reportes-pro .rp-eyebrow { color:#9a7c88; font-size:10px; font-weight:750; letter-spacing:.15em; text-transform:uppercase; }
.reportes-pro .rp-pill { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:5px 9px; font-size:10px; font-weight:700; white-space:nowrap; }
.reportes-pro .rp-pill.critical { background:#fbecee; color:#a83243; }
.reportes-pro .rp-pill.warning { background:#fff5e8; color:#9a651b; }
.reportes-pro .rp-pill.watch { background:#f1f4f8; color:#607086; }
.reportes-pro .rp-table-wrap { overflow:auto; }
.reportes-pro table { width:100%; min-width:760px; border-collapse:separate; border-spacing:0; }
.reportes-pro th { position:sticky; top:0; z-index:1; background:#f8f9fb; padding:12px 15px; color:#7b8492; text-align:left; font-size:9px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
.reportes-pro td { border-top:1px solid #edf0f4; padding:13px 15px; color:#475467; font-size:12px; vertical-align:middle; }
.reportes-pro tbody tr:hover { background:#fcfafb; }
.reportes-pro .rp-empty { padding:48px 20px; text-align:center; color:#8792a2; }
.reportes-pro .rp-bar { height:7px; overflow:hidden; border-radius:99px; background:#eef1f5; }
.reportes-pro .rp-bar > span { display:block; height:100%; border-radius:99px; background:var(--wine); }
.reportes-pro .rp-risk { border-left:3px solid transparent; }
.reportes-pro .rp-risk.critical { border-left-color:#b83b4b; }
.reportes-pro .rp-risk.warning { border-left-color:#d99a37; }
.reportes-pro .rp-risk.watch { border-left-color:#91a0b4; }
@media(max-width:700px) {
 .reportes-pro .rp-mobile-stack { align-items:stretch; flex-direction:column; }
 .reportes-pro .rp-kpi { min-height:100px; }
 .reportes-pro .rp-kpi-num { font-size:25px; }
}
`;

const unwrap = (response) => {
  const body = response?.data ?? response;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.grupos)) return body.grupos;
  return [];
};

const getAlumno = (item) => item?.alumno || item || {};
const getNombre = (a) => [a.nombre, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(" ") || "Alumno sin nombre";
const getGrupo = (item) => {
  const a = getAlumno(item);
  const g = a.Grupo || a.grupo || item.grupo;
  return typeof g === "object" ? (g?.nombre || g?.id || "—") : (g || a.grupoId || "—");
};
const getFecha = (item) => item.fechaHora || item.fecha || item.createdAt || null;
const getFechaDia = (item) => {
  const raw = getFecha(item);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const formatDate = (value) => value ? new Date(value).toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const safeText = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

function buildStudentSummary(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const alumno = getAlumno(row);
    const matricula = alumno.matricula || row.matricula || alumno.id || row.alumnoId || "sin-id";
    if (!map.has(matricula)) {
      map.set(matricula, {
        matricula,
        nombre: getNombre(alumno),
        grupo: getGrupo(row),
        tutor: alumno.Tutor?.nombre || alumno.tutor?.nombre || "—",
        telefonoTutor: alumno.Tutor?.telefono || alumno.tutor?.telefono || "",
        correoTutor: alumno.Tutor?.correo || alumno.tutor?.correo || "",
        faltas: 0,
        retardos: 0,
        presentes: 0,
        justificadas: 0,
        diasConFalta: new Set(),
        ultimaFalta: null,
      });
    }
    const student = map.get(matricula);
    const estado = String(row.estado || "").toUpperCase();
    const dia = getFechaDia(row);
    if (estado === "FALTA") {
      student.faltas += 1;
      if (dia) student.diasConFalta.add(dia);
      if (getFecha(row) && (!student.ultimaFalta || new Date(getFecha(row)) > new Date(student.ultimaFalta))) {
        student.ultimaFalta = getFecha(row);
      }
    } else if (estado === "RETARDO") student.retardos += 1;
    else if (estado === "PRESENTE") student.presentes += 1;
    else if (estado === "JUSTIFICADA") student.justificadas += 1;
  });
  return [...map.values()].map((s) => ({ ...s, diasConFalta: s.diasConFalta.size }))
    .sort((a, b) => b.faltas - a.faltas || a.nombre.localeCompare(b.nombre, "es"));
}

function nivelRiesgo(faltas) {
  // Umbrales operativos iniciales, configurables por la institución.
  if (faltas >= 6) return { label:"Prioridad alta", className:"critical" };
  if (faltas >= 3) return { label:"Requiere atención", className:"warning" };
  return { label:"En observación", className:"watch" };
}

function descargarCSV(alumnos) {
  const headers = ["Matricula","Alumno","Grupo","Faltas registradas","Dias distintos con falta","Retardos","Ultima falta","Tutor","Telefono tutor","Correo tutor","Nivel de seguimiento"];
  const rows = alumnos.map((a) => [
    a.matricula, a.nombre, a.grupo, a.faltas, a.diasConFalta, a.retardos,
    a.ultimaFalta ? formatDate(a.ultimaFalta) : "", a.tutor, a.telefonoTutor, a.correoTutor, nivelRiesgo(a.faltas).label
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${safeText(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `seguimiento_inasistencias_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reportes() {
  const [tipo, setTipo] = useState("general");
  const [grupos, setGrupos] = useState([]);
  const [filtros, setFiltros] = useState({ grupoId:"", estado:"", fechaInicio:"", fechaFin:"" });
  const [registros, setRegistros] = useState([]);
  const [consultado, setConsultado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [umbral, setUmbral] = useState(3);

  const cargarCatalogos = useCallback(async () => {
    setCargandoCatalogos(true);
    try {
      const resultadoGrupos = await api.get("/grupos");
      setGrupos(unwrap(resultadoGrupos));
    } catch (error) {
      console.error("No fue posible cargar los grupos:", error);
      setGrupos([]);
    } finally {
      setCargandoCatalogos(false);
    }
  }, []);

  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  const consultar = async (sobrescribir = {}) => {
    const f = { ...filtros, ...sobrescribir };
    if (f.fechaInicio && f.fechaFin && f.fechaInicio > f.fechaFin) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([,v]) => v !== "" && v !== null && v !== undefined));
      const response = await api.get(`/reportes/${tipo}`, { params });
      const body = response.data;
      if (body?.success === false || body?.ok === false) {
        throw new Error(body.message || body.mensaje || "No fue posible consultar el reporte.");
      }
      const rows = unwrap(response);
      setRegistros(rows);
      setConsultado(true);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.mensaje || err.message || "Error al consultar los reportes.");
      setRegistros([]);
      setConsultado(true);
    } finally {
      setCargando(false);
    }
  };

  const limpiar = () => {
    setFiltros({ grupoId:"", estado:"", fechaInicio:"", fechaFin:"" });
    setBusqueda("");
    setRegistros([]);
    setConsultado(false);
    setError("");
  };

  const resumen = useMemo(() => {
    const alumnos = buildStudentSummary(registros);
    const totalFaltas = registros.filter((r) => String(r.estado).toUpperCase() === "FALTA").length;
    const totalRetardos = registros.filter((r) => String(r.estado).toUpperCase() === "RETARDO").length;
    const alumnosConFalta = alumnos.filter((a) => a.faltas > 0);
    const alumnosEnRiesgo = alumnosConFalta.filter((a) => a.faltas >= umbral);
    return { alumnos, totalFaltas, totalRetardos, alumnosConFalta, alumnosEnRiesgo };
  }, [registros, umbral]);

  const listaSeguimiento = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return resumen.alumnosConFalta.filter((a) =>
      !q || [a.nombre, a.matricula, a.grupo, a.tutor, a.telefonoTutor].some((v) => String(v || "").toLocaleLowerCase("es").includes(q))
    );
  }, [resumen.alumnosConFalta, busqueda]);

  const porcentajeFaltas = registros.length ? (resumen.totalFaltas / registros.length) * 100 : 0;

  const aplicarRapido = (dias) => {
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(fin.getDate() - dias + 1);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const next = { ...filtros, fechaInicio:iso(inicio), fechaFin:iso(fin) };
    setFiltros(next);
    consultar(next);
  };

  return (
    <div className="reportes-pro w-full space-y-6">
      <style>{styles}</style>

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-600" /><span className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">CECyTE Hidalgo · Control escolar</span></div>
          <h1 className="text-3xl font-semibold tracking-[-.045em] text-slate-900">Seguimiento de asistencia</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">Identifica patrones de inasistencia y prioriza la atención de alumnos que necesitan acompañamiento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rp-btn" onClick={cargarCatalogos} disabled={cargandoCatalogos}>↻ Actualizar catálogos</button>
          <button className="rp-btn" onClick={() => descargarCSV(listaSeguimiento)} disabled={!listaSeguimiento.length}>↓ Exportar seguimiento</button>
        </div>
      </header>

      <section className="rp-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="rp-eyebrow">Tipo de consulta</p><h2 className="mt-1 text-base font-semibold text-slate-900">Explora la asistencia</h2></div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {TIPOS.map((t) => <button key={t.id} onClick={() => { setTipo(t.id); setRegistros([]); setConsultado(false); }} className={`rp-tab ${tipo === t.id ? "active" : ""}`}>{t.titulo}</button>)}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">{TIPOS.find((t) => t.id === tipo)?.detalle}</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div><label className="rp-label" htmlFor="rp-grupo">Grupo</label><select id="rp-grupo" className="rp-input" value={filtros.grupoId} onChange={(e) => setFiltros((p) => ({...p,grupoId:e.target.value}))}><option value="">Todos los grupos</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre || g.id}</option>)}</select></div>
          <div><label className="rp-label" htmlFor="rp-estado">Estado</label><select id="rp-estado" className="rp-input" value={filtros.estado} onChange={(e) => setFiltros((p) => ({...p,estado:e.target.value}))}>{ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}</select></div>
          <div><label className="rp-label" htmlFor="rp-inicio">Fecha inicial</label><input id="rp-inicio" className="rp-input" type="date" value={filtros.fechaInicio} onChange={(e) => setFiltros((p) => ({...p,fechaInicio:e.target.value}))}/></div>
          <div><label className="rp-label" htmlFor="rp-fin">Fecha final</label><input id="rp-fin" className="rp-input" type="date" value={filtros.fechaFin} onChange={(e) => setFiltros((p) => ({...p,fechaFin:e.target.value}))}/></div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2"><button className="rp-btn" onClick={() => aplicarRapido(7)}>Últimos 7 días</button><button className="rp-btn" onClick={() => aplicarRapido(30)}>Últimos 30 días</button><button className="rp-btn" onClick={() => aplicarRapido(90)}>Últimos 90 días</button></div>
          <div className="flex gap-2"><button className="rp-btn" onClick={limpiar}>Limpiar</button><button className="rp-btn rp-btn-primary" onClick={() => consultar()} disabled={cargando}>{cargando ? "Consultando…" : "Consultar asistencia →"}</button></div>
        </div>
        {cargandoCatalogos && <p className="mt-3 text-xs text-slate-400">Cargando grupos…</p>}
        {!cargandoCatalogos && !grupos.length && <p className="mt-3 text-xs text-amber-700">No se encontraron grupos. Puedes consultar el reporte general por fechas.</p>}
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">No se pudo completar la consulta: {error}</div>}

      {consultado && !cargando && (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <article className="rp-card rp-kpi"><p className="rp-eyebrow">Registros consultados</p><div className="rp-kpi-num">{registros.length.toLocaleString("es-MX")}</div><p className="mt-2 text-xs text-slate-400">Registros de acceso al plantel</p></article>
            <article className="rp-card rp-kpi"><p className="rp-eyebrow">Faltas registradas</p><div className="rp-kpi-num text-rose-700">{resumen.totalFaltas.toLocaleString("es-MX")}</div><p className="mt-2 text-xs text-slate-400">{porcentajeFaltas.toFixed(1)}% de los registros consultados</p></article>
            <article className="rp-card rp-kpi"><p className="rp-eyebrow">Alumnos con faltas</p><div className="rp-kpi-num">{resumen.alumnosConFalta.length.toLocaleString("es-MX")}</div><p className="mt-2 text-xs text-slate-400">Al menos una falta en el periodo</p></article>
            <article className="rp-card rp-kpi"><p className="rp-eyebrow">Requieren atención</p><div className="rp-kpi-num text-amber-700">{resumen.alumnosEnRiesgo.length.toLocaleString("es-MX")}</div><p className="mt-2 text-xs text-slate-400">Con {umbral} o más faltas registradas</p></article>
          </section>

          <section className="rp-card overflow-hidden">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div><p className="rp-eyebrow">Intervención escolar</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Alumnos que requieren seguimiento</h2><p className="mt-1 text-xs text-slate-400">Ordenados de mayor a menor número de faltas.</p></div>
              <div className="flex flex-wrap items-center gap-2"><label className="text-xs text-slate-500" htmlFor="rp-umbral">Umbral de atención</label><select id="rp-umbral" className="rp-input !w-auto" value={umbral} onChange={(e) => setUmbral(Number(e.target.value))}><option value="1">1 o más</option><option value="2">2 o más</option><option value="3">3 o más</option><option value="5">5 o más</option><option value="6">6 o más</option></select></div>
            </div>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <input className="rp-input sm:max-w-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar alumno, matrícula, grupo o tutor…" />
              <span className="text-xs text-slate-400">{listaSeguimiento.length} alumnos en seguimiento</span>
            </div>
            {listaSeguimiento.length ? (
              <div className="rp-table-wrap">
                <table>
                  <thead><tr><th>Alumno</th><th>Grupo</th><th>Faltas</th><th>Días distintos</th><th>Retardos</th><th>Última falta</th><th>Responsable / contacto</th><th>Prioridad</th></tr></thead>
                  <tbody>{listaSeguimiento.map((a) => {
                    const risk = nivelRiesgo(a.faltas);
                    const tel = a.telefonoTutor ? `Tel. ${a.telefonoTutor}` : "";
                    return <tr key={a.matricula} className={`rp-risk ${risk.className}`}>
                      <td><div className="font-semibold text-slate-800">{a.nombre}</div><div className="mt-1 text-[10px] text-slate-400">{a.matricula}</div></td>
                      <td>{a.grupo}</td>
                      <td><span className="font-bold text-rose-700">{a.faltas}</span></td>
                      <td>{a.diasConFalta}</td>
                      <td>{a.retardos}</td>
                      <td>{formatDate(a.ultimaFalta)}</td>
                      <td><div className="font-medium text-slate-700">{a.tutor}</div>{tel && <div className="mt-1 text-[10px] text-slate-500">{tel}</div>}{a.correoTutor && <div className="mt-1 text-[10px] text-slate-500">{a.correoTutor}</div>}</td>
                      <td><span className={`rp-pill ${risk.className}`}>{risk.label}</span></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            ) : <div className="rp-empty"><div className="text-3xl">✓</div><p className="mt-3 font-semibold text-slate-700">No hay alumnos con faltas en esta consulta</p><p className="mt-1 text-xs">Prueba con otro periodo o revisa los filtros seleccionados.</p></div>}
          </section>

          <section className="rp-card overflow-hidden">
            <div className="border-b border-slate-100 p-5"><p className="rp-eyebrow">Detalle de consulta</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Registros de acceso al plantel</h2><p className="mt-1 text-xs text-slate-400">Detalle devuelto por el reporte existente del sistema.</p></div>
            {registros.length ? <div className="rp-table-wrap"><table><thead><tr><th>Fecha y hora</th><th>Alumno</th><th>Matrícula</th><th>Grupo</th><th>Estado</th></tr></thead><tbody>{registros.map((r, i) => {
              const a = getAlumno(r);
              const estado = String(r.estado || "—").toUpperCase();
              const color = estado === "FALTA" ? "critical" : estado === "RETARDO" ? "warning" : "watch";
              return <tr key={r.id || `${a.matricula || i}-${i}`}><td>{getFecha(r) ? new Date(getFecha(r)).toLocaleString("es-MX") : "—"}</td><td className="font-medium text-slate-800">{getNombre(a)}</td><td>{a.matricula || r.matricula || "—"}</td><td>{getGrupo(r)}</td><td><span className={`rp-pill ${color}`}>{estado}</span></td></tr>;
            })}</tbody></table></div> : <div className="rp-empty">No hay registros para los filtros seleccionados.</div>}
          </section>
        </>
      )}

      {!consultado && !cargando && (
        <section className="rp-card grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><p className="rp-eyebrow">Centro de seguimiento</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Detecta a tiempo las inasistencias</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Selecciona un periodo y consulta. El sistema agrupará los registros por alumno, contará faltas y días distintos con falta, y ordenará los casos para facilitar la intervención de dirección y tutoría.</p></div>
          <div className="rounded-xl bg-[#f6eef1] px-5 py-4 text-sm text-[#64132f]"><div className="font-semibold">Flujo recomendado</div><div className="mt-1 text-xs leading-5 text-[#865c6c]">Consultar → identificar → contactar tutor → documentar seguimiento</div></div>
        </section>
      )}

      <footer className="pb-2 text-[11px] text-slate-400">CECyTE Hidalgo · Seguimiento de asistencia · Los niveles de prioridad son umbrales operativos configurables, no sanciones automáticas.</footer>
    </div>
  );
}
