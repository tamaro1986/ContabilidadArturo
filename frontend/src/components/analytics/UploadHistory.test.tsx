import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ fetchWithAuth }));

import UploadHistory from "@/components/analytics/UploadHistory";

function historyResponse(status: "processing" | "success" | "error") {
  return {
    status: "success",
    data: [
      {
        id: "upload-1",
        filename: "ventas.csv",
        document_type: "ventas-contribuyentes",
        status,
        records_processed: status === "success" ? 10 : 0,
        error_message: status === "error" ? "Falló la validación." : undefined,
        created_at: "2026-07-28T12:00:00Z",
        companies: { name: "Empresa Uno" },
        user_profiles: { full_name: "Contador" },
      },
    ],
  };
}

describe("UploadHistory polling", () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls a processing upload until success", async () => {
    vi.useFakeTimers();
    const onUploadSuccess = vi.fn();
    fetchWithAuth
      .mockResolvedValueOnce({
        json: async () => historyResponse("processing"),
      })
      .mockResolvedValueOnce({
        json: async () => historyResponse("success"),
      });

    render(<UploadHistory onUploadSuccess={onUploadSuccess} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Procesando")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.getByText("Verificado")).toBeInTheDocument();
    expect(onUploadSuccess).toHaveBeenCalledTimes(1);
  });

  it("stops polling when the upload is in error", async () => {
    vi.useFakeTimers();
    fetchWithAuth.mockResolvedValueOnce({
      json: async () => historyResponse("error"),
    });

    render(<UploadHistory />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Fallo")).toBeInTheDocument();
    const callsAtError = fetchWithAuth.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(fetchWithAuth).toHaveBeenCalledTimes(callsAtError);
  });
});
