import prisma from "../config/prisma.js";

const DIAS = 7;

const claveDia = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export const obtenerResumenDashboard = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - (DIAS - 1));

    const rangoHoy = { fechaHora: { gte: hoy, lt: manana } };
    const rangoSemana = { fechaHora: { gte: desde, lt: manana } };

    const [
      alumnosActivos, alumnosConFoto, alumnosSinFoto, asistenciasHoy,
      estadosHoy, alumnosConRegistroHoy, ultimos, semana,
    ] = await Promise.all([
      prisma.alumno.count({ where: { activo: true } }),
      prisma.alumno.count({ where: { activo: true, fotoUrl: { not: null } } }),
      prisma.alumno.count({ where: { activo: true, fotoUrl: null } }),
      prisma.asistencia.count({ where: rangoHoy }),
      prisma.asistencia.groupBy({
        by: ["estado"],
        where: rangoHoy,
        _count: { _all: true },
      }),
      prisma.asistencia.findMany({
        where: rangoHoy,
        distinct: ["alumnoId"],
        select: { alumnoId: true },
      }),
      prisma.asistencia.findMany({
        take: 8,
        orderBy: { fechaHora: "desc" },
        select: {
          id: true, fechaHora: true, estado: true,
          alumno: {
            select: {
              nombre: true, apellidoPaterno: true, apellidoMaterno: true,
              Grupo: { select: { nombre: true } },
            },
          },
        },
      }),
      prisma.asistencia.findMany({
        where: rangoSemana,
        select: { fechaHora: true, estado: true },
      }),
    ]);

    const conteoEstado = estadosHoy.reduce((acc, fila) => {
      acc[fila.estado] = fila._count._all;
      return acc;
    }, {});

    const porcentajeFotos = alumnosActivos
      ? Number(((alumnosConFoto / alumnosActivos) * 100).toFixed(1))
      : 0;

    const dias = [];
    for (let i = 0; i < DIAS; i++) {
      const d = new Date(desde);
      d.setDate(desde.getDate() + i);
      dias.push({
        fecha: claveDia(d),
        etiqueta: d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" }),
        presente: 0, retardo: 0, falta: 0, justificada: 0,
      });
    }

    const porDia = new Map(dias.map((d) => [d.fecha, d]));
    for (const asistencia of semana) {
      const fila = porDia.get(claveDia(asistencia.fechaHora));
      const estado = asistencia.estado.toLowerCase();
      if (fila && Object.prototype.hasOwnProperty.call(fila, estado)) fila[estado] += 1;
    }

    return res.json({
      success: true,
      data: {
        tarjetas: {
          alumnosActivos,
          asistenciasHoy,
          presentesHoy: conteoEstado.PRESENTE || 0,
          retardosHoy: conteoEstado.RETARDO || 0,
          faltasHoy: conteoEstado.FALTA || 0,
          justificadasHoy: conteoEstado.JUSTIFICADA || 0,
          alumnosConRegistroHoy: alumnosConRegistroHoy.length,
          alumnosSinRegistroHoy: Math.max(0, alumnosActivos - alumnosConRegistroHoy.length),
          alumnosConFoto, alumnosSinFoto, porcentajeFotos,
        },
        ultimosRegistros: ultimos.map((a) => ({
          id: a.id,
          fechaHora: a.fechaHora,
          alumno: [a.alumno.nombre, a.alumno.apellidoPaterno, a.alumno.apellidoMaterno].filter(Boolean).join(" "),
          grupo: a.alumno.Grupo?.nombre ?? "—",
          estado: a.estado,
        })),
        asistenciaSemanal: dias,
      },
    });
  } catch (error) {
    console.error("ERROR DASHBOARD:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo obtener el resumen del dashboard",
    });
  }
};
