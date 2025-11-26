import os
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from pathlib import Path

# Optional imports (may not be available locally until Python >=3.10 and deps are installed)
try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover
    genai = None  # type: ignore
    print("google.generativeai not installed. Install deps or set GEMINI_API_KEY.")

try:
    from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore
    from langchain.prompts import PromptTemplate  # type: ignore
    from langchain_core.callbacks.base import BaseCallbackHandler  # type: ignore
except Exception:  # pragma: no cover
    ChatGoogleGenerativeAI = None  # type: ignore
    PromptTemplate = None  # type: ignore
    BaseCallbackHandler = None  # type: ignore
    print("langchain_google_genai not installed. Install deps or set GEMINI_API_KEY.")

try:
    from supabase import create_client, Client  # type: ignore
except Exception:  # pragma: no cover
    create_client = None  # type: ignore
    Client = None  # type: ignore
    print("supabase not installed. Install deps or set GEMINI_API_KEY.")

try:
    import jwt  # PyJWT
except Exception:  # pragma: no cover
    jwt = None  # type: ignore
    print("jwt not installed. Install deps or set GEMINI_API_KEY.")

load_dotenv(dotenv_path=str(Path(__file__).parent / ".env"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:4200,https://auto-qcm.netlify.app").split(",") if o.strip()]
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_CLIENT: Optional["Client"] = None
DEV_MODE = os.getenv("DEV_MODE", "false").lower() in ("1", "true", "yes")
# UUID spécial utilisé uniquement en mode développement pour les opérations sans auth
DEV_USER_ID = os.getenv("DEV_USER_ID", "00000000-0000-0000-0000-000000000001")
# In-memory fallback store for dev/testing when Supabase is not configured
STORE: Dict[str, Dict[str, Any]] = {}
ROLE_LIMITS = {
    "user": 10,
    "user_plus": 100,
    "forbidden": 0,
    "admin": None,
    "dev": None,
}
DEFAULT_ROLE = "user"

app = FastAPI(title="Auto QCM API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------
class GenerateRequest(BaseModel):
    skills: List[str] = Field(default_factory=list)
    count: int = Field(10, ge=1, le=50)
    name: Optional[str] = None
    difficulty: str = "entretien"


class QcmItem(BaseModel):
    id: str
    question: str
    choices: List[str]
    answer_index: int = Field(ge=0, le=3)
    skill: Optional[str] = None
    explanation: Optional[str] = None


class GenerateResponse(BaseModel):
    name: Optional[str] = None
    items: List[QcmItem]


class SaveRequest(BaseModel):
    user_id: str
    qcm: GenerateResponse
    score: Optional[int] = None


class HistoryItem(BaseModel):
    id: str
    user_id: str
    name: Optional[str] = None
    score: Optional[int] = None
    created_at: datetime


# ---------- Utilities ----------
class RetryLoggingHandler(BaseCallbackHandler):  # type: ignore
    """Callback LangChain pour loguer chaque retry LLM."""

    def on_retry(self, retry_state, **kwargs):  # type: ignore[override]
        exc = None
        if getattr(retry_state, "outcome", None) is not None:
            try:
                exc = retry_state.outcome.exception()
            except Exception:  # pragma: no cover
                exc = retry_state.outcome
        attempt = getattr(retry_state, "attempt_number", None)
        print("[AutoQCM][DEBUG] LLM retry attempt", attempt, "exception:", repr(exc))

def _supabase_client() -> Optional["Client"]:
    global SUPABASE_CLIENT
    if SUPABASE_CLIENT is not None:
        return SUPABASE_CLIENT

    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and create_client):
        if DEV_MODE:
            print("[AutoQCM][DEBUG] Supabase client not created: missing config or package.")
            print("  SUPABASE_URL set:", bool(SUPABASE_URL))
            print("  SUPABASE_SERVICE_ROLE_KEY set:", bool(SUPABASE_SERVICE_ROLE_KEY))
            print("  supabase.create_client available:", bool(create_client))
        return None
    try:
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        SUPABASE_CLIENT = client
        if DEV_MODE:
            print("[AutoQCM][DEBUG] Supabase client created successfully.")
        return SUPABASE_CLIENT
    except Exception as e:
        if DEV_MODE:
            print("[AutoQCM][DEBUG] Failed to create Supabase client:", repr(e))
        return None


def _get_user_role(supa: "Client", user_id: str) -> str:
    res = supa.table("user_roles").select("role").eq("user_id", user_id).limit(1).execute()
    rows = getattr(res, "data", None) or []
    if rows:
        role = rows[0].get("role") or DEFAULT_ROLE
        return str(role)
    return DEFAULT_ROLE


def _get_usage(supa: "Client", user_id: str):
    res = supa.table("qcm_usage").select("model,generated_count").eq("user_id", user_id).execute()
    rows = getattr(res, "data", None) or []
    per_model = []
    total = 0
    for it in rows:
        model = it.get("model")
        count = it.get("generated_count") or 0
        if model is None:
            continue
        count_int = int(count)
        per_model.append({"model": model, "count": count_int})
        total += count_int
    return per_model, total


def _ensure_gemini():
    if not genai:
        raise RuntimeError("google-generativeai not installed. Install deps or set GEMINI_API_KEY.")
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY not set.")
    genai.configure(api_key=key)


def _generate_via_langchain(skills: List[str], count: int, name: Optional[str], difficulty: str) -> GenerateResponse:
    if not ChatGoogleGenerativeAI:
        raise RuntimeError("LangChain Google GenAI provider not available")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    # En DEV, on ajoute un callback pour logger les retries ; sinon, aucun callback explicite
    callbacks = [RetryLoggingHandler()] if BaseCallbackHandler and DEV_MODE else None  # type: ignore
    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=api_key,
        temperature=0.7,
        callbacks=callbacks,
    )
    msg = (
        "Tu génères un QCM JSON en français. Réponds UNIQUEMENT en JSON.\n"
        "Structure attendue: {\"name\": string?, \"items\": [ { \"id\": string, \"question\": string, \"choices\": [string,string,string,string], \"answer_index\": 0..3, \"skill\": string?, \"explanation\": string? } ] }\n"
        f"Compétences: {skills}. Nombre de questions: {count}. Niveau de difficulté / style: {difficulty}. "
        "Règles: une seule bonne réponse, langue FR."
    )
    result = llm.invoke(msg)
    if isinstance(result, str):
        text = result
    else:
        content = getattr(result, "content", None)
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            parts = []
            for part in content:
                if isinstance(part, dict):
                    t = part.get("text")
                    if t:
                        parts.append(t)
                else:
                    t = getattr(part, "text", None)
                    if t:
                        parts.append(t)
            text = "\n".join(parts)
        else:
            text = getattr(result, "text", "") or str(result)
    if DEV_MODE:
        print("[AutoQCM][DEBUG] LangChain Gemini raw text:", str(text)[:400])
    data = _extract_json(text)
    name_out = data.get("name") if isinstance(data, dict) else None
    items_raw = data.get("items") if isinstance(data, dict) else data
    items: List[QcmItem] = []
    for it in items_raw[:count]:
        items.append(QcmItem(
            id=it.get("id") or str(uuid.uuid4()),
            question=it["question"],
            choices=it["choices"][:4],
            answer_index=int(it.get("answer_index", 0)),
            skill=it.get("skill"),
            explanation=it.get("explanation")
        ))
    return GenerateResponse(name=name_out or name, items=items)


def _extract_json(text: str) -> dict:
    # Try to extract a JSON object even if wrapped in markdown
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start:end + 1])
    # Fallback to parse as array
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start:end + 1])
    # Last resort
    return json.loads(text)


