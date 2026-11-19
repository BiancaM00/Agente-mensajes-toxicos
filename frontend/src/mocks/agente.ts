/**
 * Datos falsos con la forma exacta del contrato del agente (POST /agente/analizar).
 * Se usan mientras el backend no está listo: VITE_USE_MOCKS=true en frontend/.env.local
 */
export type Accion = 'PUBLICAR' | 'PUBLICAR_CON_AVISO' | 'PEDIR_REESCRITURA' | 'RETENER' | 'RETENER_URGENTE';
export type Categoria = 'ninguna' | 'insulto' | 'acoso' | 'amenaza' | 'odio' | 'spam';

export interface RespuestaAgente {
  accion: Accion;
  score_toxicidad: number;
  probabilidades: Record<Categoria, number>;
  costo_esperado: Record<Accion, number>;
  reincidencia: number;
  fragmentos: string[];
  explicacion: string;
  pasos: string[];
  modelo: string;
}

const PASOS = ['percibir', 'normalizar', 'clasificar', 'actualizar_estado', 'decidir', 'actuar'];

/** Mensajes del guion de demo con la respuesta que daría el agente. */
export const ejemplosDemo: Array<{ etiqueta: string; texto: string; padre?: string; respuesta: RespuestaAgente }> = [
  {
    etiqueta: 'Respetuoso',
    texto: 'Gracias, profe, ya entendí el algoritmo A*',
    respuesta: {
      accion: 'PUBLICAR', score_toxicidad: 0.03,
      probabilidades: { ninguna: 0.97, insulto: 0.01, acoso: 0.0, amenaza: 0.0, odio: 0.01, spam: 0.01 },
      costo_esperado: { PUBLICAR: 0.13, PUBLICAR_CON_AVISO: 1.06, PEDIR_REESCRITURA: 2.99, RETENER: 4.9, RETENER_URGENTE: 8.84 },
      reincidencia: 0, fragmentos: [], explicacion: 'Tu mensaje se publicó.', pasos: PASOS, modelo: 'mock',
    },
  },
  {
    etiqueta: 'Insulto',
    texto: 'Eso es una estupidez, eres un idiota',
    padre: 'Creo que A* no siempre es óptimo si la heurística sobreestima el costo',
    respuesta: {
      accion: 'RETENER', score_toxicidad: 0.92,
      probabilidades: { ninguna: 0.08, insulto: 0.74, acoso: 0.12, amenaza: 0.01, odio: 0.02, spam: 0.03 },
      costo_esperado: { PUBLICAR: 12.27, PUBLICAR_CON_AVISO: 8.16, PEDIR_REESCRITURA: 3.94, RETENER: 2.96, RETENER_URGENTE: 5.66 },
      reincidencia: 0.61, fragmentos: ['idiota', 'estupidez'],
      explicacion: 'El mensaje contiene un insulto («idiota, estupidez»). Tu mensaje quedó en revisión del docente.',
      pasos: PASOS, modelo: 'mock',
    },
  },
  {
    etiqueta: 'Crítica académica',
    texto: 'Tu argumento no tiene sustento, revisa las fuentes',
    respuesta: {
      accion: 'PUBLICAR', score_toxicidad: 0.14,
      probabilidades: { ninguna: 0.86, insulto: 0.09, acoso: 0.02, amenaza: 0.0, odio: 0.01, spam: 0.02 },
      costo_esperado: { PUBLICAR: 1.13, PUBLICAR_CON_AVISO: 1.63, PEDIR_REESCRITURA: 2.96, RETENER: 4.65, RETENER_URGENTE: 8.43 },
      reincidencia: 0, fragmentos: [], explicacion: 'Tu mensaje se publicó.', pasos: PASOS, modelo: 'mock',
    },
  },
  {
    etiqueta: 'Evasión',
    texto: 'eres un 1d10t4',
    respuesta: {
      accion: 'PEDIR_REESCRITURA', score_toxicidad: 0.78,
      probabilidades: { ninguna: 0.22, insulto: 0.66, acoso: 0.07, amenaza: 0.01, odio: 0.02, spam: 0.02 },
      costo_esperado: { PUBLICAR: 6.98, PUBLICAR_CON_AVISO: 4.75, PEDIR_REESCRITURA: 2.28, RETENER: 3.22, RETENER_URGENTE: 6.11 },
      reincidencia: 0, fragmentos: ['idiota'],
      explicacion: 'El mensaje contiene un insulto («idiota»). Reescribe el mensaje con un tono respetuoso antes de publicarlo.',
      pasos: PASOS, modelo: 'mock',
    },
  },
];

/** Respuesta falsa: la del ejemplo si coincide el texto; si no, una respuesta "publicar". */
export function respuestaMock(texto: string): RespuestaAgente {
  const ej = ejemplosDemo.find(e => e.texto.trim().toLowerCase() === texto.trim().toLowerCase());
  return ej ? ej.respuesta : ejemplosDemo[0].respuesta;
}
