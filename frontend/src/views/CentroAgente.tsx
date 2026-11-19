/**
 * Centro del Agente: historial de decisiones, métricas, memoria (reincidencia R) y
 * retroalimentación del docente. Usa api.getDecisionesAgente y api.getMetricasAgente
 * (datos de ejemplo si VITE_USE_MOCKS=true, backend real si no).
 */
import { useEffect, useMemo, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, PauseCircle, ThumbsUp, Brain, ChevronDown, CheckCircle2, XCircle, Clock, Loader2, Info } from 'lucide-react';
import api from '../services/api';
import type { Accion } from '../mocks/agente';
import type { DecisionAgente, MetricasAgente } from '../mocks/centro';
import { Avatar, TextoResaltado } from '../components/ui';

const ACCIONES: Record<Accion, { nombre: string; clase: string; barra: string }> = {
  PUBLICAR: { nombre: 'Publicar', clase: 'bg-green-50 text-green-700 ring-green-600/20', barra: '#52A67C' },
  PUBLICAR_CON_AVISO: { nombre: 'Publicar con aviso', clase: 'bg-lime-50 text-lime-700 ring-lime-600/20', barra: '#9DBF6E' },
  PEDIR_REESCRITURA: { nombre: 'Pedir reescritura', clase: 'bg-amber-50 text-amber-700 ring-amber-600/25', barra: '#F3CD82' },
  RETENER: { nombre: 'Retener', clase: 'bg-[#E5675F]/10 text-[#E5675F] ring-[#E5675F]/30', barra: '#E5675F' },
  RETENER_URGENTE: { nombre: 'Retener urgente', clase: 'bg-rose-50 text-rose-700 ring-rose-200', barra: '#D5AEB7' },
};
const ORDEN: Accion[] = ['PUBLICAR', 'PUBLICAR_CON_AVISO', 'PEDIR_REESCRITURA', 'RETENER', 'RETENER_URGENTE'];
const RETENIDAS: Accion[] = ['RETENER', 'RETENER_URGENTE'];

const sombra = 'shadow-[0_4px_16px_rgba(15,23,42,0.04)]';

/** Tono de texto y fondo suave según la reincidencia. */
function colorR(r: number) {
  if (r >= 0.5) return '#E5675F';
  if (r >= 0.25) return '#B7791F';
  return '#15803D';
}
function fondoR(r: number) {
  if (r >= 0.5) return '#FDEDEB';
  if (r >= 0.25) return '#FDF3DF';
  return '#E8F6EE';
}

