import os
import pytest
from fastapi.testclient import TestClient
import sys
import pathlib

# Ajouter le dossier parent au path pour importer main
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.absolute()))


@pytest.fixture(scope="module")
def client():
    # Assurer le mode DEV et neutraliser la configuration Supabase/Gemini pour les tests
    os.environ.setdefault("DEV_MODE", "true")
    os.environ.pop("SUPABASE_URL", None)
    os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
    os.environ.pop("GEMINI_API_KEY", None)

    # Import retardé pour que les variables d'env ci‑dessus soient prises en compte
    from main import app
    import main as main

    # Forcer le mode DEV et désactiver Supabase + Gemini au niveau du module
    main.DEV_MODE = True
    main.SUPABASE_URL = None
    main.SUPABASE_SERVICE_ROLE_KEY = None
    main.SUPABASE_CLIENT = None
    main.create_client = None
    main.ChatGoogleGenerativeAI = None

    return TestClient(app)


def test_root_ok(client: TestClient) -> None:
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["name"] == "Auto QCM API"


def test_generate_qcm_fallback(client: TestClient) -> None:
    payload = {"skills": ["python"], "count": 3, "name": "Test QCM"}
    # En DEV, l'auth est simulée si DEV_MODE=true
    resp = client.post("/generate_qcm", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["name"] == "Test QCM"
    assert "items" in data and isinstance(data["items"], list)
    assert len(data["items"]) == 3

    first = data["items"][0]
    assert "question" in first
    assert isinstance(first.get("choices"), list) and len(first["choices"]) == 4
    assert 0 <= first["answer_index"] <= 3


def test_save_and_history_in_memory_store(client: TestClient) -> None:
    # D'abord générer un petit QCM
    gen_resp = client.post("/generate_qcm", json={"skills": ["python"], "count": 1, "name": "History test"})
    assert gen_resp.status_code == 200
    qcm = gen_resp.json()

    user_id = "test-user-123"
    save_payload = {"user_id": user_id, "qcm": qcm, "score": 1}

    save_resp = client.post("/save_qcm", json=save_payload)
    assert save_resp.status_code == 200
    saved = save_resp.json()
    assert "id" in saved

    # Récupérer l'historique pour cet utilisateur
    hist_resp = client.get(f"/history/{user_id}")
    assert hist_resp.status_code == 200
    history = hist_resp.json()

    assert isinstance(history, list)
    assert any(item["id"] == saved["id"] for item in history)


def test_get_and_delete_qcm_from_store(client: TestClient) -> None:
    # Créer et sauvegarder un QCM
    gen_resp = client.post("/generate_qcm", json={"skills": ["python"], "count": 1, "name": "Delete test"})
    assert gen_resp.status_code == 200
    qcm = gen_resp.json()

    user_id = "test-user-456"
    save_resp = client.post("/save_qcm", json={"user_id": user_id, "qcm": qcm, "score": 1})
    assert save_resp.status_code == 200
    saved = save_resp.json()
    qid = saved["id"]

    # GET /qcm/{id}
    get_resp = client.get(f"/qcm/{qid}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == qid
    assert data["user_id"] == user_id

    # DELETE /qcm/{id}
    del_resp = client.delete(f"/qcm/{qid}")
    assert del_resp.status_code == 200

    # Après suppression, le QCM ne doit plus exister
    get_resp2 = client.get(f"/qcm/{qid}")
    assert get_resp2.status_code == 404
