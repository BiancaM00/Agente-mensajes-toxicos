/**
 * Convierte las respuestas reales del backend del agente al formato que usan
 * el Laboratorio y el Centro del Agente (el mismo de los datos de ejemplo).
 */
import type { Accion, Categoria, RespuestaAgente } from '../mocks/agente';
import type { DecisionAgente, MetricasAgente } from '../mocks/centro';

export const TAU_DIAS = 7;
const PASOS = ['percibir', 'normalizar', 'clasificar', 'actualizar_estado', 'decidir', 'actuar'];
const ACCIONES: Accion[] = ['PUBLICAR', 'PUBLICAR_CON_AVISO', 'PEDIR_REESCRITURA', 'RETENER', 'RETENER_URGENTE'];
const RETENIDAS: Accion[] = ['RETENER', 'RETENER_URGENTE'];

const NOMBRE_CATEGORIA: Record<string, string> = {
  insulto: 'un insulto', acoso: 'lenguaje de acoso', amenaza: 'una posible amenaza',
  odio: 'discurso de odio', spam: 'spam', ninguna: 'lenguaje respetuoso',
};
const NOMBRE_ACCION: Record<string, string> = {
  PUBLICAR: 'Publicar', PUBLICAR_CON_AVISO: 'Publicar con aviso', PEDIR_REESCRITURA: 'Pedir reescritura',
  RETENER: 'Retener para revisión', RETENER_URGENTE: 'Retener y notificar urgente',
};

/** Las fechas del backend llegan sin zona horaria y están en UTC. */
export function fechaUTC(iso?: string | null): string {
  if (!iso) return new Date().toISOString();
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
}

export function categoriaPrincipal(p: Record<string, number> = {}): Categoria {
  const toxicas = Object.entries(p).filter(([k]) => k !== 'ninguna').sort((a, b) => b[1] - a[1]);
  if (!toxicas.length) return 'ninguna';
  const [cat, val] = toxicas[0];
  return val >= (p.ninguna ?? 0) ? (cat as Categoria) : 'ninguna';
}

/** Explicación en lenguaje natural a partir de los datos de la decisión. */
export function explicacionAmigable(d: any): string {
  const original = String(d?.explicacion || '');
  // Si el backend ya trae una explicación propia (p. ej. falla del NLP), se respeta.
  if (original && !original.startsWith('Acción seleccionada')) return original;
  const p = d?.probabilidades || {};
  const cat = categoriaPrincipal(p);
  const accion = String(d?.accion || '');
  const costo = Number(d?.costo_esperado?.[accion] ?? 0).toFixed(2);
  const r = Number(d?.reincidencia ?? 0).toFixed(2);
  const frag: string[] = d?.fragmentos || [];
  if (cat === 'ninguna') {
    return `El mensaje usa ${NOMBRE_CATEGORIA.ninguna}. «${NOMBRE_ACCION[accion] || accion}» es la acción de menor costo esperado (${costo}).`;
  }
  const pct = Math.round((p[cat] || 0) * 100);
  const detalle = frag.length ? ` («${frag.join(', ')}»)` : '';
  return `Detecté ${NOMBRE_CATEGORIA[cat]}${detalle} con ${pct}% de probabilidad. Con reincidencia R = ${r}, «${NOMBRE_ACCION[accion] || accion}» es la acción de menor costo esperado (${costo}).`;
}

/** Mensaje corto y sin tecnicismos para el estudiante que acaba de publicar. */
export function mensajeParaEstudiante(d: any): string {
  const original = String(d?.explicacion || '');
  if (original && !original.startsWith('Acción seleccionada')) return original;
  const cat = categoriaPrincipal(d?.probabilidades);
  const frag: string[] = d?.fragmentos || [];
  const motivo = cat === 'ninguna'
    ? 'El agente detectó un tono que podría ser ofensivo'
    : `Tu mensaje parece contener ${NOMBRE_CATEGORIA[cat]}${frag.length ? ` («${frag.join(', ')}»)` : ''}`;
  switch (String(d?.accion || '')) {
    case 'PEDIR_REESCRITURA': return `${motivo}. Reescríbelo con un tono respetuoso antes de publicarlo.`;
    case 'RETENER': return `${motivo}. Un docente lo revisará antes de publicarlo.`;
    case 'RETENER_URGENTE': return `${motivo}. Un docente lo revisará con prioridad antes de publicarlo.`;
    default: return `${motivo}.`;
  }
}