function fechaCorta(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

/**
 * Curva de reincidencia: R(t) = Σ s_i · e^(−(t − t_i)/τ).
 * Parte sólida: lo que ya pasó. Parte punteada: cómo se irá olvidando si no vuelve a fallar.
 * Pasa el mouse por encima para ver el valor de R en cada día.
 */
const ROJO = '#E5675F';
const AZUL = '#4D6BFE';
function CurvaR({ eventos, tau }: { eventos: Array<{ dias_atras: number; severidad: number }>; tau: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 250, PL = 36, PR = 18, PT = 22, PB = 30;
  const masAntiguo = Math.max(0, ...eventos.map(e => e.dias_atras));
  const PASADO = Math.min(14, Math.max(7, Math.ceil(masAntiguo) + 1));
  const FUTURO = 14;
  const UMBRAL = 0.5;
  const R = (t: number) => eventos.reduce((acc, e) => {
    const te = -e.dias_atras;
    return t >= te ? acc + e.severidad * Math.exp(-(t - te) / tau) : acc;
  }, 0);
  const muestras = (desde: number, hasta: number) => {
    const ts = new Set<number>();
    for (let t = desde; t <= hasta + 1e-9; t += 0.05) ts.add(Math.round(t * 1000) / 1000);
    eventos.forEach(e => { const te = -e.dias_atras; if (te > desde && te <= hasta) { ts.add(te - 1e-6); ts.add(te); } });
    ts.add(hasta);
    return [...ts].sort((m, n) => m - n).map(t => [t, R(t)] as [number, number]);
  };
  const pasado = muestras(-PASADO, 0);
  const futuro = muestras(0, FUTURO);
  const maxY = Math.max(1, Math.ceil(Math.max(...pasado.map(p => p[1])) * 2) / 2);
  const x = (t: number) => PL + ((t + PASADO) / (PASADO + FUTURO)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / maxY) * (H - PT - PB);
  const camino = (pts: Array<[number, number]>) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
  const area = (pts: Array<[number, number]>) => `${camino(pts)} L${x(pts[pts.length - 1][0])},${y(0)} L${x(pts[0][0])},${y(0)} Z`;
  const hoy = R(0);
  const en7 = R(7);
  const en14 = R(FUTURO);
  const faltas = eventos.filter(e => e.severidad >= 0.2 && e.dias_atras <= PASADO);
  const etiquetaDia = (t: number) => {
    const d = Math.round(Math.abs(t));
    if (Math.abs(t) < 0.5) return 'Hoy';
    return t < 0 ? `Hace ${d} ${d === 1 ? 'día' : 'días'}` : `En ${d} ${d === 1 ? 'día' : 'días'}`;
  };

  const onMove = (ev: ReactMouseEvent<SVGSVGElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * W;
    const t = ((px - PL) / (W - PL - PR)) * (PASADO + FUTURO) - PASADO;
    setHover(t < -PASADO || t > FUTURO ? null : Math.round(t * 2) / 2);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="gradPasado" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={AZUL} stopOpacity="0.22" />
          <stop offset="100%" stopColor={AZUL} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="gradFuturo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={AZUL} stopOpacity="0.10" />
          <stop offset="100%" stopColor={AZUL} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Referencia visual: R alta. El agente no usa un umbral, aplica (1 + R) de forma continua */}
      <rect x={PL} y={y(maxY)} width={W - PL - PR} height={y(UMBRAL) - y(maxY)} fill={ROJO} opacity="0.06" />
      <line x1={PL} x2={W - PR} y1={y(UMBRAL)} y2={y(UMBRAL)} stroke={ROJO} strokeOpacity="0.45" strokeDasharray="4 4" />
      <text x={W - PR - 4} y={y(UMBRAL) - 6} textAnchor="end" fontSize="10" fontWeight="600" fill={ROJO}>Reincidencia alta (R ≥ {UMBRAL})</text>

      {/* Ejes */}
      {Array.from({ length: Math.round(maxY / 0.5) + 1 }, (_, i) => i * 0.5).map(v => (
        <g key={v}>
          {v !== UMBRAL && <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#EEF1F7" />}
          <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#94A3B8">{v.toFixed(1)}</text>
        </g>
      ))}
      <line x1={x(0)} x2={x(0)} y1={PT - 8} y2={H - PB} stroke="#94A3B8" strokeDasharray="2 3" />
      <text x={x(-PASADO / 2)} y={PT - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#94A3B8">LO QUE RECUERDA</text>
      <text x={x(FUTURO / 2)} y={PT - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#94A3B8">CÓMO LO OLVIDARÁ</text>

      {/* Curvas */}
      <path d={area(pasado)} fill="url(#gradPasado)" />
      <path d={area(futuro)} fill="url(#gradFuturo)" />
      <path d={camino(pasado)} fill="none" stroke={AZUL} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d={camino(futuro)} fill="none" stroke={AZUL} strokeWidth="2.2" strokeDasharray="6 5" strokeLinecap="round" opacity="0.75" />

      {/* Faltas */}
      {faltas.map((e, i) => {
        const t = -e.dias_atras;
        const cx = x(t), cy = y(R(t));
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="9" fill={ROJO} opacity="0.15" />
            <circle cx={cx} cy={cy} r="5" fill={ROJO} stroke="#fff" strokeWidth="2" />
            {Math.abs(t) > 0.6 && <text x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill={ROJO}>+{e.severidad.toFixed(2)}</text>}
          </g>
        );
      })}

      {/* Puntos clave */}
      <circle cx={x(0)} cy={y(hoy)} r="6" fill={hoy >= UMBRAL ? ROJO : AZUL} stroke="#fff" strokeWidth="2.5" />
      <g transform={`translate(${x(0) + 10}, ${y(hoy) - 14})`}>
        <rect width="96" height="22" rx="11" fill={hoy >= UMBRAL ? ROJO : AZUL} />
        <text x="48" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">R hoy = {hoy.toFixed(2)}</text>
      </g>
      {[[7, en7], [FUTURO, en14]].map(([t, v]) => (
        <g key={t}>
          <circle cx={x(t)} cy={y(v)} r="3.5" fill="#fff" stroke={AZUL} strokeWidth="2" />
          <text x={x(t) - (t === FUTURO ? 4 : 0)} y={y(v) - 9} textAnchor={t === FUTURO ? 'end' : 'middle'} fontSize="10" fontWeight="600" fill="#64748B">{v.toFixed(2)}</text>
        </g>
      ))}

      {/* Eje X */}
      <text x={x(-PASADO)} y={H - 10} textAnchor="start" fontSize="10" fill="#94A3B8">hace {PASADO} días</text>
      <text x={x(0)} y={H - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#475569">hoy</text>
      <text x={x(7)} y={H - 10} textAnchor="middle" fontSize="10" fill="#94A3B8">en 7 días</text>
      <text x={x(FUTURO)} y={H - 10} textAnchor="end" fontSize="10" fill="#94A3B8">en {FUTURO} días</text>

      {/* Lectura al pasar el mouse */}
      {hover !== null && (() => {
        const v = R(hover);
        const hx = x(hover);
        const izquierda = hx > W - 150;
        return (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={PT} y2={H - PB} stroke="#334155" strokeOpacity="0.25" />
            <circle cx={hx} cy={y(v)} r="4" fill="#fff" stroke="#334155" strokeWidth="2" />
            <g transform={`translate(${izquierda ? hx - 128 : hx + 10}, ${Math.max(PT, y(v) - 40)})`}>
              <rect width="118" height="36" rx="8" fill="#0F172A" opacity="0.88" />
              <text x="10" y="15" fontSize="10" fill="#CBD5E1">{etiquetaDia(hover)}</text>
              <text x="10" y="29" fontSize="11" fontWeight="700" fill="#fff">R = {v.toFixed(2)} {v >= UMBRAL ? '· alta' : ''}</text>
            </g>
          </g>
        );
      })()}
    </svg>
  );
}

function Kpi({ icono, valor, etiqueta, pista, tono }: { icono: ReactNode; valor: string; etiqueta: string; pista?: string; tono: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 flex items-center gap-3 ${sombra}`}>
      <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${tono}`}>{icono}</span>
      <div className="min-w-0">
        <div className="font-display text-[20px] font-semibold text-slate-900 leading-none">{valor}</div>
        <div className="text-[12px] text-slate-500 mt-1 truncate">{etiqueta}</div>
        {pista && <div className="text-[11px] text-slate-400 truncate">{pista}</div>}
      </div>
    </div>
  );
}

export default function CentroAgente() {
  const [decisiones, setDecisiones] = useState<DecisionAgente[]>([]);
  const [metricas, setMetricas] = useState<MetricasAgente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'retenidas' | 'publicadas'>('todas');
  const [estSel, setEstSel] = useState(0);

  useEffect(() => {
    Promise.all([api.getDecisionesAgente(50), api.getMetricasAgente()])
      .then(([d, m]) => { setDecisiones(Array.isArray(d) ? d : []); setMetricas(m || null); })
      .catch(() => setError('No se pudo cargar la información del agente. Revisa que el backend esté encendido.'))
      .finally(() => setCargando(false));
  }, []);

  const reincidentes = useMemo(
    () => [...(metricas?.reincidentes || [])].sort((a, b) => b.reincidencia - a.reincidencia),
    [metricas]
  );

  const filtradas = decisiones.filter(d =>
    filtro === 'todas' ? true : filtro === 'retenidas' ? RETENIDAS.includes(d.accion) : !RETENIDAS.includes(d.accion)
  );

  if (cargando) {
    return <div className="flex items-center justify-center py-24 text-slate-400 gap-2"><Loader2 className="animate-spin" size={18} /> Cargando el Centro del Agente…</div>;
  }
  if (error || !metricas) {
    return <div className={`rounded-2xl bg-white p-10 text-center text-sm text-slate-500 ${sombra}`}>{error || 'Aún no hay decisiones registradas.'}</div>;
  }

  const total = metricas.total_decisiones || 0;
  const pa = metricas.por_accion;
  const autoPublicadas = (pa.PUBLICAR || 0) + (pa.PUBLICAR_CON_AVISO || 0);
  const retenidas = (pa.RETENER || 0) + (pa.RETENER_URGENTE || 0);
  const { coincide, corrige, pendientes } = metricas.retroalimentacion;
  const revisadas = coincide + corrige;
  const acuerdo = revisadas ? Math.round((coincide / revisadas) * 100) : 0;
  const maxAccion = Math.max(1, ...ORDEN.map(a => pa[a] || 0));
  const sel = reincidentes[estSel];

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icono={<Bot size={17} />} valor={String(total)} etiqueta="Decisiones tomadas" tono="text-[#2444D8] bg-[#EEF2FF]" />
        <Kpi icono={<Send size={17} />} valor={`${total ? Math.round((autoPublicadas / total) * 100) : 0}%`} etiqueta="Publicadas sin esperar" pista={`${autoPublicadas} de ${total}`} tono="text-green-700 bg-green-50" />
        <Kpi icono={<PauseCircle size={17} />} valor={String(retenidas)} etiqueta="Retenidas para revisión" tono="text-[#E5675F] bg-[#E5675F]/10" />
        <Kpi icono={<ThumbsUp size={17} />} valor={revisadas ? `${acuerdo}%` : '—'} etiqueta="Acuerdo con el docente" pista={`${revisadas} revisadas`} tono="text-violet-600 bg-violet-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-6">
        {/* Acciones */}
        <section className={`rounded-2xl bg-white p-6 ${sombra}`}>
          <h3 className="font-display text-[16px] font-semibold text-slate-900">Qué decidió el agente</h3>
          <p className="text-[12px] text-slate-500 mb-5">Cantidad de mensajes por acción</p>
          <div className="space-y-4">
            {ORDEN.map(a => {
              const n = pa[a] || 0;
              return (
                <div key={a}>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-slate-700">{ACCIONES[a].nombre}</span>
                    <span className="font-semibold text-slate-900">{n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(n / maxAccion) * 100}%` }} transition={{ duration: 0.6 }}
                      className="h-full rounded-full" style={{ background: ACCIONES[a].barra }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retroalimentación */}
          <div className="mt-7 pt-6 border-t border-slate-100">
            <h3 className="font-display text-[15px] font-semibold text-slate-900">Retroalimentación del docente</h3>
            <p className="text-[12px] text-slate-500 mb-4">Lo que el docente hizo con los mensajes retenidos</p>
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
              {revisadas + pendientes > 0 && <>
                <div className="bg-[#52A67C]" style={{ width: `${(coincide / (revisadas + pendientes)) * 100}%` }} />
                <div className="bg-[#E5675F]" style={{ width: `${(corrige / (revisadas + pendientes)) * 100}%` }} />
              </>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
              <div className="flex items-center gap-1.5 text-slate-600"><CheckCircle2 size={14} className="text-green-600" /> Coincidió: <b className="text-slate-900">{coincide}</b></div>
              <div className="flex items-center gap-1.5 text-slate-600"><XCircle size={14} className="text-[#E5675F]" /> Corrigió: <b className="text-slate-900">{corrige}</b></div>
              <div className="flex items-center gap-1.5 text-slate-600"><Clock size={14} className="text-slate-400" /> Pendientes: <b className="text-slate-900">{pendientes}</b></div>
            </div>
            <p className="mt-4 rounded-xl bg-[#F6F8FD] px-3.5 py-2.5 text-[12px] text-slate-600 leading-relaxed flex gap-2">
              <Info size={14} className="text-[#2444D8] shrink-0 mt-0.5" />
              Si el docente rechaza un mensaje retenido, coincide con el agente; si lo aprueba, cuenta como corrección. Estas respuestas quedan registradas como retroalimentación para evaluar y ajustar el agente.
            </p>
          </div>
        </section>

        {/* Memoria */}
        <section className={`rounded-2xl bg-white p-6 ${sombra}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[16px] font-semibold text-slate-900 flex items-center gap-2"><Brain size={17} className="text-[#2444D8]" /> Memoria del agente</h3>
              <p className="text-[12px] text-slate-500">Reincidencia R de cada estudiante. Sube con cada falta y se olvida con el tiempo (τ = {metricas.tau_dias} días).</p>
            </div>
          </div>

          {reincidentes.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-14">Ningún estudiante tiene reincidencia.</div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {reincidentes.map((r, i) => (
                  <button key={r.estudiante} onClick={() => setEstSel(i)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium ring-1 transition ${i === estSel ? 'bg-[#EEF2FF] ring-[#2444D8]/30 text-[#2444D8]' : 'bg-white ring-slate-200 text-slate-600 hover:ring-slate-300'}`}>
                    <Avatar name={r.estudiante} size={22} />
                    {r.estudiante}
                    <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: fondoR(r.reincidencia), color: colorR(r.reincidencia) }}>{r.reincidencia.toFixed(2)}</span>
                  </button>
                ))}
              </div>

              {sel && (
                <div className="mt-5">
                  <CurvaR eventos={sel.eventos} tau={metricas.tau_dias} />
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#E5675F]" /> Falta registrada</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#4D6BFE]" /> R(t) = Σ s · e^(−Δt/τ)</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#4D6BFE]/70" /> Si no vuelve a fallar</span>
                    <span>{sel.incidentes} {sel.incidentes === 1 ? 'incidente' : 'incidentes'} en total</span>
                  </div>
                  <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
                    {sel.reincidencia >= 0.5
                      ? <>Con R = <b>{sel.reincidencia.toFixed(2)}</b> el agente es más estricto con {sel.estudiante.split(' ')[0]}: si un mensaje suyo parece tóxico, las acciones permisivas le cuestan (1 + R) veces más.</>
                      : <>Con R = <b>{sel.reincidencia.toFixed(2)}</b> el efecto es moderado. Si no vuelve a fallar, R baja sola y el agente vuelve a tratarle como a cualquier estudiante.</>}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Historial */}
      <section className={`rounded-2xl bg-white ${sombra} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
          <div>
            <h3 className="font-display text-[16px] font-semibold text-slate-900">Historial de decisiones</h3>
            <p className="text-[12px] text-slate-500">Toca una fila para ver por qué decidió así</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {([['todas', 'Todas'], ['publicadas', 'Publicadas'], ['retenidas', 'Retenidas']] as const).map(([id, nombre]) => (
              <button key={id} onClick={() => setFiltro(id)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition ${filtro === id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>{nombre}</button>
            ))}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_90px_120px_28px] gap-4 px-6 py-2.5 border-y border-slate-100 text-[12px] font-medium text-slate-400">
          <span>Mensaje</span><span>Acción</span><span>Toxicidad</span><span>Docente</span><span />
        </div>

        <ul>
          {filtradas.map(d => {
            const abierto = abierta === d.id;
            return (
              <li key={d.id} className="border-b border-slate-50 last:border-0">
                <button onClick={() => setAbierta(abierto ? null : d.id)}
                  className={`w-full text-left grid grid-cols-1 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_90px_120px_28px] gap-2 md:gap-4 items-center px-6 py-3.5 transition ${abierto ? 'bg-[#F6F8FD]' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={d.estudiante} size={32} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-900 truncate">{d.estudiante} <span className="font-normal text-slate-400">· {d.curso} · {fechaCorta(d.fecha)}</span></div>
                      <div className="text-[13px] text-slate-600 truncate">“{d.texto}”</div>
                    </div>
                  </div>
                  <span><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${ACCIONES[d.accion]?.clase}`}>{ACCIONES[d.accion]?.nombre || d.accion}</span></span>
                  <span className="text-[13px] font-semibold" style={{ color: d.score_toxicidad >= 0.7 ? '#E5675F' : d.score_toxicidad >= 0.4 ? '#B7791F' : '#15803D' }}>{Math.round(d.score_toxicidad * 100)}%</span>
                  <span className="text-[12px]">
                    {d.decision_docente === 'RECHAZADO' && <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={14} /> Coincidió</span>}
                    {d.decision_docente === 'APROBADO' && <span className="inline-flex items-center gap-1 text-[#E5675F]"><XCircle size={14} /> Corrigió</span>}
                    {d.decision_docente === null && (RETENIDAS.includes(d.accion)
                      ? <span className="inline-flex items-center gap-1 text-slate-400"><Clock size={14} /> Pendiente</span>
                      : <span className="text-slate-300">No aplica</span>)}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform hidden md:block ${abierto ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {abierto && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[#F6F8FD]">
                      <div className="px-6 pb-5 pt-1 grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
                        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
                          <div className="text-[13px] text-slate-800 leading-relaxed">“<TextoResaltado texto={d.texto} fragmentos={d.fragmentos || []} />”</div>
                          <p className="mt-3 text-[12px] text-slate-600 leading-relaxed"><b className="text-[#2444D8]">Por qué:</b> {d.explicacion}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[12px]">
                          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100"><div className="text-slate-400">Categoría</div><div className="mt-1 font-semibold text-slate-900 capitalize">{d.categoria}</div></div>
                          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100"><div className="text-slate-400">Reincidencia R</div><div className="mt-1 font-semibold" style={{ color: colorR(d.reincidencia) }}>{d.reincidencia.toFixed(2)}</div></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
          {filtradas.length === 0 && <li className="text-sm text-slate-400 text-center py-10">No hay decisiones en este filtro.</li>}
        </ul>
      </section>
    </div>
  );
}
