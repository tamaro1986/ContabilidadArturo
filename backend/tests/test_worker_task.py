from types import SimpleNamespace

from app.worker import tasks


class FakeQuery:
    def __init__(self, client, table):
        self.client = client
        self.table_name = table
        self.operation = "select"
        self.payload = None
        self.filters = {}
        self.count_requested = False

    def select(self, *_args, **kwargs):
        self.operation = "select"
        self.count_requested = kwargs.get("count") == "exact"
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
        if self.table_name == "csv_upload_history" and self.operation == "select":
            return SimpleNamespace(
                data=[
                    {
                        "status": self.client.status,
                        "tenant_id": "tenant-1",
                        "company_id": "company-1",
                    }
                ]
            )
        if self.table_name == "financial_records" and self.operation == "insert":
            self.client.batch_sizes.append(len(self.payload))
            self.client.records.extend(self.payload)
        if self.table_name == "financial_records" and self.count_requested:
            return SimpleNamespace(data=[], count=len(self.client.records))
        if self.table_name == "csv_upload_history" and self.operation == "update":
            self.client.status = self.payload["status"]
        return SimpleNamespace(data=[self.payload] if self.payload else [], count=None)


class FakeBucket:
    def __init__(self, client):
        self.client = client

    def download(self, _path):
        return self.client.payload

    def remove(self, paths):
        self.client.removed.extend(paths)


class FakeStorage:
    def __init__(self, client):
        self.client = client

    def from_(self, _bucket):
        return FakeBucket(self.client)


class FakeClient:
    def __init__(self, payload):
        self.payload = payload
        self.status = "pending"
        self.batch_sizes = []
        self.records = []
        self.removed = []
        self.storage = FakeStorage(self)

    def table(self, name):
        return FakeQuery(self, name)


def test_worker_batches_500_and_is_idempotent(monkeypatch) -> None:
    rows = ["FECHA,CLIENTE,MONTO"]
    rows.extend(f"2026-01-01,Cliente {index},{index}" for index in range(1001))
    client = FakeClient("\n".join(rows).encode())
    monkeypatch.setattr(tasks, "get_supabase_admin_client", lambda: client)
    monkeypatch.setattr(tasks, "invalidate_tenant_cache", lambda _tenant: None)

    first = tasks.process_financial_csv.run(
        bucket_name="financial_uploads",
        file_path="tenant-1/upload.csv",
        tenant_id="tenant-1",
        company_id="company-1",
        upload_id="upload-1",
        tax_doc_id="tax-1",
        document_type="Otros",
    )
    assert first == {"status": "success", "processed_rows": 1001}
    assert client.batch_sizes == [500, 500, 1]
    assert all(record["upload_id"] == "upload-1" for record in client.records)

    second = tasks.process_financial_csv.run(
        bucket_name="financial_uploads",
        file_path="tenant-1/upload.csv",
        tenant_id="tenant-1",
        company_id="company-1",
        upload_id="upload-1",
        tax_doc_id="tax-1",
        document_type="Otros",
    )
    assert second == {"status": "success", "idempotent": True}
    assert client.batch_sizes == [500, 500, 1]
