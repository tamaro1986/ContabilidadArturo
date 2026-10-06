import { ApiError } from "./api";

export function getErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado.",
): string {
  if (error instanceof ApiError) {
    return error.detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