def _generate_fallback(skills: List[str], count: int, name: Optional[str], difficulty: str) -> GenerateResponse:
    items: List[QcmItem] = []
    for i in range(count):
        skill = (skills[i % len(skills)] if skills else None)
        items.append(QcmItem(
            id=str(uuid.uuid4()),
            question=f"[Fallback {difficulty}] Question {i+1} sur {skill or 'Compétence'} ?",
            choices=["Choix A", "Choix B", "Choix C", "Choix D"],
            answer_index=0,
            skill=skill,
            explanation="Réponse par défaut (fallback)."
        ))
    return GenerateResponse(name=name, items=items)


async def _verify_and_get_user_id(authorization: Optional[str] = Header(default=None)) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        # Best-effort decode without verification in dev. In production, verify with JWKS.
        if jwt:
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                sub = payload.get("sub") or payload.get("user_id")
                if sub:
                    return str(sub)
            except Exception:
                pass
        # If unable to decode, but token exists, accept in DEV mode
        if DEV_MODE:
            return DEV_USER_ID
        raise HTTPException(status_code=401, detail="Invalid token")
    if DEV_MODE:
        return DEV_USER_ID
    raise HTTPException(status_code=401, detail="Authorization required")


# ---------- Endpoints ----------
@app.post("/generate_qcm", response_model=GenerateResponse)
async def generate_qcm(req: GenerateRequest, user_id: str = Depends(_verify_and_get_user_id)):
    skills = req.skills or []
    count = max(1, min(50, req.count or 10))
    difficulty = (req.difficulty or "entretien").strip() or "entretien"
    supa = _supabase_client()
    role = DEFAULT_ROLE
    limit = ROLE_LIMITS.get(role)
    total_before = 0
    if supa:
        try:
            role = _get_user_role(supa, user_id)
            if role not in ROLE_LIMITS:
                raise HTTPException(status_code=403, detail="Rôle utilisateur inconnu, génération de QCM interdite.")
            limit = ROLE_LIMITS.get(role)
            _, total_before = _get_usage(supa, user_id)
        except Exception as e:
            if DEV_MODE:
                print("[AutoQCM][DEBUG] Failed to compute quota:", repr(e))
            raise HTTPException(status_code=500, detail="Configuration des quotas QCM invalide. Contactez l'administrateur.")
    if supa and limit is not None and total_before >= int(limit):
        raise HTTPException(status_code=403, detail="Limite de génération de QCM atteinte pour votre rôle.")

    model_name = GEMINI_MODEL
    try:
        if not ChatGoogleGenerativeAI:
            raise RuntimeError("LangChain Google GenAI provider not available")
        response = _generate_via_langchain(skills, count, req.name, difficulty)
        model_name = GEMINI_MODEL
    except Exception as e:
        if DEV_MODE:
            print("[AutoQCM][DEBUG] Gemini generation failed, using fallback:", repr(e))
        response = _generate_fallback(skills, count, req.name, difficulty)
        model_name = "fallback"

    if supa:
        try:
            res = supa.table("qcm_usage").select("generated_count").eq("user_id", user_id).eq("model", model_name).limit(1).execute()
            rows = getattr(res, "data", None) or []
            if rows:
                current = (rows[0].get("generated_count") or 0) + 1
                supa.table("qcm_usage").update({"generated_count": int(current)}).eq("user_id", user_id).eq("model", model_name).execute()
            else:
                supa.table("qcm_usage").insert({"user_id": user_id, "model": model_name, "generated_count": 1}).execute()
        except Exception as e:
            if DEV_MODE:
                print("[AutoQCM][DEBUG] Failed to update usage:", repr(e))

    return response


