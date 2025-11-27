import sys
import pathlib
import asyncio

import pytest
from fastapi import HTTPException

# Ajouter le dossier parent au path pour importer main
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.absolute()))

import main as main


def _run(coro):
    """Helper pour exécuter les fonctions async sans plugin pytest-asyncio."""
    return asyncio.run(coro)


def test_verify_and_get_user_id_with_valid_bearer_token(monkeypatch):
    """B-AUTH-001: _verify_and_get_user_id() extrait le user_id d'un JWT Bearer valide."""

    # Forcer un mode non-DEV pour vérifier le comportement générique
    monkeypatch.setattr(main, "DEV_MODE", False, raising=False)

    expected_user_id = "user-123"

    class DummyJWT:
        @staticmethod
        def decode(token, options=None):  # type: ignore[override]
            assert token == "valid.token"
            return {"sub": expected_user_id}

    # S'assurer que jwt est disponible et utilise notre implémentation factice
    monkeypatch.setattr(main, "jwt", DummyJWT, raising=False)

    user_id = _run(main._verify_and_get_user_id("Bearer valid.token"))
    assert user_id == expected_user_id


def test_invalid_token_dev_mode_returns_dev_user_id(monkeypatch):
    """B-AUTH-002: en DEV_MODE, un token invalide renvoie DEV_USER_ID."""

    monkeypatch.setattr(main, "DEV_MODE", True, raising=False)

    class DummyJWTInvalid:
        @staticmethod
        def decode(token, options=None):  # type: ignore[override]
            raise ValueError("invalid token")

    monkeypatch.setattr(main, "jwt", DummyJWTInvalid, raising=False)

    user_id = _run(main._verify_and_get_user_id("Bearer invalid.token"))
    assert user_id == main.DEV_USER_ID


def test_no_token_dev_mode_returns_dev_user_id(monkeypatch):
    """B-AUTH-003: en DEV_MODE sans Authorization, renvoie DEV_USER_ID."""

    monkeypatch.setattr(main, "DEV_MODE", True, raising=False)

    user_id = _run(main._verify_and_get_user_id(None))
    assert user_id == main.DEV_USER_ID


def test_no_token_prod_raises_http_401(monkeypatch):
    """B-AUTH-004: sans token et hors DEV_MODE, déclenche une HTTPException 401."""

    monkeypatch.setattr(main, "DEV_MODE", False, raising=False)

    with pytest.raises(HTTPException) as exc:
        _run(main._verify_and_get_user_id(None))

    assert exc.value.status_code == 401
    assert exc.value.detail == "Authorization required"
