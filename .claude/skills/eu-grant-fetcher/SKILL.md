---
name: eu-grant-fetcher
description: Fetch grant call data from the EU Funding & Tenders Portal using the SEDIA REST API. Use when the user provides EC portal URLs or topic identifiers and needs to retrieve call details (description, eligibility, budget, deadlines).
---

# EU Funding & Tenders Portal — Grant Data Fetcher

Fetches structured grant data from the EC portal's public SEDIA REST API, bypassing the JavaScript-rendered frontend.

## When to Use

- User provides an EC portal URL like `ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-...`
- User asks to fetch/analyze an EU grant call
- User provides a topic identifier (e.g., `HORIZON-CL4-2026-01-MAT-PROD-01`)
- User provides a competitive call URL (e.g., `competitive-calls-cs/13206`)

## API Reference

### Search Endpoint (POST)

```
POST https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=%22<IDENTIFIER>%22&pageSize=30
Content-Type: application/json
```

**Body** (filter to English, open/forthcoming/closed calls):
```json
{
  "bool": {
    "must": [
      { "terms": { "type": ["0","1","2","8"] } },
      { "terms": { "status": ["31094501","31094502","31094503"] } },
      { "terms": { "language": ["en"] } }
    ]
  }
}
```

**Type codes:** 0 = Tenders, 1 = Grants (standard topics), 2 = Grants (other), 8 = Competitive calls (cascade funding)

**Status codes:** 31094501 = Forthcoming, 31094502 = Open, 31094503 = Closed

### Facet API (reference data lookup)

```
POST https://api.tech.ec.europa.eu/search-api/prod/rest/facet?apiKey=SEDIA&text=***
Content-Type: application/json
```

### Organisation Profile

```
GET https://api.tech.ec.europa.eu/search-api/prod/rest/document/<PIC>?apiKey=SEDIA_PERSON
```

## How to Extract Topic Identifier from URL

| URL Pattern | Identifier |
|------------|------------|
| `/topic-details/HORIZON-CL4-2026-01-MAT-PROD-01` | `HORIZON-CL4-2026-01-MAT-PROD-01` |
| `/competitive-calls-cs/13206` | Search by project acronym (e.g., `ROB4GREEN`) |
| `/calls-for-proposals?callIdentifier=HORIZON-CL4-2026-01` | Use `callIdentifier` filter in query body |

## Response Structure

The API returns:
```json
{
  "totalResults": 24,
  "results": [
    {
      "summary": "Topic title",
      "metadata": {
        "identifier": ["HORIZON-CL4-2026-01-MAT-PROD-01"],
        "title": ["Full topic title"],
        "language": ["en"],
        "type": ["1"],
        "status": ["31094502"],
        "deadlineDate": ["2026-04-21T00:00:00.000+0000"],
        "typesOfAction": ["HORIZON Innovation Actions"],
        "callIdentifier": ["HORIZON-CL4-2026-01"],
        "descriptionByte": ["<HTML with Expected Outcome, Scope, etc.>"],
        "topicConditions": ["<HTML with eligibility, evaluation criteria>"],
        "budgetOverview": ["<JSON with budget details>"],
        "actions": ["<JSON with action types and MGA>"],
        "links": ["<JSON with document links>"],
        "destinationDescription": ["Destination area description"]
      }
    }
  ]
}
```

### Key Metadata Fields

**For Grant Topics (type 1/2):**
- `descriptionByte` — Full HTML description (Expected Outcome + Scope)
- `topicConditions` — Admissibility, eligibility, evaluation criteria
- `budgetOverview` — Budget breakdown JSON
- `actions` — Type of action, type of MGA
- `deadlineDate` — Submission deadline
- `deadlineModel` — "single-stage" or "two-stage"
- `links` — Links to work programme, submission system

**For Competitive Calls (type 8):**
- `caName` — Call name (e.g., "ROB4GREEN Open Call #1")
- `budget` — Total budget amount
- `duration` — Project duration
- `beneficiaryAdministration` — Timeline, eligibility, process (HTML)
- `destinationDetails` — Same as beneficiaryAdministration
- `furtherInformation` — Support contacts and links
- `projectAcronym` — Parent project acronym

## Usage via curl

```bash
# Fetch a specific topic
curl -s -X POST \
  'https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=%22HORIZON-CL4-2026-01-MAT-PROD-01%22&pageSize=30' \
  -H 'Content-Type: application/json' \
  -d '{"bool":{"must":[{"terms":{"type":["0","1","2","8"]}},{"terms":{"status":["31094501","31094502","31094503"]}},{"terms":{"language":["en"]}}]}}'

# Fetch a competitive call by project acronym
curl -s -X POST \
  'https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=%22ROB4GREEN%22&pageSize=30' \
  -H 'Content-Type: application/json' \
  -d '{"bool":{"must":[{"terms":{"type":["8"]}},{"terms":{"status":["31094501","31094502","31094503"]}},{"terms":{"language":["en"]}}]}}'
```

## Usage via Python Script

The project includes `scripts/fetch_grant.py`:

```bash
# Fetch a single grant by identifier
python3 scripts/fetch_grant.py HORIZON-CL4-2026-01-MAT-PROD-01

# Or by EC portal URL — identifier is auto-extracted
python3 scripts/fetch_grant.py "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-CL4-2026-01-MAT-PROD-01"

# Output saved to grants-input/<IDENTIFIER>/raw.json (full API response)
#                  and grants-input/<IDENTIFIER>/text.txt (cleaned text for analysis)
```

For search (Scenario 2), use `scripts/search_grants.py "<free-text query>"`. It returns a JSON list to stdout — pick a result and run `fetch_grant.py` on its identifier.

## Advanced Query Examples

```json
// Filter by call identifier (all topics in a call)
{
  "bool": {
    "must": [
      { "terms": { "type": ["1","2"] } },
      { "term": { "callIdentifier": "HORIZON-CL4-2026-01" } },
      { "terms": { "status": ["31094502"] } },
      { "terms": { "language": ["en"] } }
    ]
  }
}

// Filter by framework programme (e.g., Horizon Europe = 43108390)
{
  "bool": {
    "must": [
      { "terms": { "type": ["1","2","8"] } },
      { "terms": { "frameworkProgramme": ["43108390"] } },
      { "terms": { "status": ["31094502"] } },
      { "terms": { "language": ["en"] } }
    ]
  }
}
```