@app.post("/save_qcm")
async def save_qcm(req: SaveRequest, user_id: str = Depends(_verify_and_get_user_id)):
    if user_id != req.user_id and not DEV_MODE:
        raise HTTPException(status_code=403, detail="Forbidden")

    supa = _supabase_client()
    record_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    if supa:
        try:
            payload = {
                "id": record_id,
                "user_id": req.user_id,
                "name": req.qcm.name,
                "qcm": json.loads(req.qcm.model_dump_json()),
                "score": req.score,
                "created_at": now,
            }
            if DEV_MODE:
                print("[AutoQCM][DEBUG] Saving QCM to Supabase with payload id=", record_id)
            res = supa.table("qcm_tests").insert(payload).execute()
            if getattr(res, "error", None):  # type: ignore
                if DEV_MODE:
                    print("[AutoQCM][DEBUG] Supabase insert error:", res.error)  # type: ignore
                raise HTTPException(status_code=500, detail=str(res.error))  # type: ignore
            return {"id": record_id}
        except Exception as e:
            if DEV_MODE:
                print("[AutoQCM][DEBUG] Exception while saving to Supabase:", repr(e))
            raise HTTPException(status_code=500, detail=str(e))
    # Fallback in-memory
    if DEV_MODE:
        print("[AutoQCM][DEBUG] Saving QCM to in-memory STORE (Supabase client unavailable)")
    STORE[record_id] = {
        "id": record_id,
        "user_id": req.user_id,
        "name": req.qcm.name,
        "qcm": json.loads(req.qcm.model_dump_json()),
        "score": req.score,
        "created_at": now,
    }
    return {"id": record_id}


