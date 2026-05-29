import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const FETCH_TIMEOUT_MS = 60000;

let activeRefreshPromise: Promise<any> | null = null;

async function getSharedRefreshSession() {
  if (activeRefreshPromise) {
    console.log('[Auth] Reutilizando promesa de refresh activa...');
    return activeRefreshPromise;
  }
  console.log('[Auth] Iniciando refresh de sesión compartido...');
  activeRefreshPromise = supabase.auth.refreshSession().then((result) => {
    return result;
  }).catch((err) => {
    console.error('[Auth] Error de red o excepción durante refreshSession:', err);
    return { data: { session: null }, error: err };
  }).finally(() => {
    activeRefreshPromise = null;
  });
  return activeRefreshPromise;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const originalSignal = options.signal;
  if (originalSignal) {
    originalSignal.addEventListener('abort', () => controller.abort());
  }
  options.signal = controller.signal;

  try {
    // Paso 1: Intentar obtener/refrescar la sesión activa.
    let accessToken: string | null = null;

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      
      if (expiresAt && (expiresAt - now) < 60) {
        console.log('[Auth] Token próximo a expirar, refrescando sesión...');
        const { data: refreshData, error: refreshError } = await getSharedRefreshSession();
        
        if (refreshError || !refreshData?.session) {
          console.error('[Auth] No se pudo refrescar la sesión:', refreshError?.message);
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Tu sesión ha expirado, por favor vuelve a iniciar sesión');
        }
        
        accessToken = refreshData.session.access_token;
      } else {
        accessToken = session.access_token;
      }
    } else {
      console.warn('[Auth] No se encontró sesión local. Redirigiendo a login.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('No hay sesión activa. Por favor inicie sesión.');
    }

    const headers = new Headers(options.headers || {});
    
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (typeof window !== 'undefined') {
      const mockTenantId = localStorage.getItem("X-Mock-Tenant-ID");
      if (mockTenantId) {
        headers.set("X-Mock-Tenant-ID", mockTenantId);
      }
    }

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      console.warn('[Auth] Backend rechazó el token (401). Intentando refresh...');
      const { data: retryData, error: retryError } = await getSharedRefreshSession();
      
      if (retryError || !retryData?.session) {
        console.error('[Auth] Refresh falló. Redirigiendo a login.');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Tu sesión ha expirado, por favor vuelve a iniciar sesión');
      }

      headers.set('Authorization', `Bearer ${retryData.session.access_token}`);
      const retryResponse = await fetch(url, { ...options, headers });

      if (retryResponse.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Tu sesión ha expirado, por favor vuelve a iniciar sesión');
      }

      if (!retryResponse.ok) {
        let errorData;
        try {
          errorData = await retryResponse.json();
        } catch (e) {
          errorData = { detail: 'Error desconocido en el servidor' };
        }
        throw new Error(errorData.detail || errorData.message || `Error HTTP: ${retryResponse.status}`);
      }

      return retryResponse;
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: 'Error desconocido en el servidor' };
      }
      throw new Error(errorData.detail || errorData.message || `Error HTTP: ${response.status}`);
    }

    return response;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function forgotPassword(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al solicitar recuperación de contraseña');
  }
  return response.json();
}

export async function resetPassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password: password });
  
  if (error) {
    throw new Error(error.message || 'Error al actualizar la contraseña');
  }
  return data;
}
