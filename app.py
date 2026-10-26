"""Standalone FastAPI server for the assistant prompt timeline."""

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from data_loader import SourceError, load_fields, source_records, source_summary


BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="助手提示时间轴", docs_url=None, redoc_url=None, openapi_url=None)


@app.exception_handler(SourceError)
async def source_error_handler(request, exc):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.get("/")
@app.get("/assistant")
def home():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/static/{filename}")
def static_asset(filename: str):
    # Never serve workbooks, Python files or source data through a directory mount.
    if filename not in {"app.js", "styles.css", "audience.js"}:
        raise HTTPException(status_code=404, detail="资源不存在")
    path = BASE_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="资源不存在")
    return FileResponse(path)


@app.get("/api/fields")
def fields():
    return {"fields": load_fields()}


@app.get("/api/summary")
def summary(source: Literal["demo", "real", "real_high"] = "demo"):
    return source_summary(source)


@app.get("/api/records/{author_id}")
def records(author_id: str, source: Literal["demo", "real", "real_high"] = "demo", live_stream_id: str | None = None):
    return source_records(author_id, live_stream_id, source)
