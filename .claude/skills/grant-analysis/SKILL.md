---
name: grant-analysis
description: Compare an EU grant topic against the ZNU participant profile and produce a structured analysis.json with eligibility, matching, and verdict. Use after eu-grant-fetcher has saved a grant to grants-input/<ID>/.
---

# Grant ↔ ZNU Fit Analysis

After a grant is fetched into `grants-input/<ID>/`, this skill drives the inline analysis Claude performs to compare it against the ZNU profile and produce a stable `analysis.json` for the frontend.

## When to Use

- User says: "проанализируй грант X", "compare X with ZNU", "стоит ли подавать на X"
- A new `grants-input/<ID>/text.txt` has just appeared and the user wants a verdict
- User picks a grant from the search results returned by `search_grants.py`

## Checklist

1. **Load inputs.** Read `participants/organization-info-znu.json` and `grants-input/<ID>/text.txt` in full.
2. **Fill `grant` block.** Extract title, callIdentifier, type/typesOfAction, deadline (ISO date — this is the **proposal SUBMISSION deadline** from SEDIA's `deadlineDate`, NOT the project execution end date), deadlineModel (single-stage/two-stage), budgetTotal, budgetPerProject, expectedOutcome, scope, topicsKeywords from the text. Keep extraction faithful — do not paraphrase or shorten the scope/outcome beyond removing API noise. If you can infer the project execution duration from the text (e.g. "36 months", "10-month programme"), include it inside `deadlineModel` or `otherConstraints` rather than overwriting `deadline`.
3. **Fill `eligibility` block.** Pay particular attention to:
   - Ukraine is an **Associated Country** to Horizon Europe → ZNU is eligible for most HE topics. Confirm by looking for "Associated Countries" or explicit country exclusions in CONDITIONS.
   - Minimum consortium size and country diversity (e.g. "3 independent legal entities from 3 different MS/AC").
   - Topic-specific constraints (Lump Sum, two-stage, restricted to specific TRL, etc.).
4. **Fill `matching` block.**
   - `researchAreaOverlap`: map each significant grant scope theme to the closest entry in ZNU's `researchAreas` / `teamInfo.expertise` / `cooperationAreas`. Strength is `high` only when the ZNU area is named in the scope or is a direct match; `medium` for adjacent fit; `low` for thin overlap.
   - `resourceFit`: check HPC, labs, cloud, solar — does ZNU's stack cover what the grant expects?
   - `partnershipFit`: review `partnerships[]` (NTNU, Durham, TU Bergakademie Freiberg). Are these enough for the required consortium? Note gaps explicitly.
   - `trackRecordFit`: previous EU grants (14 Erasmus+, 3 Horizon MSCA, UA-UK Twinning, DAAD) — relevance to this topic.
   - `warContextRelevance`: for resilience / reconstruction / energy security / digital sovereignty topics, ZNU's frontline-region context and ESG strategy are a value-add. Otherwise neutral.
5. **Fill `verdict` block.** Apply the rules below.
6. **Save** to `grants-output/<ID>/analysis.json` using the Write tool.
7. **Refresh the index** by running `python3 scripts/update_index.py` (Bash). Without this, the frontend will not see the new grant.

## Verdict Rules

- `shouldApply = "yes"` when ALL of:
  - At least one `researchAreaOverlap` entry has `strength: "high"`.
  - `eligibility.ukraineEligible: true` and no blocking country/sector exclusion.
  - Consortium is feasible — either ZNU's existing `partnerships[]` cover the minimum size, or there's an explicit UA-priority/widening track.
  - The deadline gives realistic prep time (≥3 months for single-stage, ≥6 weeks if joining as partner on an existing draft).
- `shouldApply = "maybe"` when there is a real overlap but a gap on consortium, deadline, or budget alignment.
- `shouldApply = "no"` when there is no high/medium overlap, or ZNU is excluded by eligibility, or the call is closed.
- `confidence`: `high` when the grant text spells out scope and eligibility unambiguously; `medium` when some inference is required; `low` when the text leaves key questions open and the work programme PDF should be consulted.

## Bilingual content (EN / UK)

The frontend has an EN ↔ UK language switcher. Text fields in `analysis.json` may be **either** a plain string (English-only) **or** a `{"en": "...", "uk": "..."}` object. The renderer picks the active language and falls back to the other if one is missing.

**Default behaviour:** fill the English (`en`) field always; fill the Ukrainian (`uk`) field whenever the user explicitly works in a Ukrainian-language context, when the analysis will be shown to a Ukrainian audience, or when the user asks for translations.

Fields where bilingual content makes sense:
- `grant.title`, `grant.type`, `grant.deadlineModel`, `grant.budgetTotal`, `grant.budgetPerProject`, `grant.expectedOutcome`, `grant.scope`
- Each item in `grant.topicsKeywords` (string OR `{en, uk}`)
- `eligibility.minConsortiumSize`, `eligibility.requiredCountries`, `eligibility.otherConstraints`
- `matching.resourceFit`, `matching.partnershipFit`, `matching.trackRecordFit`, `matching.warContextRelevance`
- Each `researchAreaOverlap[]` item's `grantTopic`, `znuArea`, `rationale`
- `verdict.recommendedRole`, `verdict.rationale`, and each entry in `verdict.strengths` and `verdict.risks`

Fields that stay as plain strings / enums (no translation needed):
- `grantId`, `fetchedAt`, `analyzedAt`, `grant.callIdentifier`, `grant.typeCode`, `grant.deadline`
- `eligibility.ukraineEligible` (boolean)
- `researchAreaOverlap[].strength` (enum: high/medium/low — translated by the UI)
- `verdict.znuFitsGrant`, `verdict.grantFitsZnu`, `verdict.shouldApply`, `verdict.confidence` (enums translated by the UI)

## Non-grant opportunities (hackathons, prizes, challenges)

The schema also supports non-grant opportunities (hackathons, prize competitions, fellowships). Add a top-level `"kind"` field:

- `"grant"` (default if omitted) — EU/national grant or cooperative funding agreement
- `"hackathon"` — skills-based competition with prize money (e.g. Gemma 4 Good Hackathon, Kaggle competitions)
- `"prize"` — open prize / challenge competition (no application, evaluated submission)
- `"fellowship"` — individual fellowship / mobility award

Add `"sourceUrl"` (top-level) for non-SEDIA opportunities so the frontend's "Open original" button points to the right page (Kaggle competition page, Devpost, sponsor portal, etc.). For grants this is auto-derived from the EC portal.

For non-grants, `verdict.recommendedRole` semantics shifts: instead of "Coordinator / Partner / WP lead", use "Individual entrant", "Student team", "Lab team with mentor", "Skip", etc.

## `analysis.json` Schema (authoritative)

```json
{
  "grantId": "HORIZON-INFRA-2026-TECH-01-01",
  "kind": "grant | hackathon | prize | fellowship  (optional, defaults to 'grant')",
  "sourceUrl": "https://...  (optional; required for non-grants so frontend links correctly)",
  "fetchedAt": "ISO-8601 timestamp, copy from grants-input mtime or now",
  "analyzedAt": "ISO-8601 timestamp of this analysis",
  "grant": {
    "title": "",
    "callIdentifier": "",
    "type": "HORIZON Innovation Actions | RIA | CSA | ...",
    "typeCode": "1 | 2 | 8",
    "deadline": "YYYY-MM-DD",
    "deadlineModel": "single-stage | two-stage",
    "budgetTotal": "",
    "budgetPerProject": "",
    "expectedOutcome": "",
    "scope": "",
    "topicsKeywords": []
  },
  "eligibility": {
    "ukraineEligible": true,
    "minConsortiumSize": "",
    "requiredCountries": "",
    "otherConstraints": ""
  },
  "matching": {
    "researchAreaOverlap": [
      {"grantTopic": "", "znuArea": "", "strength": "high | medium | low", "rationale": ""}
    ],
    "resourceFit": "",
    "partnershipFit": "",
    "trackRecordFit": "",
    "warContextRelevance": ""
  },
  "verdict": {
    "znuFitsGrant": "yes | partial | no",
    "grantFitsZnu": "yes | partial | no",
    "shouldApply": "yes | maybe | no",
    "confidence": "high | medium | low",
    "recommendedRole": "Coordinator | Partner | WP lead | Affiliated | n/a",
    "strengths": [],
    "risks": [],
    "rationale": "1–3 paragraph summary; explicit about which ZNU assets matter and what is missing"
  }
}
```

## After Saving

Always run:

```bash
python3 scripts/update_index.py
```

Then mention to the user that the analysis is visible in the frontend at `http://localhost:8000/frontend/` (they may need to refresh / start `python3 -m http.server 8000` from the project root).
