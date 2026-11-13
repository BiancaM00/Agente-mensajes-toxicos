const API_BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) ? String(import.meta.env.VITE_API_URL) : `http://${window.location.hostname || 'localhost'}:8000`;

const ACCESS_TOKEN_KEY = 'rau_access_token';
const REFRESH_TOKEN_KEY = 'rau_refresh_token';

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh })
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      if (data.refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function request(path: string, opts: RequestInit = {}, retry = true) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string,string> || {})
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE_URL + path, { ...opts, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, opts, false);
    }
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) throw json;
    return json;
  }

  if (!res.ok) throw new Error(res.statusText);
  return res;
}

export async function getCursosForUser() {
  return request('/foros/cursos', { method: 'GET' });
}

export async function getAllCursos() {
  return request('/cursos', { method: 'GET' });
}

export async function createCurso(payload: { institucion_id: number; codigo: string; nombre: string; periodo: string }) {
  return request('/cursos', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteCurso(cursoId: number) {
  return request(`/cursos/${cursoId}`, { method: 'DELETE' });
}

export async function getCursoMatriculas(cursoId: number) {
  return request(`/cursos/${cursoId}/matriculas`, { method: 'GET' });
}

export async function upsertCursoMatricula(
  cursoId: number,
  payload: { usuario_email?: string; usuario_id?: number; rol_en_curso: string; crear_si_no_existe?: boolean; nombre?: string }
) {
  return request(`/cursos/${cursoId}/matriculas`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function selfEnrollInCourse(cursoId: number, payload: { rol_en_curso?: string } = {}) {
  return request(`/cursos/${cursoId}/matriculas/me`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteCourseEnrollment(cursoId: number, usuarioId: number) {
  return request(`/cursos/${cursoId}/matriculas/${usuarioId}`, { method: 'DELETE' });
}

export async function getForosByCurso(cursoId: number) {
  return request(`/foros/cursos/${cursoId}`, { method: 'GET' });
}

export async function getHilosByForo(foroId: number) {
  return request(`/foros/${foroId}/hilos`, { method: 'GET' });
}

export async function getPublicacionesByHilo(hiloId: number) {
  return request(`/foros/hilos/${hiloId}/publicaciones`, { method: 'GET' });
}

export async function getPendingModeration(curso_id?: number) {
  const qs = curso_id ? `?curso_id=${curso_id}` : '';
  return request(`/moderacion/pendientes${qs}`, { method: 'GET' });
}

export async function getModerationHistory(limit = 100, offset = 0) {
  const qs = `?limit=${limit}&offset=${offset}`;
  return request(`/moderacion/historial${qs}`, { method: 'GET' });
}

export async function getMetricasGlobales() {
  return request('/moderacion/metricas-globales', { method: 'GET' });
}

export async function getMyPublications() {
  return request('/foros/mis-publicaciones', { method: 'GET' });
}

export async function getDashboardMetrics(dias = 30) {
  return request(`/dashboard/metricas?dias=${dias}`, { method: 'GET' });
}

export async function getDashboardUsers(includeInactive = false) {
  const qs = includeInactive ? '?incluir_inactivos=true' : '';
  return request(`/dashboard/usuarios${qs}`, { method: 'GET' });
}

export async function deleteDashboardUser(userId: number) {
  return request(`/dashboard/usuarios/${userId}`, { method: 'DELETE' });
}

export async function getUnreadNotificationCount() {
  return request('/notificaciones/sin-leer/count', { method: 'GET' });
}

export async function getMyNotifications(limit = 50, offset = 0, leidas: boolean | null = false) {
  const qs = `?limit=${limit}&offset=${offset}${leidas === null ? '' : `&leidas=${String(leidas)}`}`;
  return request(`/notificaciones${qs}`, { method: 'GET' });
}

export async function markNotificationRead(notifId: number) {
  return request(`/notificaciones/${notifId}/marcar-leida`, { method: 'PUT' });
}

export async function markAllNotificationsRead() {
  return request('/notificaciones/marcar-todas-leidas', { method: 'PUT' });
}

export async function assignModerator(pubId: number) {
  return request(`/moderacion/${pubId}/asignar`, { method: 'PUT' });
}

const apiDefault = {
  request,
  getCursosForUser,
  getAllCursos,
  getForosByCurso,
  getHilosByForo,
  getPublicacionesByHilo,
  getPendingModeration,
  getModerationHistory,
  getMetricasGlobales,
  getMyPublications,
  getDashboardMetrics,
  getUnreadNotificationCount,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  assignModerator,
  createCurso,
  deleteCurso,
  getCursoMatriculas,
  upsertCursoMatricula,
  selfEnrollInCourse,
  deleteCourseEnrollment,
  getDashboardUsers,
  deleteDashboardUser,
  registerStudent,
  registerTeacher,
  createForo,
  createHilo,
  createPublicacion,
  aprobarPublicacion,
  rechazarPublicacion
};

export default apiDefault;

// Registration
export async function registerStudent(payload: { nombre: string; email: string; password: string; institucion_id?: number }) {
  return request('/auth/registro/estudiante', { method: 'POST', body: JSON.stringify(payload) });
}

export async function registerTeacher(payload: { nombre: string; email: string; password: string; institucion_id?: number; codigo_docente?: string }) {
  return request('/auth/registro/docente', { method: 'POST', body: JSON.stringify(payload) });
}

// Create forum/hilo/publicacion
export async function createForo(cursoId: number, payload: { titulo: string }) {
  return request(`/foros/cursos/${cursoId}/foros`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function createHilo(cursoId: number, payload: { titulo: string; descripcion?: string }) {
  return request(`/foros/cursos/${cursoId}/hilos`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function createPublicacion(hiloId: number, payload: { contenido: string }) {
  return request(`/foros/hilos/${hiloId}/publicaciones`, { method: 'POST', body: JSON.stringify(payload) });
}

// Moderation actions
export async function aprobarPublicacion(pubId: number, observacion?: string) {
  return request(`/moderacion/${pubId}/aprobar`, { method: 'PUT', body: JSON.stringify({ observacion }) });
}

export async function rechazarPublicacion(pubId: number, observacion?: string) {
  return request(`/moderacion/${pubId}/rechazar`, { method: 'PUT', body: JSON.stringify({ observacion }) });
}

// (named exports are available above; default export also contains them)
