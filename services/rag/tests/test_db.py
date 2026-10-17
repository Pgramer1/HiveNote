import certifi

from app.db import connection_params


def test_verify_full_uses_certifi_bundle():
    params = connection_params("postgresql://u:p@ep-x.neon.tech/neondb?sslmode=verify-full")
    assert params["sslmode"] == "verify-full"
    assert params["sslrootcert"] == certifi.where()


def test_explicit_root_cert_is_kept():
    params = connection_params("postgresql://u:p@h/db?sslmode=verify-ca&sslrootcert=/certs/ca.pem")
    assert params["sslrootcert"] == "/certs/ca.pem"


def test_require_and_local_urls_are_unchanged():
    assert "sslrootcert" not in connection_params("postgresql://u:p@h/db?sslmode=require")
    assert connection_params("postgresql://postgres:test@localhost:55432/hivenote") == {
        "user": "postgres", "password": "test", "host": "localhost", "port": "55432", "dbname": "hivenote",
    }
