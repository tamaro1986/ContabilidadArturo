import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: authMocks,
  },
}));

import { ApiError, fetchWithAuth } from "@/lib/api";

function sessionResult(
  accessToken: string,
  expiresAt = Math.floor(Date.now() / 1000) + 3600,
) {
  return {
    data: {
      session: {
        access_token: accessToken,
        expires_at: expiresAt,
      },
    },
    error: null,
  };
}

describe("fetchWithAuth", () => {
  beforeEach(() => {
    authMocks.getSession.mockResolvedValue(sessionResult("token-1"));
    authMocks.refreshSession.mockResolvedValue(sessionResult("token-2"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shares one refresh across concurrent requests", async () => {
    authMocks.getSession.mockResolvedValue(
      sessionResult("expiring", Math.floor(Date.now() / 1000) + 5),
    );
    let resolveRefresh: (value: ReturnType<typeof sessionResult>) => void =
      () => undefined;
    authMocks.refreshSession.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchWithAuth("/one");
    const second = fetchWithAuth("/two");
    await Promise.resolve();
    expect(authMocks.refreshSession).toHaveBeenCalledTimes(1);

    resolveRefresh(sessionResult("refreshed"));
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes and retries once after a 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithAuth("/protected");

    expect(authMocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(retryOptions.headers).get("Authorization")).toBe(
      "Bearer token-2",
    );
  });

  it("throws the stable backend error payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: "Este archivo ya fue cargado.",
            code: "DUPLICATE_UPLOAD",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const error = await fetchWithAuth("/upload").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "DUPLICATE_UPLOAD",
      detail: "Este archivo ya fue cargado.",
    });
  });

  it("maps a caller abort to a typed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (options.signal?.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      }),
    );
    const controller = new AbortController();
    const request = fetchWithAuth("/slow", { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({
      status: 0,
      code: "REQUEST_ABORTED",
    });
  });

  it("maps the internal timeout to a typed error", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("timeout", "AbortError"));
          });
        });
      }),
    );

    const request = fetchWithAuth("/slow");
    const rejection = expect(request).rejects.toMatchObject({
      status: 408,
      code: "REQUEST_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await rejection;
  });
});
