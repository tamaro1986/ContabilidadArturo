from types import SimpleNamespace

import pytest
from fastapi import status
from starlette.requests import Request

from app.api.dependencies.roles import RoleChecker, UserRole
from app.core.errors import ApiException
from app.core.security import get_authenticated_session


def _request(headers: list[tuple[bytes, bytes]] | None = None) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": headers or [],
        }
    )


class _ProfileQuery:
    def __init__(self, data):
        self.data = data

    def select(self, *_args):
        return self

    def eq(self, *_args):
        return self

    def single(self):
        return self

    def execute(self):
        return SimpleNamespace(data=self.data)


class _ProfileClient:
    def __init__(self, data):
        self.data = data

    def table(self, _name):
        return _ProfileQuery(self.data)


def test_missing_bearer_token_returns_stable_401(monkeypatch) -> None:
    monkeypatch.setattr("app.core.security.settings.MOCK_MODE", False)
    with pytest.raises(ApiException) as raised:
        get_authenticated_session(_request(), credentials=None, supabase=None)
    assert raised.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert raised.value.code == "AUTH_REQUIRED"


def test_invalid_token_never_exposes_provider_exception(monkeypatch) -> None:
    class FailingAuth:
        def get_user(self, _token):
            raise RuntimeError("secret provider detail")

    client = SimpleNamespace(auth=FailingAuth())
    credentials = SimpleNamespace(credentials="invalid")
    monkeypatch.setattr("app.core.security.settings.MOCK_MODE", False)

    with pytest.raises(ApiException) as raised:
        get_authenticated_session(
            _request(),
            credentials=credentials,
            supabase=client,
        )
    assert raised.value.code == "AUTH_INVALID"
    assert "secret provider detail" not in raised.value.detail


def test_role_checker_denies_role_without_leaking_profile(monkeypatch) -> None:
    monkeypatch.setattr("app.api.dependencies.roles.settings.MOCK_MODE", False)
    checker = RoleChecker([UserRole.ADMIN])
    session = {
        "user": SimpleNamespace(id="user-1"),
        "supabase": _ProfileClient(
            {"role": UserRole.VIEWER.value, "tenant_id": "tenant-1"}
        ),
        "token": "token",
    }

    with pytest.raises(ApiException) as raised:
        checker(_request(), session=session)
    assert raised.value.status_code == status.HTTP_403_FORBIDDEN
    assert raised.value.code == "ROLE_FORBIDDEN"


def test_role_checker_preserves_typed_context_shape(monkeypatch) -> None:
    monkeypatch.setattr("app.api.dependencies.roles.settings.MOCK_MODE", False)
    user = SimpleNamespace(id="user-1")
    checker = RoleChecker([UserRole.CONTADOR])
    session = {
        "user": user,
        "supabase": _ProfileClient(
            {"role": UserRole.CONTADOR.value, "tenant_id": "tenant-1"}
        ),
        "token": "token",
    }

    context = checker(_request(), session=session)
    assert context == {
        "user": user,
        "tenant_id": "tenant-1",
        "role": UserRole.CONTADOR.value,
    }
