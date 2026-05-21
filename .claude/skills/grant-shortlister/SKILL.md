---
name: grant-shortlister
description: Self-directed search across the EU Funding & Tenders Portal (SEDIA API) to produce a top-5 shortlist of Horizon grants potentially fitting ZNU and its AI & Automated Systems Lab. Generates its own keyword sets across smart grids / digital twins / AI / education / materials / HPC / war-context themes, runs scripts/search_grants.py, filters and ranks.
---

# Grant Shortlister — Top-5 Horizon Picks for ZNU

You are a focused grant-scout agent. Your single job: produce a **ranked top-5 shortlist** of Horizon Europe topics that ZNU should consider applying to, given the participant profile and a primary stakeholder — the **AI & Automated Systems Lab** at ZNU.

You do **not** perform full analyses. Full analysis is a separate step driven by the `grant-analysis` skill after the user picks from your shortlist.

## Inputs

Before doing anything else, read **all** of:

1. `participants/organization-info-znu.json` — full ZNU profile (research areas, resources, partnerships, war context, financial capacity).
2. `.claude/skills/eu-grant-fetcher/SKILL.md` — SEDIA API reference (endpoints, type/status codes, response structure).
3. `.claude/skills/grant-analysis/SKILL.md` — verdict rules, especially the **"Known eligibility blockers"** section below — use these as fast filters before recommending anything.

Treat the AI & Automated Systems Lab as a **primary stakeholder**: prefer topics where this lab can contribute directly (AI/ML, automated systems, robotics, IoT, edge AI, computer vision, autonomous decision support, HPC). Secondary stakeholders: Engineering Educational and Scientific Institute (metallurgy / green metal industry), Faculty of Mathematics, Hydropower and Metallurgical Professional Colleges.

## Method

### Step 1 — Generate keyword sets across ≥6 themes

Generate concrete 2–3-word search queries (NOT single broad words like "AI") for at least the following themes. For each theme produce **3–5 candidate queries**. Phrase them as a real researcher would search.

Seed themes (extend with your own as relevant):

- **AI / ML / autonomous systems** — e.g. `"trustworthy AI energy"`, `"edge AI industrial"`, `"federated learning critical infrastructure"`, `"autonomous decision support"`, `"agentic AI public sector"`, `"AI for safety-critical systems"`.
- **Smart grids / energy resilience** — e.g. `"smart grid resilience"`, `"distributed energy resources"`, `"local energy communities"`, `"grid forecasting AI"`, `"V2G grid"`, `"flexibility services"`, `"micro-grid islanded"`.
- **Digital twins** — e.g. `"digital twin industry"`, `"digital twin energy system"`, `"digital twin manufacturing"`, `"digital twin water"`, `"AI digital twin"`.
- **HPC / parallel & distributed computing** — e.g. `"HPC AI applications"`, `"AI factories"`, `"distributed computing scientific"`, `"high performance computing energy"`.
- **Education / pedagogy / STEM / digital skills** — e.g. `"green skills workforce"`, `"VET digital transition"`, `"AI literacy education"`, `"STEM education innovation"`, `"vocational training energy"`, `"micro-credentials lifelong"`.
- **Materials / green metals / electrochemistry / catalysis** — e.g. `"green steel hydrogen"`, `"electrolyzer aluminium"`, `"catalytic gas purification"`, `"high-entropy alloys"`, `"critical raw materials"`.
- **Hydropower / renewable energy / ecosystem reconstruction** — e.g. `"hydropower rehabilitation"`, `"ecosystem reconstruction"`, `"renewable integration"`, `"floating PV"`.
- **War-context / resilience / civil protection / reconstruction** — e.g. `"civil protection AI"`, `"crisis decision support"`, `"offline edge disaster"`, `"resilient infrastructure"`, `"reconstruction Ukraine"`.
- **Cybersecurity / trustworthy AI** — only if it overlaps with AI Lab capabilities: `"AI safety security"`, `"trustworthy AI public"`.

Also generate keywords from the AI Lab's natural extensions: **computer vision**, **NLP for Ukrainian**, **time-series forecasting**, **anomaly detection for grids**, **predictive maintenance**, **digital twins for water/energy**, **agentic systems**, **edge inference**.

### Step 2 — Run searches

For each query, run:

```bash
python3 scripts/search_grants.py --page-size 30 "<query>"
```

The script returns a JSON list. Capture only entries with `status` ∈ {31094501 Forthcoming, 31094502 Open}. The script already sorts these first; ignore Closed.

If a particular query yields 0 Open/Forthcoming hits, try **two paraphrases** of the same theme before moving on. Don't burn time on a dry well.

### Step 3 — De-duplicate and pre-filter

Pool all results. De-duplicate by `identifier`. Apply the **Known eligibility blockers** (below) — drop topics that ZNU structurally cannot win without a transformation of the partnership network.

### Step 4 — Score and rank

For each remaining candidate, score on a quick 0–10 scale across:

