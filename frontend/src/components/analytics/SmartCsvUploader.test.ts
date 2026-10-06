import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_SIZE_BYTES,
  validateUploadMetadata,
} from "@/components/analytics/SmartCsvUploader";

describe("upload validation", () => {
  it("accepts CSV and ZIP files up to 25 MB", () => {
    expect(
      validateUploadMetadata({ name: "ventas.csv", size: MAX_UPLOAD_SIZE_BYTES }),
    ).toBeNull();
    expect(
      validateUploadMetadata({ name: "anexos.zip", size: 1024 }),
    ).toBeNull();
  });

  it("rejects oversized and unsupported files", () => {
    expect(
      validateUploadMetadata({
        name: "ventas.csv",
        size: MAX_UPLOAD_SIZE_BYTES + 1,
      }),
    ).toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(
      validateUploadMetadata({ name: "ventas.exe", size: 1024 }),
    ).toMatchObject({ code: "INVALID_FILE_TYPE" });
  });
});
