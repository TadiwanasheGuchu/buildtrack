# BuildTrack — FastAPI Backend

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in your values
```

## Database

Create a PostgreSQL database named `buildtrack`, then run:

```bash
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload
```

API docs available at http://localhost:8000/docs

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create company + owner account |
| POST | /auth/login | Returns JWT + user |
| GET | /auth/me | Current user (requires Bearer token) |
| POST | /auth/forgot-password | Sends reset email |
