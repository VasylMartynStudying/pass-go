# PassGo

Платформа реєстрації учасників заходів: публічний каталог, електронний QR-квиток,
кабінет організатора та окрема адмінка модерації.

## Ролі

- **Учасник** — без облікового запису переглядає каталог, реєструється і отримує квиток.
- **Організатор** — входить у кабінет, керує своїми заходами, експортує CSV і робить check-in.
- **Адмін** — окремий акаунт у SQLAdmin; схвалює або відхиляє публікацію через редагування заходу.

Публічний каталог показує лише заходи зі статусом `published`, модерацією `approved`
і датою початку в майбутньому.

## Структура

- `backend/` — FastAPI, SQLAlchemy, Alembic, SQLite, Uvicorn, Poetry.
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

- API: `http://localhost:8000/api/`
- Health: `http://localhost:8000/api/health/`
- OpenAPI: `http://localhost:8000/docs`
- SQLAdmin: `http://localhost:8000/admin`

Тестові дані (організатор, адмін, заходи, кілька реєстрацій):

```bash
poetry run python scripts/seed.py
```

- Організатор: `organizer@example.com` / `secret123`
- Адмін: `admin@example.com` / `secret123`

Адмін не входить у кабінет організатора, організатор не входить у `/admin`.
Організаторів і адмінів створюють у SQLAdmin або через seed.

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

Застосунок: `http://localhost:5173`.
Vite проксує `/api` і `/admin` на backend.

Перевірки:

```bash
pnpm lint
pnpm build
```
