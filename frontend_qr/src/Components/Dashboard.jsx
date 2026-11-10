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
