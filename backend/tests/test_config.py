import os
from pathlib import Path

from core.config import load_env_files


def test_load_env_files_does_not_override_existing_vars(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "already-set")
    env_file = tmp_path / ".env"
    env_file.write_text("JWT_SECRET=from-file\n", encoding="utf-8")
    load_env_files(backend_env=env_file, root_env=tmp_path / "missing.env")
    assert os.environ["JWT_SECRET"] == "already-set"


def test_load_env_files_fills_missing_vars(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("BNU_DOTENV_PROBE", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text("BNU_DOTENV_PROBE=from-backend-env\n", encoding="utf-8")
    load_env_files(backend_env=env_file, root_env=tmp_path / "missing.env")
    assert os.environ["BNU_DOTENV_PROBE"] == "from-backend-env"


def test_backend_env_wins_over_root_env(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("BNU_DOTENV_PROBE", raising=False)
    backend = tmp_path / "backend.env"
    root = tmp_path / "root.env"
    backend.write_text("BNU_DOTENV_PROBE=backend\n", encoding="utf-8")
    root.write_text("BNU_DOTENV_PROBE=root\n", encoding="utf-8")
    load_env_files(backend_env=backend, root_env=root)
    assert os.environ["BNU_DOTENV_PROBE"] == "backend"


def test_root_env_fills_keys_missing_from_backend(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("BNU_DOTENV_PROBE", raising=False)
    backend = tmp_path / "backend.env"
    root = tmp_path / "root.env"
    backend.write_text("OTHER=1\n", encoding="utf-8")
    root.write_text("BNU_DOTENV_PROBE=root\n", encoding="utf-8")
    load_env_files(backend_env=backend, root_env=root)
    assert os.environ["BNU_DOTENV_PROBE"] == "root"


def test_dollar_in_value_is_not_interpolated(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("BNU_DOTENV_PROBE", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text("BNU_DOTENV_PROBE=pa$$word\n", encoding="utf-8")
    load_env_files(backend_env=env_file, root_env=tmp_path / "missing.env")
    assert os.environ["BNU_DOTENV_PROBE"] == "pa$$word"
