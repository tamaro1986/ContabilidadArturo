import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Paso 1: Intentar obtener/refrescar la sesión activa.
  // getSession() solo lee de memoria/storage local. Si el token expiró,
  // NO lo refresca automáticamente en todos los contextos.
  // Usamos getUser() como fallback para forzar un refresh del token.
  let accessToken: string | null = null;

  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    // Verificar si el token está cerca de expirar (menos de 60 segundos)
    const expiresAt = session.expires_at; // Unix timestamp en segundos
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && (expiresAt - now) < 60) {
      // Token a punto de expirar o ya expirado, forzar refresh
      console.log('[Auth] Token próximo a expirar, refrescando sesión...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('[Auth] No se pudo refrescar la sesión:', refreshError?.message);
        // Redirigir a login
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
    // No hay sesión local, intentar obtener usuario (fuerza validación con Supabase)
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

  // Support for mock tenant/persona switching
  if (typeof window !== 'undefined') {
    const mockTenantId = localStorage.getItem("X-Mock-Tenant-ID");
    if (mockTenantId) {
      headers.set("X-Mock-Tenant-ID", mockTenantId);
    }
  }

  // Ensure content-type is set for JSON bodies if not already set
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token rechazado por el backend - intentar un refresh antes de rendirse
      console.warn('[Auth] Backend rechazó el token (401). Intentando refresh...');
      const { data: retryData, error: retryError } = await supabase.auth.refreshSession();
      
      if (retryError || !retryData.session) {
        // Refresh falló - sesión muerta, redirigir a login
        console.error('[Auth] Refresh falló. Redirigiendo a login.');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Tu sesión ha expirado, por favor vuelve a iniciar sesión');
      }

      // Reintentar la petición original con el nuevo token
      headers.set('Authorization', `Bearer ${retryData.session.access_token}`);
      const retryResponse = await fetch(url, { ...options, headers });

      if (retryResponse.status === 401) {
        // Segundo intento también falló, redirigir a login
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
  // resetPassword requiere autenticación porque el usuario llega con un token de recuperación
  // fetchWithAuth se encargará de adjuntar el Bearer token
  const response = await fetchWithAuth('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return response.json();
}
