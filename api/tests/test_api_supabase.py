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
    """Client FastAPI en mode DEV avec Supabase mocké par test."""

    os.environ.setdefault("DEV_MODE", "true")
    main.DEV_MODE = True

    return TestClient(main.app)


def test_save_qcm_supabase_success(monkeypatch, client: TestClient):
    """B-SUPA-001: avec Supabase actif, /save_qcm insère un enregistrement valide dans qcm_tests."""

    class DummyInsertResult:
        def __init__(self, table, payload):
            self._table = table
            self._payload = payload

        def execute(self):
            # Simule l'insertion en stockant le payload sur la table
            self._table.last_insert_payload = self._payload
            return type("Res", (), {"error": None})()

    class DummyTable:
        def __init__(self, name: str):
            self.name = name
            self.last_insert_payload = None

        def insert(self, payload):
            return DummyInsertResult(self, payload)

    class DummySupa:
        def __init__(self):
            self.last_table = None

        def table(self, name: str):
            tbl = DummyTable(name)
            self.last_table = tbl
            return tbl

    dummy_supa = DummySupa()
    monkeypatch.setattr(main, "_supabase_client", lambda: dummy_supa, raising=False)

    user_id = "user-supa-1"
    qcm = {
        "name": "QCM Supa",
        "items": [
            {
                "id": "1",
                "question": "Q1?",
                "choices": ["A", "B", "C", "D"],
                "answer_index": 0,
            }
        ],
    }
    payload = {"user_id": user_id, "qcm": qcm, "score": 10}

    resp = client.post("/save_qcm", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert "id" in body

    table = dummy_supa.last_table
    assert table is not None
    assert table.name == "qcm_tests"

    inserted = table.last_insert_payload
    assert inserted is not None
    assert inserted["user_id"] == user_id
    assert inserted["name"] == qcm["name"]
    assert inserted["score"] == 10
    assert isinstance(inserted["qcm"], dict)
    assert inserted["qcm"]["name"] == qcm["name"]
    assert len(inserted["qcm"]["items"]) == 1


def test_history_supabase_success(monkeypatch, client: TestClient):
    """B-SUPA-002: avec Supabase actif, /history/{user_id} mappe correctement les champs SQL vers HistoryItem."""

    user_id = "user-supa-2"

    class DummyHistoryTable:
        def __init__(self, rows):
            self._rows = rows

        def select(self, *args, **kwargs):  # type: ignore[override]
            return self

        def eq(self, column, value):  # type: ignore[override]
            # On pourrait filtrer sur user_id ici si besoin
            return self

        def order(self, column, desc=False):  # type: ignore[override]
            return self

        def execute(self):
            return type("Res", (), {"data": self._rows})()

    class DummySupa:
        def __init__(self, rows):
            self._rows = rows

        def table(self, name: str):
            assert name == "qcm_tests"
            return DummyHistoryTable(self._rows)

    rows = [
        {
            "id": "rec-1",
            "user_id": user_id,
            "name": "QCM SQL",
            "score": 7,
            "created_at": "2025-01-01T12:00:00",
        }
    ]

    dummy_supa = DummySupa(rows)
    monkeypatch.setattr(main, "_supabase_client", lambda: dummy_supa, raising=False)

    resp = client.get(f"/history/{user_id}")
    assert resp.status_code == 200
    data = resp.json()

    assert isinstance(data, list)
    assert len(data) == 1

    item = data[0]
    assert item["id"] == "rec-1"
    assert item["user_id"] == user_id
    assert item["name"] == "QCM SQL"
    assert item["score"] == 7
    assert item["created_at"].startswith("2025-01-01T12:00:00")
