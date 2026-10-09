from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.mongodb import init_db_indexes, close_db_connection
from app.auth.routes import router as auth_router
from app.problems.routes import router as problems_router
from app.revisions.routes import router as revisions_router
from app.planner.routes import router as planner_router
from app.todos.routes import router as todos_router
from app.potd.routes import router as potd_router
from app.contests.routes import router as contests_router
from app.exams.routes import router as exams_router
from app.sync.routes import router as sync_router
from app.whiteboard.routes import router as whiteboard_router
from app.notes.routes import router as notes_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager:
    Runs startup initialization (database indexes) and graceful shutdown.
    """
    # Startup
    init_db_indexes()
    yield
    # Shutdown
    close_db_connection()


app = FastAPI(
    title="DSA Revision Tracker API",
    description="Clean, multi-user DSA revision tracker with spaced repetition and Striver A2Z curriculum.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware to allow React frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Suitable for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth_router, prefix="/api")
app.include_router(problems_router, prefix="/api")
app.include_router(revisions_router, prefix="/api")
app.include_router(planner_router, prefix="/api")
app.include_router(todos_router, prefix="/api")
app.include_router(potd_router, prefix="/api")
app.include_router(contests_router, prefix="/api")
app.include_router(exams_router, prefix="/api")
app.include_router(sync_router, prefix="/api")
app.include_router(whiteboard_router, prefix="/api")
app.include_router(notes_router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "app": "DSA Revision Tracker API"}
