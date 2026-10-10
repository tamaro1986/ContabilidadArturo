import { supabase } from "./supabaseClient";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const FETCH_TIMEOUT_MS = 60_000;

type RefreshResult = Awaited<ReturnType<typeof supabase.auth.refreshSession>>;

export interface ApiErrorPayload {
  detail?: unknown;
  code?: unknown;
  message?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

let activeRefreshPromise: Promise<RefreshResult> | null = null;

async function getSharedRefreshSession(): Promise<RefreshResult> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = supabase.auth.refreshSession();
  try {
    return await activeRefreshPromise;
  } finally {
    activeRefreshPromise = null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(
  value: unknown,
  field: keyof ApiErrorPayload,
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const candidate = value[field];
  return typeof candidate === "string" ? candidate : undefined;
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const detail =
    stringField(payload, "detail") ??
    stringField(payload, "message") ??
    "El servidor no pudo completar la solicitud.";
  const code = stringField(payload, "code") ?? `HTTP_${response.status}`;
  return new ApiError(response.status, code, detail);
}

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

async function requireAccessToken(): Promise<string> {
  if (typeof window !== "undefined") {
    const localToken = window.localStorage.getItem("access_token");
    if (localToken) {
      return localToken;
    }
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    redirectToLogin();
    throw new ApiError(401, "AUTH_REQUIRED", "No hay una sesión activa.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - now < 60) {
    const { data, error: refreshError } = await getSharedRefreshSession();
    if (refreshError || !data.session?.access_token) {
      redirectToLogin();
      throw new ApiError(401, "AUTH_EXPIRED", "La sesión ha expirado.");
    }
    return data.session.access_token;
  }

  return session.access_token;
}

function buildHeaders(options: RequestInit, accessToken: string): Headers {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (typeof window !== "undefined") {
    const mockTenantId = window.localStorage.getItem("X-Mock-Tenant-ID");
    if (mockTenantId) {
      headers.set("X-Mock-Tenant-ID", mockTenantId);
    }
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function resolveUrl(endpoint: string): string {
  if (endpoint.startsWith("http")) {
    return endpoint;
  }
  const separator = endpoint.startsWith("/") ? "" : "/";
  return `${API_BASE_URL}${separator}${endpoint}`;
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    let accessToken = await requireAccessToken();
    const headers = buildHeaders(options, accessToken);
    const url = resolveUrl(endpoint);
    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: controller.signal,
    };

    let response = await fetch(url, requestOptions);
    if (response.status === 401) {
      const { data, error } = await getSharedRefreshSession();
      if (error || !data.session?.access_token) {
        redirectToLogin();
        throw new ApiError(401, "AUTH_EXPIRED", "La sesión ha expirado.");
      }
      accessToken = data.session.access_token;
      headers.set("Authorization", `Bearer ${accessToken}`);
      response = await fetch(url, { ...requestOptions, headers });
    }

    if (!response.ok) {
      throw await toApiError(response);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      if (timedOut) {
        throw new ApiError(
          408,
          "REQUEST_TIMEOUT",
          "La solicitud excedió el tiempo de espera.",
        );
      }
      throw new ApiError(0, "REQUEST_ABORTED", "La solicitud fue cancelada.");
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "No fue posible conectar con el servidor.",
    );
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function forgotPassword(
  email: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as Record<string, unknown>;
}

export async function resetPassword(
  password: string,
): Promise<Awaited<ReturnType<typeof supabase.auth.updateUser>>["data"]> {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new ApiError(
      422,
      "PASSWORD_UPDATE_FAILED",
      "No se pudo actualizar la contraseña.",
    );
  }
  return data;
}
