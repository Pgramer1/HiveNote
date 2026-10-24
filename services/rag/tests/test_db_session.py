"""db.Session re-opens a connection the server dropped (no database needed)."""

import psycopg

from app import db


class FakeConnection:
    def __init__(self, alive: bool = True):
        self.alive, self.closed, self.queries = alive, False, []

    def rollback(self):
        pass

    def commit(self):
        pass

    def execute(self, query):
        if not self.alive:
            raise psycopg.OperationalError("terminating connection due to administrator command")
        self.queries.append(query)

    def close(self):
        self.closed = True


def test_reuses_a_live_connection(monkeypatch):
    made = []
    monkeypatch.setattr(db, "connect", lambda: made.append(FakeConnection()) or made[-1])
    session = db.Session()

    first, second = session.conn(), session.conn()

    assert first is second and len(made) == 1
    assert first.queries == ["SELECT 1"]  # only the second call needed a ping


def test_reconnects_when_the_server_dropped_the_connection(monkeypatch):
    made = []
    monkeypatch.setattr(db, "connect", lambda: made.append(FakeConnection()) or made[-1])
    session = db.Session()
    dropped = session.conn()
    dropped.alive = False

    fresh = session.conn()

    assert fresh is not dropped and len(made) == 2
    assert dropped.closed


def test_close_closes_the_connection_and_allows_reuse(monkeypatch):
    made = []
    monkeypatch.setattr(db, "connect", lambda: made.append(FakeConnection()) or made[-1])
    with db.Session() as session:
        conn = session.conn()
    assert conn.closed
    assert session.conn() is not conn
