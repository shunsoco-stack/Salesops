from __future__ import annotations

from pathlib import Path

from sqlmodel import SQLModel, create_engine


def get_db_path() -> Path:
    data_dir = Path(__file__).resolve().parents[1] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "salon.db"


def get_engine():
    db_path = get_db_path()
    return create_engine(f"sqlite:///{db_path}", echo=False)


def init_db(engine) -> None:
    SQLModel.metadata.create_all(engine)

