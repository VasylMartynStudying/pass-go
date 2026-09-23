# PassGo

Платформа для автоматизації реєстрації учасників заходів.

## Структура

- `backend/` — FastAPI, SQLAlchemy, Alembic, SQLite, ASGI/Uvicorn, Poetry.
- `frontend/` — React, Vite, TypeScript, Tailwind CSS, Shadcn UI.

## Backend

Потрібні Python 3.12+ та Poetry 2+.

```bash
cd backend
cp .env.example .env
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

API буде доступний за адресою `http://localhost:8000/api/`, а перевірка
стану — `http://localhost:8000/api/health/`.
Інтерактивна документація OpenAPI доступна на `http://localhost:8000/docs`.

Корисні команди:

```bash
poetry run ruff check .
poetry run ruff format --check .
poetry run pytest
```

## Frontend

Потрібні Node.js 20+ та pnpm 10+.

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

Застосунок буде доступний за адресою `http://localhost:5173`.

Перевірки:

```bash
pnpm lint
pnpm build
```
