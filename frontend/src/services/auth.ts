export type BackendRole = 'ADMIN_INSTITUCIONAL' | 'DOCENTE' | 'ESTUDIANTE';
export type FrontendRole = 'admin' | 'docente' | 'estudiante';

export interface SessionUser {
  email: string;
  role: FrontendRole;
}

const API_BASE_URL = `http://${window.location.hostname || 'localhost'}:8000`;

const ACCESS_TOKEN_KEY = 'rau_access_token';
const REFRESH_TOKEN_KEY = 'rau_refresh_token';
const USER_KEY = 'rau_user';

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function mapBackendRoleToFrontend(role: string): FrontendRole | null {
  switch (role as BackendRole) {
    case 'ADMIN_INSTITUCIONAL':
      return 'admin';
    case 'DOCENTE':
      return 'docente';
    case 'ESTUDIANTE':
      return 'estudiante';
    default:
      return null;
  }
}

export async function loginWithBackend(email: string, password: string): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || 'Credenciales inválidas');
  }

  const payload = decodeJwtPayload(data.access_token);
  const role = mapBackendRoleToFrontend(payload?.rol || '');

  if (!payload?.email || !role) {
    throw new Error('No se pudo determinar el rol del usuario');
  }

  const user: SessionUser = {
    email: payload.email,
    role,
  };

  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user;
}

export function getStoredSession(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!raw || !accessToken) return null;

  try {
    const user = JSON.parse(raw) as SessionUser;
    if (!user?.email || !user?.role) return null;
    return user;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
