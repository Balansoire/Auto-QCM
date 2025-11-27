import os
import sys
import pathlib

import pytest
from fastapi.testclient import TestClient

# Ajouter le dossier parent au path pour importer main
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.absolute()))

import main as main


@pytest.fixture(scope="module")
def client():
    """Client FastAPI avec environnement DEV, sur lequel on mocke Supabase au cas par cas."""

    os.environ.setdefault("DEV_MODE", "true")

    # Forcer DEV_MODE côté module pour éviter les effets de bord
    main.DEV_MODE = True

    return TestClient(main.app)


def test_generate_qcm_quota_forbidden_role(monkeypatch, client: TestClient):
    """B-QUOTA-001: si le rôle a une limite atteinte, /generate_qcm renvoie 403."""

    class DummySupa:
        pass

    dummy_supa = DummySupa()

    # Supabase est considéré comme actif
    monkeypatch.setattr(main, "_supabase_client", lambda: dummy_supa, raising=False)

    # Rôle 'forbidden' avec limite 0
    def fake_get_user_role(supa, user_id):  # type: ignore[unused-argument]
        return "forbidden"

    # Usage total déjà à la limite (0)
    def fake_get_usage(supa, user_id):  # type: ignore[unused-argument]
        return [], 0

    monkeypatch.setattr(main, "_get_user_role", fake_get_user_role, raising=False)
    monkeypatch.setattr(main, "_get_usage", fake_get_usage, raising=False)

    payload = {"skills": ["python"], "count": 1, "name": "Quota forbidden"}
    resp = client.post("/generate_qcm", json=payload)

    assert resp.status_code == 403
    data = resp.json()
    assert data["detail"] == "Limite de génération de QCM atteinte pour votre rôle."


def test_generate_qcm_unknown_role_forbidden(monkeypatch, client: TestClient):
    """B-QUOTA-002: si le rôle n'est pas connu, renvoie 403 avec message explicite."""

    class DummySupa:
        pass

    dummy_supa = DummySupa()

    monkeypatch.setattr(main, "_supabase_client", lambda: dummy_supa, raising=False)

    # Rôle inconnu non présent dans ROLE_LIMITS
    def fake_get_user_role(supa, user_id):  # type: ignore[unused-argument]
        return "unknown_role"

    monkeypatch.setattr(main, "_get_user_role", fake_get_user_role, raising=False)

    payload = {"skills": ["python"], "count": 1, "name": "Quota unknown"}
    resp = client.post("/generate_qcm", json=payload)

    assert resp.status_code == 403
    data = resp.json()
    assert data["detail"] == "Rôle utilisateur inconnu, génération de QCM interdite."
