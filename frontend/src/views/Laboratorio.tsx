/**
 * Laboratorio del Agente: muestra paso a paso cómo el agente analiza un mensaje.
 * Usa api.analizarMensaje (datos falsos si VITE_USE_MOCKS=true, backend real si no).
 * No publica ni guarda nada.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Wand2, Tags, Brain, Scale, Zap, Loader2, Play, RotateCcw, FlaskConical } from 'lucide-react';
import api from '../services/api';
import { ejemplosDemo, type RespuestaAgente, type Accion } from '../mocks/agente';

const PASOS = [
  { id: 'percibir', nombre: 'Percibir', detalle: 'Recibe el mensaje y su contexto', icono: Eye },
  { id: 'normalizar', nombre: 'Normalizar', detalle: 'Limpia el texto y deshace evasiones', icono: Wand2 },
  { id: 'clasificar', nombre: 'Clasificar', detalle: 'Calcula la probabilidad de cada categoría', icono: Tags },
  { id: 'actualizar_estado', nombre: 'Memoria', detalle: 'Consulta la reincidencia del estudiante', icono: Brain },
  { id: 'decidir', nombre: 'Decidir', detalle: 'Elige la acción de menor costo esperado', icono: Scale },
  { id: 'actuar', nombre: 'Actuar', detalle: 'Aplica la acción sobre el foro', icono: Zap },
];

const ACCIONES: Record<Accion, { nombre: string; clase: string; barra: string }> = {
  PUBLICAR: { nombre: 'Publicar', clase: 'bg-green-50 text-green-700 ring-green-600/20', barra: '#16A34A' },
  PUBLICAR_CON_AVISO: { nombre: 'Publicar con aviso', clase: 'bg-lime-50 text-lime-700 ring-lime-600/20', barra: '#65A30D' },
  PEDIR_REESCRITURA: { nombre: 'Pedir reescritura', clase: 'bg-amber-50 text-amber-700 ring-amber-600/25', barra: '#F59E0B' },
  RETENER: { nombre: 'Retener para revisión', clase: 'bg-red-50/70 text-red-600 ring-red-200', barra: '#E5675F' },
  RETENER_URGENTE: { nombre: 'Retener y notificar urgente', clase: 'bg-rose-50 text-rose-700 ring-rose-200', barra: '#C26B7A' },
};

const CATEGORIAS: Array<{ id: keyof RespuestaAgente['probabilidades']; nombre: string; color: string }> = [
  { id: 'ninguna', nombre: 'Ninguna (sano)', color: '#16A34A' },
  { id: 'insulto', nombre: 'Insulto', color: '#E5675F' },
  { id: 'acoso', nombre: 'Acoso', color: '#EC8A9C' },
  { id: 'amenaza', nombre: 'Amenaza', color: '#C26B7A' },
  { id: 'odio', nombre: 'Odio / discriminación', color: '#7C3AED' },
  { id: 'spam', nombre: 'Spam', color: '#64748B' },
];

/** Resalta en rojo las palabras que más pesaron en la decisión. */
function TextoResaltado({ texto, fragmentos }: { texto: string; fragmentos: string[] }) {
  if (!fragmentos.length) return <>{texto}</>;
  const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partes = texto.split(new RegExp(`(${fragmentos.map(escapar).join('|')})`, 'gi'));
  return (
    <>
      {partes.map((p, i) =>
        fragmentos.some(f => f.toLowerCase() === p.toLowerCase())
          ? <mark key={i} className="rounded bg-red-50 px-1 text-red-600 font-semibold ring-1 ring-red-100">{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

export default function Laboratorio() {
  const [texto, setTexto] = useState('');
  const [padre, setPadre] = useState('');
  const [resultado, setResultado] = useState<RespuestaAgente | null>(null);
  const [pasoActual, setPasoActual] = useState(-1); // -1 = sin análisis
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const analizar = async () => {
    if (!texto.trim()) return;
    setError('');
    setResultado(null);
    setCargando(true);
    setPasoActual(0);
    try {
      const peticion = api.analizarMensaje(texto.trim(), padre.trim() || undefined);
      // Animación del ciclo: un paso cada 400 ms
      for (let i = 1; i < PASOS.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        setPasoActual(i);
      }
      const r = await peticion;
      await new Promise(r2 => setTimeout(r2, 300));
      setPasoActual(PASOS.length);
      setResultado(r);
    } catch (e: any) {
      setError(e?.detail || e?.message || 'No se pudo analizar el mensaje.');
      setPasoActual(-1);
    } finally {
      setCargando(false);
    }
  };

  const reiniciar = () => { setTexto(''); setPadre(''); setResultado(null); setPasoActual(-1); setError(''); };

  const costos = resultado ? Object.entries(resultado.costo_esperado) as Array<[Accion, number]> : [];
  const maxCosto = Math.max(...costos.map(([, v]) => v), 1);
  const elegida = resultado?.accion;

  return (
    <div className="space-y-6">
      {/* Entrada */}
      <section className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 mb-5">
          <span className="h-10 w-10 rounded-xl bg-[#EEF2FF] text-[#2444D8] flex items-center justify-center"><FlaskConical size={18} /></span>
          <div>
            <h3 className="font-display text-[17px] font-semibold text-slate-900">Prueba el agente</h3>
            <p className="text-[13px] text-slate-500">Escribe un mensaje como si fueras un estudiante. Nada se publica.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-[12px] text-slate-400 self-center mr-1">Ejemplos:</span>
          {ejemplosDemo.map(ej => (
            <button
              key={ej.etiqueta}
              onClick={() => { setTexto(ej.texto); setPadre(ej.padre || ''); setResultado(null); setPasoActual(-1); }}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600 hover:border-accent/40 hover:text-accent transition-colors"
            >
              {ej.etiqueta}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Mensaje</label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={3}
              placeholder="Ej. Tu argumento no tiene sustento, revisa las fuentes"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-[15px] outline-none placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Responde a… <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              value={padre}
              onChange={e => setPadre(e.target.value)}
              rows={3}
              placeholder="Mensaje anterior del hilo"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-[14px] outline-none placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={analizar}
            disabled={cargando || !texto.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2444D8] px-5 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-accent/25 hover:brightness-110 disabled:opacity-50 transition"
          >
            {cargando ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Analizar
          </button>
          {(resultado || texto) && (
            <button onClick={reiniciar} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-600 hover:text-slate-900 transition">
              <RotateCcw size={15} /> Limpiar
            </button>
          )}
        </div>
        {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-[13px] text-red-700">{error}</div>}
      </section>

      {/* Ciclo del agente */}
      <section className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <h3 className="font-display text-[17px] font-semibold text-slate-900 mb-5">Ciclo del agente</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {PASOS.map((paso, i) => {
            const hecho = pasoActual > i;
            const activo = pasoActual === i;
            const Icono = paso.icono;
            return (
              <div key={paso.id} className="relative">
                <motion.div
                  animate={{ scale: activo ? 1.04 : 1 }}
                  className={`h-full rounded-2xl border p-4 transition-colors ${
                    hecho ? 'border-[#2444D8]/20 bg-[#EEF2FF]' : activo ? 'border-[#2444D8] bg-white shadow-lg shadow-accent/15' : 'border-slate-100 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${hecho || activo ? 'bg-[#2444D8] text-white' : 'bg-white text-slate-400'}`}>
                      {activo ? <Loader2 size={15} className="animate-spin" /> : <Icono size={15} />}
                    </span>
                    <span className={`text-[11px] font-semibold ${hecho || activo ? 'text-[#2444D8]' : 'text-slate-400'}`}>Paso {i + 1}</span>
                  </div>
                  <div className={`mt-3 text-[14px] font-semibold ${hecho || activo ? 'text-slate-900' : 'text-slate-400'}`}>{paso.nombre}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{paso.detalle}</div>
                </motion.div>
              </div>
            );
          })}
        </div>
        {pasoActual === -1 && <p className="mt-4 text-[13px] text-slate-400">Escribe un mensaje y presiona Analizar para ver el ciclo.</p>}
      </section>

      {/* Resultado */}
      <AnimatePresence>
        {resultado && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Decisión */}
            <section className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h3 className="font-display text-[17px] font-semibold text-slate-900 mb-4">Decisión</h3>
              <span className={`inline-flex rounded-full px-3 py-1 text-[14px] font-semibold ring-1 ring-inset ${ACCIONES[resultado.accion].clase}`}>
                {ACCIONES[resultado.accion].nombre}
              </span>
              <blockquote className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-[15px] leading-relaxed text-slate-800">
                “<TextoResaltado texto={texto} fragmentos={resultado.fragmentos} />”
              </blockquote>
              <p className="mt-4 text-[14px] text-slate-600 leading-relaxed">{resultado.explicacion}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-slate-500">Toxicidad</dt>
                  <dd className="font-display text-[20px] font-semibold text-slate-900">{Math.round(resultado.score_toxicidad * 100)}%</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-slate-500">Reincidencia R</dt>
                  <dd className="font-display text-[20px] font-semibold text-slate-900">{resultado.reincidencia.toFixed(2)}</dd>
                </div>
              </dl>
            </section>

            {/* Probabilidades */}
            <section className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h3 className="font-display text-[17px] font-semibold text-slate-900">Percepción</h3>
              <p className="text-[13px] text-slate-500 mb-4">Probabilidad de cada categoría</p>
              <ul className="space-y-3">
                {CATEGORIAS.map(c => {
                  const v = resultado.probabilidades[c.id] || 0;
                  return (
                    <li key={c.id}>
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className="text-slate-600">{c.nombre}</span>
                        <span className="font-semibold tabular-nums text-slate-900">{Math.round(v * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: c.color }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Costos */}
            <section className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h3 className="font-display text-[17px] font-semibold text-slate-900">Razonamiento</h3>
              <p className="text-[13px] text-slate-500 mb-4">Costo esperado de cada acción: gana la de menor costo</p>
              <ul className="space-y-3">
                {costos.map(([accion, v]) => {
                  const esElegida = accion === elegida;
                  return (
                    <li key={accion} className={`rounded-xl p-2.5 -mx-2.5 ${esElegida ? 'bg-[#EEF2FF]' : ''}`}>
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className={esElegida ? 'font-semibold text-[#2444D8]' : 'text-slate-600'}>
                          {ACCIONES[accion].nombre}{esElegida && ' ✓'}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">{v.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(v / maxCosto) * 100}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: esElegida ? '#2444D8' : '#CBD5E1' }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
