/**
 * Datos de ejemplo para el Centro del Agente (GET /agente/decisiones y GET /agente/metricas).
 * Se usan mientras el backend no está listo: VITE_USE_MOCKS=true en frontend/.env.local
 * La forma de estos objetos es el contrato que debe respetar el backend.
 */
import type { Accion, Categoria } from './agente';

export interface DecisionAgente {
  id: number;
  fecha: string;                 // ISO
  estudiante: string;
  curso: string;
  texto: string;
  accion: Accion;
  categoria: Categoria;          // categoría más probable
  score_toxicidad: number;       // 0..1
  reincidencia: number;          // R del estudiante al momento de decidir
  fragmentos: string[];
  explicacion: string;
  decision_docente: 'APROBADO' | 'RECHAZADO' | null; // null = no aplica o pendiente
}

export interface MetricasAgente {
  total_decisiones: number;
  por_accion: Record<Accion, number>;
  retroalimentacion: { coincide: number; corrige: number; pendientes: number };
  reincidentes: Array<{ estudiante: string; reincidencia: number; incidentes: number;
    eventos: Array<{ dias_atras: number; severidad: number }> }>;
  tau_dias: number;
}

const hace = (dias: number, horas = 0) => new Date(Date.now() - dias * 864e5 - horas * 36e5).toISOString();

