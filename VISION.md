# BMW N54 Mod Advisor — Project Vision

**Status:** Living document. Update as scope evolves and checkpoints are hit.
**Last updated:** Phase 1 complete.

---

## What this is

A free web tool for BMW N54 owners that predicts how a given set of modifications
will affect their car's power, visualizes it as a **virtual dyno graph**, recommends
real purchasable parts with honest tradeoffs, and grounds every prediction in a
growing database of real builds.

The hero feature is the **virtual dyno graph**: a user configures parts, clicks
generate, and sees a projected whp/tq curve for their build.

## Why it wins (the moat)

A general AI gives a plausible guess. This tool gives a prediction grounded in real,
verified N54 builds — with the exact parts to buy, honest reliability warnings from
real outcomes, and a model that improves with every dyno submitted. The proprietary,
compounding dataset is the asset a general AI structurally cannot replicate.

Three defensibility pillars:
1. **Proprietary data flywheel** — user-submitted real builds grow the dataset.
2. **Domain credibility** — curated part knowledge and risk flags from real e-commerce experience.
3. **Community-native distribution** — shareable graphs spread inside forums, Reddit, Discord.

---

## Core principles (do not violate)

- **Never sell predictions the data can't back.** Free tier may show clearly-labeled
  *projections*; the paid tier waits until real data makes predictions defensible.
