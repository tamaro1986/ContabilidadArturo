import re
import zipfile
from pathlib import PurePosixPath
from typing import Collection


MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_ARCHIVE_FILES = 10
MAX_ARCHIVE_ENTRIES = 100
MAX_ARCHIVE_MEMBER_BYTES = 50 * 1024 * 1024
MAX_ARCHIVE_TOTAL_BYTES = 100 * 1024 * 1024
MAX_ARCHIVE_COMPRESSION_RATIO = 100

_DOCUMENT_TYPE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,50}$")


class UnsafeUploadError(ValueError):
    """Raised when an uploaded payload violates a security limit."""


def normalize_document_type(value: str) -> str:
    normalized = value.strip()
    if not _DOCUMENT_TYPE_PATTERN.fullmatch(normalized):
        raise UnsafeUploadError(
            "El tipo de documento debe tener entre 1 y 50 caracteres "
            "alfanuméricos, guiones o guiones bajos."
        )
    return normalized


def validate_upload_size(size: int) -> None:
    if size > MAX_UPLOAD_BYTES:
        limit_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise UnsafeUploadError(
            f"El archivo supera el límite permitido de {limit_mb} MB."
        )


def validated_archive_members(
    archive: zipfile.ZipFile,
    allowed_names: Collection[str],
) -> list[zipfile.ZipInfo]:
    recognized: list[zipfile.ZipInfo] = []
    total_uncompressed = 0
    entry_count = 0

    for member in archive.infolist():
        if member.is_dir():
            continue

        entry_count += 1
        if entry_count > MAX_ARCHIVE_ENTRIES:
            raise UnsafeUploadError("El ZIP contiene demasiadas entradas.")
        if member.flag_bits & 0x1:
            raise UnsafeUploadError("El ZIP contiene archivos cifrados.")
        if member.file_size > MAX_ARCHIVE_MEMBER_BYTES:
            raise UnsafeUploadError(
                "Un archivo del ZIP excede el tamaño descomprimido permitido."
            )

        total_uncompressed += member.file_size
        if total_uncompressed > MAX_ARCHIVE_TOTAL_BYTES:
            raise UnsafeUploadError(
                "El contenido descomprimido del ZIP supera el límite permitido."
            )

        if member.file_size:
            if member.compress_size == 0:
                raise UnsafeUploadError(
                    "El ZIP tiene una relación de compresión inválida."
                )
            compression_ratio = member.file_size / member.compress_size
            if compression_ratio > MAX_ARCHIVE_COMPRESSION_RATIO:
                raise UnsafeUploadError(
                    "El ZIP tiene una relación de compresión sospechosa."
                )

        normalized_path = member.filename.replace("\\", "/")
        parts = PurePosixPath(normalized_path).parts
        if normalized_path.startswith("/") or ".." in parts:
            raise UnsafeUploadError("El ZIP contiene una ruta no permitida.")

        basename = PurePosixPath(normalized_path).name
        if basename in allowed_names:
            recognized.append(member)
            if len(recognized) > MAX_ARCHIVE_FILES:
                raise UnsafeUploadError(
                    "El ZIP contiene demasiados archivos permitidos."
                )

    if not recognized:
        raise UnsafeUploadError(
            "El ZIP no contiene anexos financieros con nombres reconocidos."
        )

    return recognized