/** Respuesta de POST /agente/analizar → formato del Laboratorio. */
export function adaptarAnalisis(res: any): RespuestaAgente {
  const d = res?.data ?? res ?? {};
  const prob = { ninguna: 0, insulto: 0, acoso: 0, amenaza: 0, odio: 0, spam: 0, ...(d.probabilidades || {}) };
  const costos = Object.fromEntries(ACCIONES.map(a => [a, Number(d.costo_esperado?.[a] ?? 0)])) as Record<Accion, number>;
  return {
    accion: d.accion,
    score_toxicidad: Number(d.score_toxicidad ?? 0),
    probabilidades: prob,
    costo_esperado: costos,
    reincidencia: Number(d.reincidencia ?? 0),
    fragmentos: d.fragmentos || [],
    explicacion: explicacionAmigable(d),
    pasos: PASOS,
    modelo: d.modelo || 'backend',
  };
}

/** GET /moderacion/decisiones-agente (+ historial del docente) → historial del Centro. */
export function adaptarDecisiones(resDecisiones: any, resHistorial: any): DecisionAgente[] {
  const decisiones = resDecisiones?.data ?? resDecisiones ?? [];
  const casos = resHistorial?.data ?? resHistorial ?? [];
  const veredicto = new Map<number, 'APROBADO' | 'RECHAZADO'>();
  for (const c of Array.isArray(casos) ? casos : []) {
    const e = String(c?.estado || '').toUpperCase();
    if (c?.publicacion_id && (e === 'APROBADO' || e === 'RECHAZADO')) veredicto.set(c.publicacion_id, e);
  }
  return (Array.isArray(decisiones) ? decisiones : []).map((d: any) => ({
    id: d.id,
    fecha: fechaUTC(d.creado_en),
    estudiante: d.estudiante || 'Estudiante',
    curso: d.curso || 'Curso',
    texto: d.texto || '',
    accion: d.accion,
    categoria: categoriaPrincipal(d.probabilidades),
    score_toxicidad: Number(d.score ?? d.score_toxicidad ?? 0),
    reincidencia: Number(d.reincidencia ?? 0),
    fragmentos: d.fragmentos || [],
    explicacion: explicacionAmigable(d),
    decision_docente: veredicto.get(d.publicacion_id) ?? null,
  }));
}

/** Métricas del Centro calculadas a partir del historial real. */
export function calcularMetricas(decisiones: DecisionAgente[]): MetricasAgente {
  const por_accion = Object.fromEntries(ACCIONES.map(a => [a, 0])) as Record<Accion, number>;
  let coincide = 0, corrige = 0, pendientes = 0;
  const porEstudiante = new Map<string, DecisionAgente[]>();
  const ahora = Date.now();

  for (const d of decisiones) {
    if (d.accion in por_accion) por_accion[d.accion] += 1;
    if (RETENIDAS.includes(d.accion)) {
      if (d.decision_docente === 'RECHAZADO') coincide += 1;
      else if (d.decision_docente === 'APROBADO') corrige += 1;
      else pendientes += 1;
    }
    porEstudiante.set(d.estudiante, [...(porEstudiante.get(d.estudiante) || []), d]);
  }

  // Igual que el backend: R(t) = Σ s_i · e^(−Δt/τ), con s_i = score de cada mensaje.
  const reincidentes = [...porEstudiante.entries()].map(([estudiante, ds]) => {
    const eventos = ds.map(d => ({
      dias_atras: Math.max(0, (ahora - new Date(d.fecha).getTime()) / 864e5),
      severidad: d.score_toxicidad,
    }));
    const reincidencia = eventos.reduce((acc, e) => acc + e.severidad * Math.exp(-e.dias_atras / TAU_DIAS), 0);
    const incidentes = ds.filter(d => d.accion !== 'PUBLICAR').length;
    return { estudiante, reincidencia: Math.round(reincidencia * 100) / 100, incidentes, eventos };
  }).filter(r => r.incidentes > 0);

  return {
    total_decisiones: decisiones.length,
    por_accion,
    retroalimentacion: { coincide, corrige, pendientes },
    reincidentes,
    tau_dias: TAU_DIAS,
  };
}
