#!/usr/bin/env python3
"""
Search the EU Funding & Tenders Portal SEDIA API for grant topics matching
a free-text query. Prints a compact JSON array to stdout.

Usage:
    python3 scripts/search_grants.py "<free-text query>"
    python3 scripts/search_grants.py "digital twins energy"
    python3 scripts/search_grants.py --page-size 10 "smart grid"
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request

API_BASE = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
API_KEY = "SEDIA"


def search(query: str, page_size: int) -> dict:
    encoded = urllib.parse.quote(query)
    url = f"{API_BASE}?apiKey={API_KEY}&text={encoded}&pageSize={page_size}"

    body = {
        "bool": {
            "must": [
                {"terms": {"type": ["1", "2", "8"]}},
                {"terms": {"status": ["31094501", "31094502"]}},
                {"terms": {"language": ["en"]}},
            ]
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _first(meta: dict, key: str, default: str = "") -> str:
    val = meta.get(key, default)
    if isinstance(val, list):
        return val[0] if val else default
    return val if val is not None else default


STATUS_LABELS = {
    "31094501": "Forthcoming",
    "31094502": "Open",
    "31094503": "Closed",
}
OPEN_STATUSES = {"31094501", "31094502"}


def to_card(result: dict) -> dict:
    meta = result.get("metadata", {})
    status_code = _first(meta, "status")
    return {
        "identifier": _first(meta, "identifier"),
        "title": _first(meta, "title") or _first(meta, "caName") or result.get("summary", ""),
        "callIdentifier": _first(meta, "callIdentifier"),
        "type": _first(meta, "typesOfAction") or _first(meta, "type"),
        "typeCode": _first(meta, "type"),
        "status": status_code,
        "statusLabel": STATUS_LABELS.get(status_code, status_code),
        "deadline": _first(meta, "deadlineDate"),
        "deadlineModel": _first(meta, "deadlineModel"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Search SEDIA for grant topics")
    parser.add_argument("query", help="Free-text query, e.g. 'digital twins energy'")
    parser.add_argument("--page-size", type=int, default=20, help="Max results (default 20)")
    args = parser.parse_args()

    data = search(args.query, args.page_size)

    # SEDIA's body-level status filter is unreliable for free-text queries;
    # we de-dupe + sort by status priority and surface a note if everything
    # in the top page is closed.
    cards = []
    seen = set()
    for r in data.get("results", []):
        card = to_card(r)
        identifier = card.get("identifier") or ""
        if not identifier or identifier in seen:
            continue
        seen.add(identifier)
        cards.append(card)

    # Sort: Open first, then Forthcoming, then everything else
    status_rank = {"31094502": 0, "31094501": 1}
    cards.sort(key=lambda c: (status_rank.get(c.get("status"), 9), c.get("deadline") or ""))

    open_count = sum(1 for c in cards if c.get("status") in OPEN_STATUSES)
    note = None
    if cards and open_count == 0:
        note = (
            "No Open / Forthcoming topics in the top page — all matches are Closed. "
            "Try a more specific query, or use the identifier directly with scripts/fetch_grant.py."
        )

    out = {
        "query": args.query,
        "totalResults": data.get("totalResults", len(cards)),
        "returned": len(cards),
        "openOrForthcoming": open_count,
        "results": cards,
    }
    if note:
        out["note"] = note

    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
