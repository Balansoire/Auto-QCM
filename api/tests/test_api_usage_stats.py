import os
import sys
import pathlib

import pytest
from fastapi.testclient import TestClient

# Ajouter le dossier parent au path pour importer main
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.absolute()))


@pytest.fixture(scope="module")
def client():
    # Mode DEV sans Supabase ni Gemini
    os.environ.setdefault("DEV_MODE", "true")
    os.environ.pop("SUPABASE_URL", None)
    os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
    os.environ.pop("GEMINI_API_KEY", None)

    from main import app
    import main as main

    # Forcer le mode DEV et désactiver Supabase côté module
    main.DEV_MODE = True
    main.SUPABASE_URL = None
    main.SUPABASE_SERVICE_ROLE_KEY = None
    main.SUPABASE_CLIENT = None
    main.create_client = None

    return TestClient(app)


def test_usage_stats_without_supabase(client: TestClient):
    """B-API-007: /usage_stats retourne un rôle 'dev' et total=0 quand Supabase est inactif."""

    resp = client.get("/usage_stats")
    assert resp.status_code == 200
    data = resp.json()

    assert data["role"] == "dev"
    assert data["total"] == 0
    assert data["limit"] is None
    assert data["per_model"] == []
