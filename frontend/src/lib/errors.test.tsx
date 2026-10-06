import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

function ErrorView({ error }: { error: unknown }) {
  return <div role="alert">{getErrorMessage(error)}</div>;
}

describe("typed API errors", () => {
  it("renders the detail from ApiError", () => {
    render(
      <ErrorView
        error={new ApiError(409, "DUPLICATE_UPLOAD", "Carga duplicada.")}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Carga duplicada.");
  });
});