- **Always show uncertainty.** Confidence bands ("420–445 whp, based on 18 real E30
  builds"), never a bare confident number.
- **Honesty over polish.** Label projected vs measured. Cite the evidence behind every number.
- **Liability disclaimers visible** before any advice or payment (projections, not
  guarantees; consult a tuner).
- **Schema discipline.** Model at the category level appropriate to the data size;
  capture specifics in notes and promote to features only when data justifies it.

---

## Feature set (the finished product)

### 1. Virtual dyno graph generator (hero feature)
- User configures parts → clicks "Generate Dyno Graph" → sees a projected whp/tq curve.
- Peaks come from the model; curve shape from a domain-appropriate template, scaled to peaks.
- Clearly labeled as a projection.
- Overlay against real builds from the database when available.

### 2. Real parts with links and honest tradeoffs
- Each recommendation maps to actual purchasable products: brand, price, vendor link.
- Curated pros/cons per part (e.g. budget FMIC vs premium: cost vs heat-soak performance).
- This is curated domain judgment no general AI has.

### 3. "Based on N real builds" evidence
- Every prediction shows the evidence behind it.
- Scatter plot of the real data points supporting a prediction.
- Confidence bands reflecting how much real data backs each estimate.

### 4. Full staged build planner
- Complete path from current state to a power goal, in stages.
- Each stage: cost, predicted gain, required supporting mods, and what breaks if skipped.
- A roadmap, not a single next-mod suggestion.

### 5. Reliability / risk engine (headline feature)
- Surfaces risk flags from domain knowledge and, eventually, real-build outcomes.
- Example: "Running E50 on a stock HPFP — high reported rate of fueling issues."
- Owns the strongest emotion in the hobby: fear of engine damage.

### 6. Crowd-sourced dyno database (the flywheel)
- Users submit their own build + dyno result.
- Every submission improves the model and grows the "N real builds" count.
- Turns synthetic seed data into real proprietary data over time.

### 7. "Cars like yours" browser
- Filterable, browsable real builds with exact part lists.
- "Show me real e92 builds on E30 making 400+ whp."
- The only structured source of this in the community.

### 8. Recommendation engine with selectable goals
- Goals: max power / best value (gain-per-dollar) / target HP / reliability-weighted.
- Incremental: only recommends mods the user doesn't have; gains computed as deltas.

### 9. Shareable results
- URL-encoded state; no signup, no database dependency for sharing.
- Anyone clicking a link sees the same build and graph.

---

## Monetization

- **Free tier:** configure a build, generate a projected dyno graph (labeled estimate),
  basic recommendations.
- **Paid tier (gated behind real-data credibility):** depth, not volume —
  - Overlay projections against real builds + confidence bands
  - Full staged build plans with costs and risk analysis
  - Save and compare multiple builds
  - Clean exportable/shareable graph images
- **Affiliate revenue:** real part links route high-intent buyers to vendors.

**Rule:** paywall depth and substance, never a rate limit on a number you can't yet stand behind.

---

## Architecture

```
React + TypeScript (Vercel)
   │  POST /recommend, /predict, /graph
   ▼
FastAPI (Render)
   ├─ recommendation + ranking logic
   ├─ model.pkl (LightGBM, two heads: whp + wtq, monotonic constraints)
   ├─ curve generator (peaks → projected dyno curve)
   ├─ prices.json (curated cost table; live scraping later)
   ├─ rules.py (risk flags + SHAP-templated explanations)
   └─ build submission endpoint → grows dataset
Training pipeline (offline): dyno_data.csv → train.py → model.pkl + metrics.json
Data store: starts file-based; real DB added when the flywheel turns on.
```

- Standardize on **wheel HP**; carry dyno_type as a feature.
- Stateless core; shareable via URL-encoded state.
- Schema reserves `turbo_setup` (stock / hybrid / single) for the upgraded-turbo phase.

---

## Model approach

- Gradient-boosted trees (LightGBM/XGBoost), two regression heads (whp, wtq).
- Monotonic constraints: better fuel / added mods never predict less power.
- Per-mod gain = predict(config + mod) − predict(config); total build = predict(full config).
- SHAP attributions drive the explanations (deterministic, no LLM call).
- Always evaluated against a baseline (avg-gain lookup) with cross-validated MAE in whp.

---

## Build phases and checkpoints

### Phase 0 — Scaffolding ✅ COMPLETE
- Monorepo, GitHub, FastAPI + React deployed live, stub `/recommend`.

### Phase 1 — Data schema + baseline ✅ COMPLETE
- Locked CSV schema and controlled vocabulary.
- Seed dataset in place (synthetic, clearly flagged — to be replaced with real data).
- Average-gain baseline behind the live `/recommend` contract; full flow works end to end.

### Phase 2 — Real model
- [ ] Train LightGBM with monotonic constraints, two heads.
- [ ] Cross-validated metrics committed to the repo.
- [ ] SHAP explanations wired into recommendations.
- [ ] Swap baseline → model behind the same endpoint.

### Phase 3 — Recommendation depth + risk engine
- [ ] Selectable goals (max power / value / target HP / reliability).
- [ ] Target-HP greedy/beam search over real parts and costs.
- [ ] Curated risk flag engine.
- [ ] Real parts catalog with links and pros/cons.

### Phase 4 — Virtual dyno graph (hero feature)
- [ ] Curve generator: model peaks → projected whp/tq curve.
- [ ] Clean, shareable, exportable graph visualization.
- [ ] Clearly labeled as projection.
- [ ] "Play with parts → regenerate graph" loop.

### Phase 5 — The flywheel
- [ ] Build submission flow (build + dyno result).
- [ ] Data store / DB for submissions.
- [ ] Moderation / validation of submitted data.
- [ ] "Based on N real builds" + scatter plots + confidence bands wired to real data.
- [ ] "Cars like yours" browser.

### Phase 6 — Monetization + polish
- [ ] Paid tier around depth (after real data backs predictions).
- [ ] Affiliate links.
- [ ] Live price scraping.
- [ ] Liability disclaimers throughout.
- [ ] README / landing page that sells the ML for interviews and investors.

### Phase 7 — Expansion (future)
- [ ] Upgraded turbos (hybrid, single) once real data exists for that regime.
- [ ] Generalize architecture to other platforms (N55, B58, then beyond).

---

## Definition of done (for the core vision)

A free, fast, signup-free tool where an N54 owner configures their build, instantly
sees a credible projected dyno graph, gets honest part recommendations with real
links and tradeoffs, sees the real builds behind every number, and can submit their
own dyno to make the whole system smarter — backed by a proprietary dataset that
compounds with every user and a paid tier that monetizes depth once the data earns trust.
