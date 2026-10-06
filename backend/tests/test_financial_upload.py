import io
from types import SimpleNamespace

import pytest
from fastapi import UploadFile, status

from app.api.routes import financial_data
from app.core.errors import ApiException
from app.core.upload_security import MAX_UPLOAD_BYTES


class FakeQuery:
    def __init__(self, client, table):
        self.client = client
        self.table_name = table
        self.operation = "select"
        self.payload = None
        self.filters = {}

    def select(self, *_args, **_kwargs):
        self.operation = "select"
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def limit(self, _value):
        return self

    def execute(self):
        self.client.operations.append(
            (self.table_name, self.operation, self.payload, dict(self.filters))
        )
        if self.table_name == "companies" and self.operation == "select":
            return SimpleNamespace(data=[{"id": "company-1"}] if self.client.company else [])
        if self.table_name == "csv_upload_history" and self.operation == "select":
            return SimpleNamespace(data=[{"id": "existing"}] if self.client.duplicate else [])
        return SimpleNamespace(data=[self.payload] if self.payload else [])


class FakeBucket:
    def __init__(self, client):
        self.client = client

    def upload(self, **_kwargs):
        if self.client.storage_failure:
            raise RuntimeError("private storage detail")
        self.client.uploaded = True

    def remove(self, paths):
        self.client.removed.extend(paths)


class FakeStorage:
    def __init__(self, client):
        self.client = client

    def from_(self, _bucket):
        return FakeBucket(self.client)


class FakeClient:
    def __init__(
        self,
        *,
        company=True,
        duplicate=False,
        storage_failure=False,
    ):
        self.company = company
        self.duplicate = duplicate
        self.storage_failure = storage_failure
        self.operations = []
        self.uploaded = False
        self.removed = []
        self.storage = FakeStorage(self)

    def table(self, name):
        return FakeQuery(self, name)


def _context():
    return {
        "user": SimpleNamespace(id="user-1"),
        "tenant_id": "tenant-1",
        "role": "contador",
    }


def _upload(content: bytes) -> UploadFile:
    return UploadFile(filename="ventas.csv", file=io.BytesIO(content))


@pytest.mark.asyncio
async def test_cross_tenant_company_is_hidden() -> None:
    with pytest.raises(ApiException) as raised:
        await financial_data.upload_financial_data(
            company_id="company-other",
            document_type="Compras",
            file=_upload(b"FECHA,MONTO,CLIENTE\n2026-01-01,1,A"),
            contador_data=_context(),
            supabase_admin=FakeClient(company=False),
        )
    assert raised.value.status_code == status.HTTP_404_NOT_FOUND
    assert raised.value.code == "COMPANY_NOT_FOUND"


@pytest.mark.asyncio
async def test_oversized_upload_returns_413() -> None:
    with pytest.raises(ApiException) as raised:
        await financial_data.upload_financial_data(
            company_id="company-1",
            document_type="Compras",
            file=_upload(b"x" * (MAX_UPLOAD_BYTES + 1)),
            contador_data=_context(),
            supabase_admin=FakeClient(),
        )
    assert raised.value.status_code == status.HTTP_413_CONTENT_TOO_LARGE
    assert raised.value.code == "UPLOAD_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_duplicate_upload_returns_stable_409(monkeypatch) -> None:
    monkeypatch.setattr(financial_data.magic, "from_buffer", lambda *_args, **_kwargs: "text/csv")
    with pytest.raises(ApiException) as raised:
        await financial_data.upload_financial_data(
            company_id="company-1",
            document_type="Compras",
            file=_upload(b"FECHA,MONTO,CLIENTE\n2026-01-01,1,A"),
            contador_data=_context(),
            supabase_admin=FakeClient(duplicate=True),
        )
    assert raised.value.status_code == status.HTTP_409_CONFLICT
    assert raised.value.code == "DUPLICATE_UPLOAD"


@pytest.mark.asyncio
async def test_storage_error_is_generic(monkeypatch) -> None:
    monkeypatch.setattr(financial_data.magic, "from_buffer", lambda *_args, **_kwargs: "text/csv")
    with pytest.raises(ApiException) as raised:
        await financial_data.upload_financial_data(
            company_id="company-1",
            document_type="Compras",
            file=_upload(b"FECHA,MONTO,CLIENTE\n2026-01-01,1,A"),
            contador_data=_context(),
            supabase_admin=FakeClient(storage_failure=True),
        )
    assert raised.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert raised.value.code == "STORAGE_UNAVAILABLE"
    assert "private storage detail" not in raised.value.detail


@pytest.mark.asyncio
async def test_queue_failure_marks_error_and_removes_object(monkeypatch) -> None:
    client = FakeClient()
    monkeypatch.setattr(financial_data.magic, "from_buffer", lambda *_args, **_kwargs: "text/csv")

    def reject_task(**_kwargs):
        raise RuntimeError("private redis detail")

    monkeypatch.setattr(financial_data.process_financial_csv, "apply_async", reject_task)
    with pytest.raises(ApiException) as raised:
        await financial_data.upload_financial_data(
            company_id="company-1",
            document_type="Compras",
            file=_upload(b"FECHA,MONTO,CLIENTE\n2026-01-01,1,A"),
            contador_data=_context(),
            supabase_admin=client,
        )

    assert raised.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert raised.value.code == "QUEUE_UNAVAILABLE"
    assert client.removed
    error_updates = [
        operation
        for operation in client.operations
        if operation[1] == "update" and operation[2]["status"] == "error"
    ]
    assert {operation[0] for operation in error_updates} == {
        "csv_upload_history",
        "tax_documents",
    }
