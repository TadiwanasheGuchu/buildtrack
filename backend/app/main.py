from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401 — registers all models with Base
from app.routers import auth, projects, team, feed, resources, budget, punch, documents, site_logs, notifications, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="BuildTrack API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(team.router)
app.include_router(feed.router)
app.include_router(resources.router)
app.include_router(budget.router)
app.include_router(punch.router)
app.include_router(documents.router)
app.include_router(site_logs.router)
app.include_router(notifications.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}
