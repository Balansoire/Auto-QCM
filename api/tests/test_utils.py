import sys
import pathlib

import pytest

# Ajouter le dossier parent au path pour importer main
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.absolute()))

import main as main


def test_extract_json_object_in_markdown():
    """B-UTIL-001: _extract_json() extrait un objet JSON encapsulé dans du markdown."""

    text = """Voici une réponse en markdown :

```json
{
  \"name\": \"QCM Test\",
  \"items\": [
    {\"id\": \"1\", \"question\": \"Q1?\", \"choices\": [\"A\", \"B\", \"C\", \"D\"], \"answer_index\": 0}
  ]
}
```

Fin du message.
"""

    data = main._extract_json(text)
    assert isinstance(data, dict)
    assert data["name"] == "QCM Test"
    assert isinstance(data.get("items"), list)
    assert data["items"][0]["id"] == "1"


def test_extract_json_array():
    """B-UTIL-002: _extract_json() gère aussi un tableau JSON brut."""

    text = """Réponse:
[1, 2, 3]
Fin.
"""

    data = main._extract_json(text)
    assert isinstance(data, list)
    assert data == [1, 2, 3]


def test_generate_fallback_items_count():
    """B-UTIL-003: _generate_fallback() retourne exactement count questions."""

    skills = ["python"]
    count = 5
    resp = main._generate_fallback(skills, count, name="Test Fallback", difficulty="facile")

    assert resp.name == "Test Fallback"
    assert len(resp.items) == count


def test_generate_fallback_skills_cycle():
    """B-UTIL-004: _generate_fallback() alterne correctement les skills fournies."""

    skills = ["python", "javascript", "devops"]
    count = 7
    resp = main._generate_fallback(skills, count, name=None, difficulty="entretien")

    used_skills = [item.skill for item in resp.items]
    expected = [skills[i % len(skills)] for i in range(count)]

    assert used_skills == expected
