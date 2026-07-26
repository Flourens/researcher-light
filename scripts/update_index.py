#!/usr/bin/env python3
"""
Rebuild frontend/data/index.json from all grants-output/<ID>/analysis.json files.

Run after creating or updating an analysis. The frontend reads this index to
populate the list view.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "grants-output"
INDEX_PATH = ROOT / "frontend" / "data" / "index.json"


def _localized(value):
    """Return either the raw string OR a {en, uk} dict — let the frontend pick.
    Strips unwanted shapes."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        out = {}
        for k in ("en", "uk"):
            if value.get(k):
                out[k] = value[k]
        return out or ""
    return str(value)


def card_from_analysis(grant_id: str, data: dict) -> dict:
    grant = data.get("grant", {}) or {}
    verdict = data.get("verdict", {}) or {}
    return {
        "id": grant_id,
        "kind": data.get("kind", "grant"),
        "participant": data.get("participant", "ZNU"),
        "sourceUrl": data.get("sourceUrl", ""),
        "title": _localized(grant.get("title", "")),
        "callIdentifier": grant.get("callIdentifier", ""),
        "type": _localized(grant.get("type", "")),
        "deadline": grant.get("deadline", ""),
        "deadlineModel": _localized(grant.get("deadlineModel", "")),
        "budgetPerProject": _localized(grant.get("budgetPerProject", "")),
        "shouldApply": verdict.get("shouldApply", ""),
        "confidence": verdict.get("confidence", ""),
        "znuFitsGrant": verdict.get("znuFitsGrant", ""),
        "grantFitsZnu": verdict.get("grantFitsZnu", ""),
        "analyzedAt": data.get("analyzedAt", ""),
    }


def main() -> int:
    cards = []
    if OUTPUT_DIR.exists():
        for grant_dir in sorted(OUTPUT_DIR.iterdir()):
            if not grant_dir.is_dir():
                continue
            analysis_path = grant_dir / "analysis.json"
            if not analysis_path.exists():
                continue
            try:
                with analysis_path.open("r", encoding="utf-8") as f:
                    data = json.load(f)
            except json.JSONDecodeError as e:
                print(f"WARNING: skipping {analysis_path} — invalid JSON: {e}")
                continue
            cards.append(card_from_analysis(grant_dir.name, data))

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with INDEX_PATH.open("w", encoding="utf-8") as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(cards)} card(s) to {INDEX_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
