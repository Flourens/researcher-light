#!/usr/bin/env python3
"""
Fetch a single grant from the EU Funding & Tenders Portal SEDIA REST API.

Usage:
    python3 scripts/fetch_grant.py <IDENTIFIER_OR_URL>

Examples:
    python3 scripts/fetch_grant.py HORIZON-INFRA-2026-TECH-01-01
    python3 scripts/fetch_grant.py "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-INFRA-2026-TECH-01-01"

Output:
    grants-input/<IDENTIFIER>/raw.json    full API response
    grants-input/<IDENTIFIER>/text.txt    cleaned text for analysis
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
GRANTS_INPUT_DIR = ROOT / "grants-input"

API_BASE = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
API_KEY = "SEDIA"


def extract_identifier(arg: str) -> str:
    """Extract a topic identifier from either a raw identifier or an EC portal URL."""
    arg = arg.strip()

    m = re.search(r"/topic-details/([A-Za-z0-9_\-]+)", arg)
    if m:
        return m.group(1)

    m = re.search(r"callIdentifier=([A-Za-z0-9_\-]+)", arg)
    if m:
        return m.group(1)

    m = re.search(r"/competitive-calls-cs/(\d+)", arg)
    if m:
        # Competitive calls in EC portal are referenced by numeric ID; the
        # user is expected to pass the project acronym instead. Surface a
        # clear error so the caller can retry.
        raise ValueError(
            "Competitive-call URLs reference a numeric ID; pass the project "
            "acronym (e.g. ROB4GREEN) instead."
        )

    return arg


def strip_html(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html)
    text = re.sub(r"</p>", "\n\n", text)
    text = re.sub(r"</li>", "\n", text)
    text = re.sub(r"<li[^>]*>", "- ", text)
    text = re.sub(r"<h\d[^>]*>", "\n### ", text)
    text = re.sub(r"</h\d>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#?\w+;", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def fetch_topic(identifier: str) -> Optional[dict]:
    encoded_id = urllib.parse.quote(f'"{identifier}"')
    url = f"{API_BASE}?apiKey={API_KEY}&text={encoded_id}&pageSize=30"

    if identifier.startswith(("HORIZON-", "ERC-", "MSCA-")):
        types = ["1", "2"]
    else:
        types = ["0", "1", "2", "8"]

    query = {
        "bool": {
            "must": [
                {"terms": {"type": types}},
                {"terms": {"status": ["31094501", "31094502", "31094503"]}},
                {"terms": {"language": ["en"]}},
            ]
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(query).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    for result in data.get("results", []):
        meta = result.get("metadata", {})
        lang = meta.get("language", [""])[0]
        if lang == "en":
            return {"api_response": data, "metadata": meta, "summary": result.get("summary", "")}

    return None


def _first(meta: dict, key: str, default: str = "") -> str:
    val = meta.get(key, default)
    if isinstance(val, list):
        return val[0] if val else default
    return val if val is not None else default


def format_grant_topic(meta: dict) -> str:
    lines = []

    title = _first(meta, "title")
    identifier = _first(meta, "identifier")
    deadline = _first(meta, "deadlineDate")
    action_type = _first(meta, "typesOfAction")
    call_id = _first(meta, "callIdentifier")
    call_title = _first(meta, "callTitle")
    deadline_model = _first(meta, "deadlineModel")
    dest_desc = _first(meta, "destinationDescription")

    lines.append(f"GRANT CALL: {title}")
    lines.append(f"Identifier: {identifier}")
    lines.append(f"Call: {call_id} — {call_title}")
    lines.append(f"Type of Action: {action_type}")
    lines.append(f"Deadline: {deadline}")
    lines.append(f"Submission: {deadline_model}")
    lines.append("")

    budget_raw = _first(meta, "budgetOverview")
    if budget_raw:
        try:
            budget = json.loads(budget_raw) if isinstance(budget_raw, str) else budget_raw
            lines.append("=== BUDGET ===")
            lines.append(json.dumps(budget, indent=2, ensure_ascii=False))
            lines.append("")
        except (json.JSONDecodeError, TypeError):
            pass

    if dest_desc:
        lines.append("=== DESTINATION ===")
        lines.append(strip_html(dest_desc))
        lines.append("")

    desc = _first(meta, "descriptionByte")
    if desc:
        lines.append("=== DESCRIPTION (Expected Outcome & Scope) ===")
        lines.append(strip_html(desc))
        lines.append("")

    cond = _first(meta, "topicConditions")
    if cond:
        lines.append("=== CONDITIONS (Eligibility & Evaluation) ===")
        lines.append(strip_html(cond))
        lines.append("")

    add_info = _first(meta, "additionalInfos")
    if add_info:
        lines.append("=== ADDITIONAL INFORMATION ===")
        try:
            info = json.loads(add_info) if isinstance(add_info, str) else add_info
            if isinstance(info, dict) and "staticAdditionalInfo" in info:
                lines.append(strip_html(info["staticAdditionalInfo"]))
            else:
                lines.append(strip_html(str(info)))
        except (json.JSONDecodeError, TypeError):
            lines.append(strip_html(str(add_info)))
        lines.append("")

    links_raw = _first(meta, "links")
    if links_raw:
        try:
            links = json.loads(links_raw) if isinstance(links_raw, str) else links_raw
            if links:
                lines.append("=== DOCUMENT LINKS ===")
                for link in links:
                    if isinstance(link, dict):
                        desc_text = link.get("criterionDescription", "")
                        url_text = link.get("url", "")
                        lines.append(f"- {desc_text}: {url_text}")
                lines.append("")
        except (json.JSONDecodeError, TypeError):
            pass

    return "\n".join(lines)


def format_competitive_call(meta: dict) -> str:
    lines = []

    ca_name = _first(meta, "caName") or _first(meta, "callTitle")
    identifier = _first(meta, "identifier")
    deadline = _first(meta, "deadlineDate")
    budget = _first(meta, "budget")
    duration = _first(meta, "duration")
    acronym = _first(meta, "projectAcronym")
    project_name = _first(meta, "projectName")

    lines.append(f"COMPETITIVE CALL: {ca_name}")
    lines.append(f"Parent Project: {acronym} — {project_name}")
    lines.append(f"Original Topic: {identifier}")
    lines.append(f"Deadline: {deadline}")
    if isinstance(budget, (int, float)):
        lines.append(f"Total Budget: €{budget:,}")
    else:
        lines.append(f"Total Budget: {budget}")
    lines.append(f"Duration: {duration}")
    lines.append("")

    for field in ("beneficiaryAdministration", "destinationDetails"):
        raw = _first(meta, field)
        if raw:
            lines.append("=== CALL DETAILS ===")
            lines.append(strip_html(raw))
            lines.append("")
            break

    further = _first(meta, "furtherInformation")
    if further:
        lines.append("=== FURTHER INFORMATION ===")
        lines.append(strip_html(further))
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    try:
        identifier = extract_identifier(sys.argv[1])
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2

    print(f"Fetching {identifier} ...")
    result = fetch_topic(identifier)
    if not result:
        print(f"ERROR: no English result found for {identifier}", file=sys.stderr)
        return 1

    meta = result["metadata"]
    topic_type = _first(meta, "type")

    out_dir = GRANTS_INPUT_DIR / identifier
    out_dir.mkdir(parents=True, exist_ok=True)

    raw_path = out_dir / "raw.json"
    with raw_path.open("w", encoding="utf-8") as f:
        json.dump(result["api_response"], f, indent=2, ensure_ascii=False)

    text = format_competitive_call(meta) if topic_type == "8" else format_grant_topic(meta)
    text_path = out_dir / "text.txt"
    with text_path.open("w", encoding="utf-8") as f:
        f.write(text)

    title = _first(meta, "title") or _first(meta, "caName") or "(no title)"
    deadline = _first(meta, "deadlineDate")
    print(f"  Title:    {title}")
    print(f"  Deadline: {deadline}")
    print(f"  Raw:      {raw_path.relative_to(ROOT)}  ({raw_path.stat().st_size / 1024:.1f} KB)")
    print(f"  Text:     {text_path.relative_to(ROOT)}  ({len(text)} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
