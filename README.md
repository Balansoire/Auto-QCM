# Auto QCM (Angular + FastAPI)

Application web pour s'entraîner aux entretiens avec des QCM générés par IA (Gemini via LangChain), avec authentification Supabase, frontend Angular 18 + Tailwind, backend FastAPI, déploiement Netlify + Render.

## Stack
- Frontend: Angular 18, TypeScript, Tailwind CSS, Supabase Auth
- Backend: FastAPI (Python), CORS, Pydantic, LangChain + Gemini (optionnel), Supabase (optionnel)
- DB: Supabase (PostgreSQL + Auth)
- Déploiement: Netlify (front) + Render (back)

## Arborescence
- `auto-qcm-web/` Frontend Angular
- `api/` Backend FastAPI
- `supabase/supabase.sql` Schéma SQL et RLS
- `render.yaml` Config Render (backend)

## Pré-requis
- Node 20+
- Python 3.11+ recommandé (Render utilise 3.11). Localement, un Python ancien peut exécuter le backend en mode fallback (sans Gemini/Supabase).
- Compte Supabase (pour l'auth et la persistance)
- Clé Gemini (Google Generative AI)

## Installation locale

### 1) Frontend
```
# à la racine
npm install --prefix auto-qcm-web
npm start --prefix auto-qcm-web
# App: http://localhost:4200
```
Variables côté front: `src/environments/environment.ts`
- `apiBaseUrl`: http://localhost:8000 (dev)
- `supabaseUrl` et `supabaseAnonKey`: à remplir après création Supabase

### 2) Backend
```
# créer l'environnement virtuel si besoin
python -m venv api\.venv
api\.venv\Scripts\python -m pip install --upgrade pip
api\.venv\Scripts\pip install -r api\requirements.txt  # sur Windows 32-bit/py <3.10, installez minimalement: fastapi uvicorn pydantic httpx python-dotenv

# variables d'environnement (copie)
copy api\.env.example api\.env
# éditez api/.env et complétez GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# lancer le serveur
api\.venv\Scripts\python -m uvicorn api.main:app --reload --port 8000
# API: http://localhost:8000, Docs: http://localhost:8000/docs
```
Notes:
- Si `GEMINI_API_KEY` n'est pas renseignée, `/generate_qcm` utilise un fallback local (QCM factice)
- Si Supabase n'est pas configuré, `/save_qcm` et `/history` utilisent un store en mémoire
- `DEV_MODE=true` dans `.env` permet de tester sans JWT (local)

### 3) Supabase
1. Créez un projet Supabase, récupérez `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`
2. Dans SQL Editor, exécutez `supabase/supabase.sql` (table `qcm_tests`, RLS)
3. Mettez à jour:
   - Front: `auto-qcm-web/src/environments/environment.ts` (supabaseUrl, supabaseAnonKey)
   - Back: `api/.env` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

### 4) Authentification côté front
- Inscription/Connexion via Supabase (email + mot de passe)
- Les routes `/test`, `/qcm`, `/history` sont protégées (guard)

## Déploiement

### Netlify (frontend)
- Site base: `auto-qcm-web/`
- Build command: `npm run build`
- Publish directory: `auto-qcm-web/dist/auto-qcm-web`
- Domaine: `https://auto-qcm.netlify.app`
- Variables (facultatif): `NG_BUILD_*` selon besoins; ne placez aucune clé sensible autre que Supabase ANON

### Render (backend)
- Déployez depuis ce repo à la racine; Render détectera `render.yaml`
- Variables:
  - `ALLOWED_ORIGINS=https://auto-qcm.netlify.app`
  - `GEMINI_MODEL=gemini-2.5-flash`
  - `GEMINI_API_KEY=<votre_cle>`
  - `SUPABASE_URL=<url>`
  - `SUPABASE_SERVICE_ROLE_KEY=<service_role>`

## API
- POST `/generate_qcm` -> { skills: string[], count: 1..50, name?: string }
- POST `/save_qcm` -> { user_id: string, qcm: { name?: string, items: [...] }, score?: number }
- GET `/history/{user_id}` -> historique
- GET `/qcm/{id}` -> QCM sauvegardé
- DELETE `/qcm/{id}` -> suppression

Headers: `Authorization: Bearer <JWT Supabase>` (en dev, optionnel si DEV_MODE=true)

## Export JSON
- Nom fichier: `qcm-<nom-qcm>-<date>.json`

## Divers
- CORS: `http://localhost:4200` et `https://auto-qcm.netlify.app` autorisés par défaut (configurable via `ALLOWED_ORIGINS`)
- Docs Swagger: `/docs`

## Tests

### Tests frontend (Angular)
- Lancer tous les tests unitaires / d'intégration :
  - `cd auto-qcm-web`
  - `npm test` (mode interactif)
  - ou `npm test -- --watch=false --browsers=ChromeHeadless` (comme en CI)

### Tests backend (FastAPI)
- Dans `api/` avec l'environnement virtuel activé :
  - `pytest`

### Intégration continue (GitHub Actions)
- Un workflow `.github/workflows/tests.yml` exécute automatiquement :
  - les tests frontend (`npm test -- --watch=false --browsers=ChromeHeadless`) dans `auto-qcm-web/`
  - les tests backend (`pytest`) dans `api/`
- Le workflow se lance à chaque `push` et `pull_request` sur ce dépôt GitHub.
