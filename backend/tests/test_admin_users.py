from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from app.api.routes.admin import (
    list_admin_users,
    create_admin_user,
    update_user_role,
    toggle_user_status,
    delete_user,
    AdminUserCreate,
    AdminUserRoleUpdate,
    AdminUserStatusUpdate,
)


class MockTable:
    def __init__(self, data=None):
        self._data = data or []

    def select(self, *_args, **_kwargs):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def upsert(self, data, **_kwargs):
        return MockTable([data])

    def update(self, data, **_kwargs):
        return MockTable([data])

    def delete(self):
        return MockTable([{"deleted": True}])

    def execute(self):
        return SimpleNamespace(data=self._data)


class MockAuthAdmin:
    def create_user(self, payload):
        return SimpleNamespace(user=SimpleNamespace(id="uuid-new-user", email=payload["email"]))

    def update_user_by_id(self, user_id, payload):
        return SimpleNamespace(user=SimpleNamespace(id=user_id))

    def delete_user(self, user_id):
        return None


class MockSupabaseAdmin:
    def __init__(self):
        self.auth = SimpleNamespace(admin=MockAuthAdmin())
        self._tenants = [{"id": "tenant-1", "name": "Firma Central"}]
        self._users = [
            {
                "id": "user-1",
                "email": "user@test.com",
                "full_name": "Usuario Test",
                "role": "contador",
                "tenant_id": "tenant-1",
                "is_active": True,
                "created_at": "2026-05-01T00:00:00Z",
                "tenants": {"id": "tenant-1", "name": "Firma Central"}
            }
        ]

    def table(self, name):
        if name == "tenants":
            return MockTable(self._tenants)
        if name == "user_profiles":
            return MockTable(self._users)
        return MockTable([])


def test_list_admin_users():
    client = MockSupabaseAdmin()
    result = list_admin_users(admin_supabase=client, supabase=client)
    assert len(result) == 1
    assert result[0]["email"] == "user@test.com"
    assert result[0]["tenant_name"] == "Firma Central"
    assert result[0]["is_active"] is True


def test_create_admin_user():
    client = MockSupabaseAdmin()
    payload = AdminUserCreate(
        email="nuevo@test.com",
        password="secretpassword123",
        full_name="Nuevo Usuario",
        role="contador",
        tenant_id="tenant-1"
    )
    res = create_admin_user(payload, admin_supabase=client)
    assert res["email"] == "nuevo@test.com"
    assert res["full_name"] == "Nuevo Usuario"
    assert res["role"] == "contador"
    assert res["tenant_name"] == "Firma Central"


def test_update_user_role():
    client = MockSupabaseAdmin()
    res = update_user_role("user-1", AdminUserRoleUpdate(role="administrador"), admin_supabase=client)
    assert "exitosamente" in res["message"]

    with pytest.raises(HTTPException) as exc:
        update_user_role("user-1", AdminUserRoleUpdate(role="invalid_role"), admin_supabase=client)
    assert exc.value.status_code == 400


def test_toggle_user_status():
    client = MockSupabaseAdmin()
    res = toggle_user_status("user-1", AdminUserStatusUpdate(is_active=False), admin_supabase=client)
    assert "inactivado exitosamente" in res["message"]

    res_active = toggle_user_status("user-1", AdminUserStatusUpdate(is_active=True), admin_supabase=client)
    assert "activado exitosamente" in res_active["message"]


def test_delete_user():
    client = MockSupabaseAdmin()
    res = delete_user("user-1", admin_supabase=client)
    assert "eliminado definitivamente" in res["message"]