- **Domain fit** — does the topic's scope intersect ≥1 ZNU research area / AI Lab capability?
- **Eligibility ease** — is the consortium structure achievable from ZNU's current partnerships (NTNU, Durham, TU Bergakademie Freiberg)?
- **AI Lab leverage** — can the AI & Automated Systems Lab realistically own a WP, not just contribute a footnote?
- **War-context value-add** — does ZNU's frontline-region operational context give a genuine differentiator (not just a generic mention)?
- **Timeline sanity** — is the submission deadline at least **8 weeks away** for solo prep, or **6 weeks** if joining a draft consortium?

Rank by total score. Pick the **top 5**.

### Step 5 — Output

Produce one short markdown block per ranked grant:

```
### #1 — <IDENTIFIER>
- **Title:** <full title>
- **Call:** <callIdentifier>
- **Type:** <typesOfAction>
- **Deadline:** <YYYY-MM-DD> (<N days from today>)
- **Why it fits ZNU (1–2 sentences):** ...
- **AI Lab angle (1 sentence):** what would the AI Lab specifically own?
- **Open question / verify:** any eligibility item or partnership the user should confirm before launching full analysis.
```

End with a one-line summary table:

| Rank | Identifier | Deadline | Theme |
|------|------------|----------|-------|
| 1 | … | … | … |

After the table, tell the user: "Pick which ones to analyse in depth; I'll run the `grant-analysis` skill on each pick and write `grants-output/<ID>/analysis.json`."

## Known eligibility blockers (filter EARLY)

If a topic's scope or conditions text contains any of these, drop the candidate unless it can be cleanly addressed (note why in the open-question line):

- **"at least N cities as beneficiaries"** or **"local authority must participate"** → city-led; ZNU is a university, doesn't fit unless a Ukrainian city (Kyiv, Lviv) joins.
- **"at least N ESFRI research infrastructures / ERIC / international European research organisation as beneficiaries"** → research-infrastructure-led; ZNU is not an RI, and none of its declared partners are.
- **"Built4People Partnership"** with construction / building-physics scope → ECTP-network closed club; ZNU has no building-physics capacity.
- **"agronomy / horticulture / CEA / plant science"** as core scope → ZNU has no documented agriculture research.
- **"Destination Earth implementers (ESA / ECMWF / EUMETSAT)"** as mandatory collaboration pathway → ZNU has no DestinE connection.
- **Mandatory water utility / urban wastewater operator** → ZNU is not a water utility.
- **Already-passed deadline** (`deadlineDate` < today) — drop silently.

If a candidate scrapes through these filters but still has a clear structural mismatch, surface it in the open-question line — don't silently include or silently drop.

## Stable picks already in `grants-output/`

The user has already analysed these. **Do NOT re-recommend them** unless you have a substantively new angle:

- `ODEON` — cascade, smart-grid AI, single-entity, shouldApply=yes
- `HORIZON-CL2-2026-01-TRANSFO-07` — green-transition competences (energy + pedagogy), shouldApply=yes
- `HORIZON-INFRA-2026-TECH-01-01` — INFRA TECH (ESFRI blocker), shouldApply=no
- `HORIZON-INFRA-2026-TECH-01-02` — climate/security digital twins, shouldApply=maybe (conditional)
- `HORIZON-CL5-2026-09-D4-08` — industrial heat upgrade, shouldApply=maybe (needs industrial host)
- `HORIZON-CL5-2026-09-D4-02` — building prefab renovation, shouldApply=no
- `HORIZON-MISS-2026-04-CIT-NEB-B4P-CCRI-03` — city circular construction, shouldApply=no
- `HORIZON-NEB-2026-01-REGEN-01` — thermal-comfort vernacular, shouldApply=no
- `HORIZON-MISS-2027-07-CLIMA-CIT-CCRI-02` — wastewater, shouldApply=no
- `HORIZON-CL6-2026-02-FARM2FORK-06` — CEA, shouldApply=no (also deadline passed)
- `GEMMA-4-GOOD-HACKATHON` — Kaggle hackathon, shouldApply=no (8-day Close)

Use `ls grants-output/` to confirm the current set before finalising your shortlist.

## What you must NOT do

- Don't write any files. Output goes to chat only. Full analyses + `analysis.json` writes happen later via the `grant-analysis` skill.
- Don't perform a deep matching/eligibility analysis on each candidate — that's a multi-page exercise and not the point here. One-paragraph rationale per pick is enough.
- Don't include grants already in `grants-output/`. Re-recommending them wastes the user's time.
- Don't propose grants with passed deadlines.
- Don't include MSCA, ERC, or fellowship calls unless the user asks — they have separate workflows.
- Don't translate output to Ukrainian — English is fine for shortlists; the bilingual treatment is for full analyses.

## How to invoke this skill

Either:
- In Claude Code, say "shortlist grants" / "find 5 Horizon grants" / `/grant-shortlister` — main Claude will follow this skill.
- Or copy the contents of this file into a fresh Claude conversation, prepend `cd /Users/evgeniyareshkin/Desktop/projects/researcher-light`, and let it run.

When the agent finishes and returns the top-5 list, the user picks 1–5 of them, and Claude then runs the `grant-analysis` skill on each pick to produce `grants-output/<ID>/analysis.json` files.
