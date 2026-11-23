import api from "../api";
import { useState, useEffect } from "react";

import RegistrarAsistencia from "./RegistrarAsistencia"; 


const ESTILOS_ESTADO = {
    PRESENTE: { dot: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50" },
};

const COLORES_AVATAR = [
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-teal-100 text-teal-700 border-teal-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-violet-100 text-violet-700 border-violet-200",
];

function obtenerIniciales(nombre, apellido) {
    const n = nombre?.charAt(0) || "";
    const a = apellido?.charAt(0) || "";
    return (n + a).toUpperCase() || "?";
}

function Asistencia() {
    const [vista, setVista] = useState("consultar");
    const [modo, setModo] = useState("todos");
    const [matricula, setMatricula] = useState("");
    const [fecha, setFecha] = useState("");
    const [asistencias, setAsistencias] = useState([]);
    const [alumnoInfo, setAlumnoInfo] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const buscarTodos = async () => {
        setCargando(true);
        setMensaje("");
        setAlumnoInfo(null);
        try {
            const respuesta = await api.get(`/asistencias`);
            const datos = respuesta.data.data || [];
            setAsistencias(datos);
            if (datos.length === 0) setMensaje("No hay asistencias registradas todavía.");
        } catch (error) {
            console.error("Error al buscar todos:", error);
            setAsistencias([]);
            setMensaje("Error al consultar las asistencias.");
        } finally {
            setCargando(false);
        }
    };

    const buscarPorMatricula = async () => {
        if (!matricula.trim()) {
            setMensaje("Escribe una matrícula para buscar.");
            return;
        }
        setCargando(true);
        setMensaje("");
        try {
            const respuesta = await api.get(`/asistencias/alumno/${matricula.trim()}`);
            setAsistencias(respuesta.data.data || []);
            setAlumnoInfo(respuesta.data.alumno || null);
        } catch (error) {
            console.error("Error por matrícula:", error);
            setAsistencias([]);
            setAlumnoInfo(null);
            if (error.response?.status === 404) {
                setMensaje(error.response.data.message || "Alumno no encontrado.");
            } else {
                setMensaje("Error al consultar las asistencias.");
            }
        } finally {
            setCargando(false);
        }
    };

    const buscarPorFecha = async () => {
        if (!fecha) {
            setMensaje("Selecciona una fecha para buscar.");
            return;
        }
        setCargando(true);
        setMensaje("");
        setAlumnoInfo(null);
        try {
            const respuesta = await api.get(`/asistencias/fecha/${fecha}`);
            setAsistencias(respuesta.data.data || []);
        } catch (error) {
            console.error("Error por fecha:", error);
            setAsistencias([]);
            if (error.response?.status === 404) {
                setMensaje(error.response.data.message || "No hay asistencias en esa fecha.");
            } else {
                setMensaje("Error al consultar las asistencias.");
            }
        } finally {
            setCargando(false);
        }
    };

    const manejarBuscar = () => {
        if (modo === "todos") buscarTodos();
        if (modo === "matricula") buscarPorMatricula();
        if (modo === "fecha") buscarPorFecha();
    };

    const cambiarModo = (nuevoModo) => {
        setModo(nuevoModo);
        setAsistencias([]);
        setAlumnoInfo(null);
        setMensaje("");
    };

    useEffect(() => {
        if (modo === "todos" && vista === "consultar") buscarTodos();
    }, [modo, vista]);

    // Indicadores calculados exclusivamente a partir de los registros devueltos por la API.
    const totalRegistros = asistencias.length;
    const presentes = asistencias.filter(a => String(a.estado || "").toUpperCase() === "PRESENTE").length;
    const otrosEstados = totalRegistros - presentes;
    const alumnosUnicos = new Set(asistencias.map(a => a.alumno?.matricula).filter(Boolean)).size;
    const materiasUnicas = new Set(asistencias.map(a => a.sesionQR?.mmg?.materia?.nombre).filter(Boolean)).size;
    const docentesUnicos = new Set(asistencias.map(a => a.sesionQR?.mmg?.maestro?.nombre).filter(Boolean)).size;
    const porcentajePresentes = totalRegistros ? Math.round((presentes / totalRegistros) * 100) : 0;
    const fechaConsulta = modo === "fecha" && fecha
        ? new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", { dateStyle: "long" })
        : "Consulta general";

    const obtenerEstilo = (estado) => {
        const valor = String(estado || "").toUpperCase();
        if (valor === "PRESENTE") return { dot: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50 border-emerald-100" };
        if (valor === "RETARDO") return { dot: "bg-amber-500", text: "text-amber-700 bg-amber-50 border-amber-100" };
        if (valor === "JUSTIFICADO" || valor === "FALTA JUSTIFICADA") return { dot: "bg-sky-500", text: "text-sky-700 bg-sky-50 border-sky-100" };
        return { dot: "bg-slate-400", text: "text-slate-600 bg-slate-100 border-slate-200" };
    };

    return (
        <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-8 py-5 sm:py-8 space-y-6">
            {/* Encabezado ejecutivo */}
            <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 sm:p-7 text-white shadow-lg">
                <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-rose-900/30 blur-3xl" />
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-rose-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Gestión académica · Control escolar
                        </div>
                        <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">Control de asistencias</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            Consulta y supervisa los registros de asistencia para identificar patrones y dar seguimiento oportuno.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {vista === "consultar" && (
                            <button onClick={() => setVista("registrar")}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-rose-600">
                                <span className="text-lg leading-none">+</span> Registrar asistencia
                            </button>
                        )}
                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Vista actual</p>
                            <p className="mt-1 text-sm font-semibold text-white">{vista === "consultar" ? "Supervisión ejecutiva" : "Captura de asistencia"}</p>
                        </div>
                    </div>
                </div>
            </header>

            {vista === "registrar" ? (
                <RegistrarAsistencia
                    alVolver={() => setVista("consultar")}
                    onAsistenciaCreada={() => { if (modo === "todos") buscarTodos(); }}
                />
            ) : (
                <>
                    {/* Filtros */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Explorar información</p>
                                <h2 className="mt-1 text-lg font-bold text-slate-900">Consulta de registros</h2>
                                <p className="mt-1 text-sm text-slate-500">Filtra por periodo o estudiante para revisar el historial.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: "todos", label: "Todos los registros", icon: "▤" },
                                    { id: "fecha", label: "Por fecha", icon: "▦" },
                                    { id: "matricula", label: "Por matrícula", icon: "⌕" }
                                ].map(opcion => (
                                    <button key={opcion.id} onClick={() => cambiarModo(opcion.id)}
                                        className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${modo === opcion.id
                                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"}`}>
                                        <span className="mr-2 opacity-70">{opcion.icon}</span>{opcion.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {modo !== "todos" && (
                            <div className="mt-5 flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-5">
                                {modo === "matricula" ? (
                                    <div className="w-full sm:max-w-md">
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Matrícula del estudiante</label>
                                        <input type="text" value={matricula} onChange={e => setMatricula(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && manejarBuscar()}
                                            placeholder="Ej. 2330852"
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10" />
                                    </div>
                                ) : (
                                    <div className="w-full sm:max-w-xs">
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Fecha de consulta</label>
                                        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10" />
                                    </div>
                                )}
                                <button onClick={manejarBuscar} disabled={cargando}
                                    className="h-11 self-end rounded-xl bg-rose-700 px-6 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60">
                                    {cargando ? "Consultando..." : "Aplicar consulta"}
                                </button>
                            </div>
                        )}
                    </section>

                    {alumnoInfo && (
                        <section className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-800 text-sm font-bold text-white">
                                {obtenerIniciales(alumnoInfo.nombre, alumnoInfo.apellidoPaterno)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Expediente consultado</p>
                                <p className="truncate font-bold text-slate-900">{alumnoInfo.nombre} {alumnoInfo.apellidoPaterno} {alumnoInfo.apellidoMaterno || ""}</p>
                                <p className="text-xs text-slate-500">Matrícula: {alumnoInfo.matricula}</p>
                            </div>
                        </section>
                    )}

                    {/* Indicadores de la consulta */}
                    {!cargando && asistencias.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Indicadores de la consulta</p>
                                    <h2 className="text-lg font-bold text-slate-900">Resumen ejecutivo</h2>
                                </div>
                                <p className="text-xs text-slate-500">{fechaConsulta} · Datos obtenidos del sistema</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-500">Registros encontrados</p>
                                        <span className="rounded-lg bg-slate-100 p-2 text-slate-600">▤</span>
                                    </div>
                                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{totalRegistros.toLocaleString("es-MX")}</p>
                                    <p className="mt-1 text-xs text-slate-400">Eventos de asistencia consultados</p>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-500">Registros presentes</p>
                                        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">✓</span>
                                    </div>
                                    <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-700 tabular-nums">{presentes.toLocaleString("es-MX")}</p>
                                    <p className="mt-1 text-xs text-slate-400">{porcentajePresentes}% del total de registros</p>
                                </div>
                                <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-500">Otros estados</p>
                                        <span className="rounded-lg bg-amber-50 p-2 text-amber-700">!</span>
                                    </div>
                                    <p className="mt-3 text-3xl font-bold tracking-tight text-amber-700 tabular-nums">{otrosEstados.toLocaleString("es-MX")}</p>
                                    <p className="mt-1 text-xs text-slate-400">Estados distintos de PRESENTE</p>
                                </div>
                                <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-500">Estudiantes identificados</p>
                                        <span className="rounded-lg bg-sky-50 p-2 text-sky-700">♙</span>
                                    </div>
                                    <p className="mt-3 text-3xl font-bold tracking-tight text-sky-700 tabular-nums">{alumnosUnicos.toLocaleString("es-MX")}</p>
                                    <p className="mt-1 text-xs text-slate-400">{materiasUnicas} materias · {docentesUnicos} docentes</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Lectura para toma de decisiones */}
                    {!cargando && asistencias.length > 0 && (
                        <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lectura ejecutiva</p>
                                <h3 className="mt-1 text-base font-bold text-slate-900">Composición de los registros</h3>
                                <div className="mt-5">
                                    <div className="mb-2 flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-600">Registros con estado PRESENTE</span>
                                        <strong className="text-slate-900">{porcentajePresentes}%</strong>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${porcentajePresentes}%` }} />
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Presentes: {presentes}</span>
                                        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" />Otros estados: {otrosEstados}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Punto de atención</p>
                                <h3 className="mt-1 text-base font-bold text-slate-900">Seguimiento recomendado</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {otrosEstados > 0
                                        ? `Se identificaron ${otrosEstados} registros con un estado distinto de PRESENTE. Conviene revisar su detalle y dar seguimiento conforme a los criterios de control escolar.`
                                        : "Todos los registros de esta consulta tienen estado PRESENTE. Mantén el seguimiento periódico y revisa la cobertura de los grupos."}
                                </p>
                                <p className="mt-3 text-[11px] leading-5 text-slate-400">
                                    Este análisis considera únicamente los registros devueltos por la consulta; no representa alumnos ausentes sin registro.
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Carga y mensajes */}
                    {cargando && (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
                            <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
                            <p className="text-sm font-medium text-slate-500">Consultando registros del sistema...</p>
                        </div>
                    )}
                    {!cargando && mensaje && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">▤</div>
                            <p className="mt-3 text-sm font-semibold text-slate-700">{mensaje}</p>
                            <p className="mt-1 text-xs text-slate-400">Ajusta los filtros o vuelve a intentar la consulta.</p>
                        </div>
                    )}

                    {/* Tabla ejecutiva */}
                    {!cargando && asistencias.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Detalle operativo</p>
                                    <h2 className="mt-1 text-base font-bold text-slate-900">Historial de asistencias</h2>
                                </div>
                                <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{asistencias.length} registros</span>
                            </div>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[850px] border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            <th className="px-5 py-4 text-left">Estudiante</th>
                                            <th className="px-5 py-4 text-left">Asignatura</th>
                                            <th className="px-5 py-4 text-left">Docente</th>
                                            <th className="px-5 py-4 text-left">Fecha y hora</th>
                                            <th className="px-5 py-4 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {asistencias.map((a, i) => {
                                            const colorAvatar = COLORES_AVATAR[i % COLORES_AVATAR.length];
                                            const estilo = obtenerEstilo(a.estado);
                                            const alumno = a.alumno || alumnoInfo;
                                            return (
                                                <tr key={a.id || `${a.fechaHora}-${i}`} className="transition hover:bg-slate-50/80">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${colorAvatar}`}>
                                                                {obtenerIniciales(alumno?.nombre, alumno?.apellidoPaterno)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-800">{alumno ? `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno || ""}` : "—"}</p>
                                                                <p className="mt-0.5 font-mono text-xs text-slate-400">{alumno?.matricula || "—"}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-600">{a.sesionQR?.mmg?.materia?.nombre || "—"}</td>
                                                    <td className="px-5 py-3.5 text-slate-600">{a.sesionQR?.mmg?.maestro?.nombre || "—"}</td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">{a.fechaHora ? new Date(a.fechaHora).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${estilo.text}`}>
                                                            <i className={`h-1.5 w-1.5 rounded-full ${estilo.dot}`} />{a.estado || "SIN ESTADO"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* Tarjetas para móvil */}
                            <div className="divide-y divide-slate-100 md:hidden">
                                {asistencias.map((a, i) => {
                                    const alumno = a.alumno || alumnoInfo;
                                    const estilo = obtenerEstilo(a.estado);
                                    return (
                                        <article key={a.id || `${a.fechaHora}-${i}`} className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${COLORES_AVATAR[i % COLORES_AVATAR.length]}`}>
                                                        {obtenerIniciales(alumno?.nombre, alumno?.apellidoPaterno)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-800">{alumno ? `${alumno.nombre} ${alumno.apellidoPaterno}` : "Estudiante no disponible"}</p>
                                                        <p className="font-mono text-xs text-slate-400">{alumno?.matricula || "—"}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${estilo.text}`}>
                                                    <i className={`h-1.5 w-1.5 rounded-full ${estilo.dot}`} />{a.estado || "SIN ESTADO"}
                                                </span>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                                <div><p className="text-slate-400">Asignatura</p><p className="mt-0.5 font-medium text-slate-700">{a.sesionQR?.mmg?.materia?.nombre || "—"}</p></div>
                                                <div><p className="text-slate-400">Docente</p><p className="mt-0.5 font-medium text-slate-700">{a.sesionQR?.mmg?.maestro?.nombre || "—"}</p></div>
                                                <div className="col-span-2"><p className="text-slate-400">Fecha y hora</p><p className="mt-0.5 font-medium text-slate-700">{a.fechaHora ? new Date(a.fechaHora).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—"}</p></div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                    <p className="px-1 text-[11px] leading-5 text-slate-400">
                        Nota: los indicadores resumen los registros recibidos por los filtros actuales. Para medir inasistencias reales y detectar alumnos sin pase de lista se requiere cruzar estos datos con la matrícula y las sesiones programadas.
                    </p>
                </>
            )}
        </div>
    );
}
export default Asistencia;