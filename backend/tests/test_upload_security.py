import io
import zipfile

import pytest

from app.core.upload_security import (
    MAX_ARCHIVE_COMPRESSION_RATIO,
    MAX_ARCHIVE_FILES,
    MAX_UPLOAD_BYTES,
    UnsafeUploadError,
    normalize_document_type,
    validate_upload_size,
    validated_archive_members,
)
from app.worker.tasks import ALLOWED_FILES


def test_upload_size_limit_is_enforced() -> None:
    validate_upload_size(MAX_UPLOAD_BYTES)
    with pytest.raises(UnsafeUploadError):
        validate_upload_size(MAX_UPLOAD_BYTES + 1)


def test_document_type_is_normalized_and_rejects_untrusted_text() -> None:
    assert normalize_document_type("  VentasContribuyente ") == "VentasContribuyente"
    with pytest.raises(UnsafeUploadError):
        normalize_document_type("../../Ventas")


def test_zip_rejects_more_than_ten_recognized_members() -> None:
    payload = io.BytesIO()
    allowed_name = next(iter(ALLOWED_FILES))
    with zipfile.ZipFile(payload, "w") as archive:
        for index in range(MAX_ARCHIVE_FILES + 1):
            archive.writestr(f"{index}/{allowed_name}", f"row-{index}")

    with zipfile.ZipFile(io.BytesIO(payload.getvalue())) as archive:
        with pytest.raises(UnsafeUploadError, match="demasiados"):
            validated_archive_members(archive, ALLOWED_FILES)


def test_zip_rejects_suspicious_compression_ratio() -> None:
    payload = io.BytesIO()
    allowed_name = next(iter(ALLOWED_FILES))
    with zipfile.ZipFile(payload, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            allowed_name,
            b"A" * (MAX_ARCHIVE_COMPRESSION_RATIO * 2048),
        )

    with zipfile.ZipFile(io.BytesIO(payload.getvalue())) as archive:
        with pytest.raises(UnsafeUploadError, match="compresión"):
            validated_archive_members(archive, ALLOWED_FILES)


def test_zip_must_contain_a_recognized_annex() -> None:
    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        archive.writestr("not-supported.csv", "a,b,c")

    with zipfile.ZipFile(io.BytesIO(payload.getvalue())) as archive:
        with pytest.raises(UnsafeUploadError, match="reconocidos"):
            validated_archive_members(archive, ALLOWED_FILES)
