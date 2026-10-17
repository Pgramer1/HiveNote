"""Re-index from the command line:

    uv run python -m app.cli reindex --id <resourceId>
    uv run python -m app.cli reindex --pending         # whatever is queued
    uv run python -m app.cli reindex --failed          # retry failures
    uv run python -m app.cli reindex --all             # every PDF/PPT (after a parser change)
"""

import argparse
import logging
import sys

from app import db, pipeline


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    reindex = sub.add_parser("reindex")
    which = reindex.add_mutually_exclusive_group(required=True)
    which.add_argument("--id")
    which.add_argument("--pending", action="store_true")
    which.add_argument("--failed", action="store_true")
    which.add_argument("--all", action="store_true")
    reindex.add_argument("--limit", type=int, default=1000)
    args = parser.parse_args()

    logging.basicConfig(level=logging.WARNING)
    if args.id:
        results = [pipeline.ingest(args.id, force=True)]
    else:
        if args.all or args.failed:
            with db.connect() as conn:
                print(f"Queued {db.mark_pending(conn, only_failed=args.failed)} resources")
        results = pipeline.ingest_pending(args.limit)

    for r in results:
        detail = r.error or f"{r.chunks} chunks, {r.pages} pages ({r.empty_pages} without text)"
        print(f"{r.status:8} {r.resource_id}  {r.seconds:6.1f}s  {detail}")
    ok = sum(r.status == "READY" for r in results)
    print(f"\n{ok}/{len(results)} indexed")
    # Non-zero exit marks the GitHub Actions run as failed, so a broken indexer gets noticed.
    if any(r.status == "FAILED" for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