export const decisionesMock: DecisionAgente[] = [
  { id: 12, fecha: hace(0, 1), estudiante: 'Laura Gómez', curso: 'Inteligencia Artificial', texto: 'Eso es una estupidez, eres un idiota',
    accion: 'RETENER', categoria: 'insulto', score_toxicidad: 0.92, reincidencia: 0.61, fragmentos: ['estupidez', 'idiota'],
    explicacion: 'Insulto directo («estupidez, idiota»). Laura tiene reincidencia reciente (R = 0.61), por eso retuvo en vez de pedir reescritura.', decision_docente: null },
  { id: 11, fecha: hace(0, 3), estudiante: 'Andrés Ruiz', curso: 'Inteligencia Artificial', texto: 'Tu argumento no tiene sustento, revisa las fuentes',
    accion: 'PUBLICAR', categoria: 'ninguna', score_toxicidad: 0.14, reincidencia: 0, fragmentos: [],
    explicacion: 'Crítica académica sin ataques personales. Se publicó.', decision_docente: null },
  { id: 10, fecha: hace(0, 5), estudiante: 'Mateo Díaz', curso: 'Estructuras de Datos', texto: 'eres un 1d10t4',
    accion: 'PEDIR_REESCRITURA', categoria: 'insulto', score_toxicidad: 0.78, reincidencia: 0, fragmentos: ['1d10t4'],
    explicacion: 'Insulto escrito con evasión («1d10t4» → «idiota»). Sin historial, se le pidió reescribir.', decision_docente: null },
  { id: 9, fecha: hace(1, 2), estudiante: 'Carlos Pérez', curso: 'Ingeniería de Software', texto: 'Nadie te pidió tu opinión, mejor cállate',
    accion: 'RETENER', categoria: 'acoso', score_toxicidad: 0.52, reincidencia: 0.34, fragmentos: ['cállate'],
    explicacion: 'Lenguaje de acoso («cállate») y reincidencia moderada. Retenido para revisión.', decision_docente: 'RECHAZADO' },
  { id: 8, fecha: hace(1, 6), estudiante: 'Valentina Torres', curso: 'Bases de Datos', texto: 'Gracias, profe, ya entendí la normalización',
    accion: 'PUBLICAR', categoria: 'ninguna', score_toxicidad: 0.03, reincidencia: 0, fragmentos: [],
    explicacion: 'Mensaje respetuoso. Se publicó.', decision_docente: null },
  { id: 7, fecha: hace(2, 1), estudiante: 'Sebastián Mora', curso: 'Inteligencia Artificial', texto: 'Esta tarea está brutal, me mató',
    accion: 'RETENER', categoria: 'amenaza', score_toxicidad: 0.41, reincidencia: 0, fragmentos: ['me mató'],
    explicacion: 'Posible amenaza («me mató»). Retenido por precaución.', decision_docente: 'APROBADO' },
  { id: 6, fecha: hace(3, 4), estudiante: 'Daniela Rojas', curso: 'Cálculo', texto: 'Compren apuntes baratos en este link: bit.ly/xxxx',
    accion: 'RETENER', categoria: 'spam', score_toxicidad: 0.66, reincidencia: 0, fragmentos: ['bit.ly/xxxx'],
    explicacion: 'Spam con enlace externo. Retenido.', decision_docente: 'RECHAZADO' },
  { id: 5, fecha: hace(4, 2), estudiante: 'Laura Gómez', curso: 'Inteligencia Artificial', texto: 'Qué respuesta tan bruta, no sabes nada',
    accion: 'PEDIR_REESCRITURA', categoria: 'insulto', score_toxicidad: 0.83, reincidencia: 0.14, fragmentos: ['bruta', 'no sabes nada'],
    explicacion: 'Insulto («bruta, no sabes nada»). Reincidencia baja, se le pidió reescribir.', decision_docente: null },
  { id: 4, fecha: hace(5, 3), estudiante: 'Juan Castillo', curso: 'Estructuras de Datos', texto: 'No estoy de acuerdo, el árbol AVL no aplica aquí',
    accion: 'PUBLICAR', categoria: 'ninguna', score_toxicidad: 0.06, reincidencia: 0, fragmentos: [],
    explicacion: 'Desacuerdo académico respetuoso. Se publicó.', decision_docente: null },
  { id: 3, fecha: hace(6, 1), estudiante: 'Carlos Pérez', curso: 'Ingeniería de Software', texto: 'Ese código está horrible, qué pereza',
    accion: 'PUBLICAR_CON_AVISO', categoria: 'insulto', score_toxicidad: 0.38, reincidencia: 0, fragmentos: ['horrible'],
    explicacion: 'Tono despectivo leve («horrible»). Se publicó con un aviso.', decision_docente: null },
  { id: 2, fecha: hace(8, 2), estudiante: 'Sara López', curso: 'Bases de Datos', texto: 'Alguien tiene el enunciado del taller 3?',
    accion: 'PUBLICAR', categoria: 'ninguna', score_toxicidad: 0.02, reincidencia: 0, fragmentos: [],
    explicacion: 'Mensaje respetuoso. Se publicó.', decision_docente: null },
  { id: 1, fecha: hace(10, 2), estudiante: 'Laura Gómez', curso: 'Inteligencia Artificial', texto: 'Ese aporte es una tontería',
    accion: 'PUBLICAR_CON_AVISO', categoria: 'insulto', score_toxicidad: 0.6, reincidencia: 0, fragmentos: ['tontería'],
    explicacion: 'Descalificación leve («tontería»). Primera vez: se publicó con aviso.', decision_docente: null },
];

export const metricasMock: MetricasAgente = {
  total_decisiones: 12,
  por_accion: { PUBLICAR: 4, PUBLICAR_CON_AVISO: 2, PEDIR_REESCRITURA: 2, RETENER: 4, RETENER_URGENTE: 0 },
  retroalimentacion: { coincide: 2, corrige: 1, pendientes: 1 },
  reincidentes: [
    { estudiante: 'Laura Gómez', reincidencia: 0.61, incidentes: 2,
      eventos: [{ dias_atras: 10, severidad: 0.6 }, { dias_atras: 4, severidad: 0.83 }] },
    { estudiante: 'Carlos Pérez', reincidencia: 0.37, incidentes: 2,
      eventos: [{ dias_atras: 6, severidad: 0.38 }, { dias_atras: 1, severidad: 0.25 }] },
    { estudiante: 'Daniela Rojas', reincidencia: 0.43, incidentes: 1,
      eventos: [{ dias_atras: 3, severidad: 0.66 }] },
  ],
  tau_dias: 7,
};