@app.get("/history/{user_id}", response_model=List[HistoryItem])
async def history(user_id: str, _current: str = Depends(_verify_and_get_user_id)):
    supa = _supabase_client()
    if supa:
        try:
            res = supa.table("qcm_tests").select("id,user_id,name,score,created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
            data = res.data or []  # type: ignore
            return [
                HistoryItem(
                    id=it["id"], user_id=it["user_id"], name=it.get("name"), score=it.get("score"), created_at=datetime.fromisoformat(it["created_at"].replace("Z", "+00:00"))
                ) for it in data
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    # Fallback in-memory
    items = [it for it in STORE.values() if it.get("user_id") == user_id]
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return [
        HistoryItem(
            id=it["id"], user_id=it["user_id"], name=it.get("name"), score=it.get("score"), created_at=datetime.fromisoformat(it["created_at"])  # type: ignore
        ) for it in items
    ]


@app.get("/usage_stats")
async def usage_stats(current_user_id: str = Depends(_verify_and_get_user_id)):
    supa = _supabase_client()
    if not supa:
        return {"role": "dev", "limit": None, "total": 0, "per_model": []}
    try:
        role = _get_user_role(supa, current_user_id)
        limit = ROLE_LIMITS.get(role, ROLE_LIMITS.get(DEFAULT_ROLE))
        per_model, total = _get_usage(supa, current_user_id)
        return {"role": role, "limit": limit, "total": total, "per_model": per_model}
    except Exception as e:
        if DEV_MODE:
            print("[AutoQCM][DEBUG] Failed to retrieve usage stats:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/qcm/{qid}")
async def get_qcm(qid: str, _current: str = Depends(_verify_and_get_user_id)):
    supa = _supabase_client()
    if supa:
        try:
            res = supa.table("qcm_tests").select("*").eq("id", qid).limit(1).execute()
            rows = res.data or []  # type: ignore
            if not rows:
                raise HTTPException(status_code=404, detail="Not found")
            row = rows[0]
            return {
                "id": row["id"],
                "user_id": row["user_id"],
                "name": row.get("name"),
                "qcm": row.get("qcm"),
                "score": row.get("score"),
                "created_at": row.get("created_at"),
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    # Fallback
    if qid not in STORE:
        raise HTTPException(status_code=404, detail="Not found")
    return STORE[qid]


@app.delete("/qcm/{qid}")
async def delete_qcm(qid: str, _current: str = Depends(_verify_and_get_user_id)):
    supa = _supabase_client()
    if supa:
        try:
            supa.table("qcm_tests").delete().eq("id", qid).execute()
            return {"status": "ok"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    # Fallback
    STORE.pop(qid, None)
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"status": "ok", "name": "Auto QCM API", "version": "0.1.0"}
