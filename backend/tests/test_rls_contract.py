from pathlib import Path


MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def _migration_text(pattern: str) -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(MIGRATIONS.glob(pattern))
    ).lower()


def test_financial_tables_enable_rls_and_scope_by_tenant() -> None:
    all_migrations = _migration_text("*.sql")
    financial = _migration_text("*financial_records.sql")
    uploads = _migration_text("*csv_upload_history.sql")
    companies = _migration_text("*companies_and_documents.sql")

    assert "alter table public.financial_records enable row level security" in financial
    assert "tenant_id" in financial
    assert "get_current_user_tenant_id()" in financial
    assert "auth.uid()" in all_migrations
    assert "alter table public.csv_upload_history enable row level security" in uploads
    assert "tenant_id" in uploads and "auth.uid()" in uploads
    assert "alter table public.companies enable row level security" in companies
    assert "alter table public.tax_documents enable row level security" in companies
