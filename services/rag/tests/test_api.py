from fastapi.testclient import TestClient

from app import pipeline
from app.main import app

client = TestClient(app)
AUTH = {"Authorization": "Bearer test-secret"}


def test_health_needs_no_auth():
    res = client.get("/health")
    assert res.status_code == 200 and res.json()["ok"] is True


def test_ingest_rejects_missing_or_wrong_secret():
    assert client.post("/ingest", json={"resourceId": "r1"}).status_code == 401
    assert client.post("/ingest", json={"resourceId": "r1"}, headers={"Authorization": "Bearer nope"}).status_code == 401


def test_ingest_refuses_everything_while_secret_is_unset(monkeypatch):
    from types import SimpleNamespace

    import app.main

    monkeypatch.setattr(app.main, "get_settings", lambda: SimpleNamespace(rag_service_secret=""))
    for headers in ({}, {"Authorization": "Bearer "}, {"Authorization": "Bearer anything"}):
        assert client.post("/ingest", json={"resourceId": "r1"}, headers=headers).status_code == 503


def test_ingest_runs_the_pipeline(monkeypatch):
    calls = []

    def fake_ingest(resource_id, force=False):
        calls.append((resource_id, force))
        return pipeline.IngestResult(resource_id, "READY", chunks=3, pages=2)

    monkeypatch.setattr(pipeline, "ingest", fake_ingest)
    res = client.post("/ingest", json={"resourceId": "r1", "force": True}, headers=AUTH)
    assert res.status_code == 200
    assert res.json()["status"] == "READY" and res.json()["chunks"] == 3
    assert calls == [("r1", True)]


def test_ingest_validates_the_body():
    assert client.post("/ingest", json={}, headers=AUTH).status_code == 422
