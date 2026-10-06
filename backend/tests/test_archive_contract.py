import zipfile

import pytest

from app.core.upload_security import (
    MAX_ARCHIVE_MEMBER_BYTES,
    UnsafeUploadError,
    validated_archive_members,
)
from app.worker.tasks import ALLOWED_FILES


class FakeArchive:
    def __init__(self, members: list[zipfile.ZipInfo]):
        self.members = members

    def infolist(self) -> list[zipfile.ZipInfo]:
        return self.members


def test_unrecognized_zip_entries_still_count_toward_security_limits() -> None:
    ignored_bomb = zipfile.ZipInfo("ignored.bin")
    ignored_bomb.file_size = MAX_ARCHIVE_MEMBER_BYTES + 1
    ignored_bomb.compress_size = 1
    recognized = zipfile.ZipInfo(next(iter(ALLOWED_FILES)))
    recognized.file_size = 10
    recognized.compress_size = 10

    with pytest.raises(UnsafeUploadError, match="excede"):
        validated_archive_members(
            FakeArchive([ignored_bomb, recognized]),  # type: ignore[arg-type]
            ALLOWED_FILES,
        )
