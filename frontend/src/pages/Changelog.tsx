export default function Changelog() {
  return (
    <div className="main-content">
      <article className="static-page">
        <header className="static-header">
          <h1 className="static-title">Changelog</h1>
          <p className="static-subtitle">Version history and what's changed</p>
        </header>

        <div className="changelog-list">
          <div className="changelog-entry">
            <div className="changelog-meta">
              <span className="changelog-version">v0.5.0</span>
              <span className="changelog-date">Jun 2026</span>
              <span className="changelog-tag tag-feature">feature</span>
              <span className="changelog-tag tag-ui">UI</span>
            </div>
            <h3 className="changelog-title">Automotive UI redesign + multi-page site</h3>
            <ul className="changelog-items">
              <li>Full frontend redesign — dark surface system, CSS custom properties, Barlow Condensed display font</li>
              <li>Landing page with hero layout, sample dyno preview, and feature grid</li>
              <li>React Router-based multi-page navigation with mobile drawer</li>
              <li>Shareable build URLs — current form state encodes into the URL automatically</li>
              <li>About, FAQ, and Changelog pages</li>
              <li>Standalone Dyno Graph page</li>
              <li>Footer with disclaimer and model version info</li>
            </ul>
          </div>

          <div className="changelog-entry">
            <div className="changelog-meta">
              <span className="changelog-version">v0.4.0</span>
              <span className="changelog-date">Jun 2026</span>
              <span className="changelog-tag tag-feature">feature</span>
            </div>
            <h3 className="changelog-title">Virtual dyno graph</h3>
            <ul className="changelog-items">
              <li>New <code>/graph</code> API endpoint returning per-RPM WHP/WTQ points</li>
              <li>N54 torque curve shape generator — rapid twin-scroll spool (2000–3000), flat plateau (3600–5200), power taper</li>
              <li>WHP derived from WTQ × RPM / 5252, rescaled to model-predicted peak (physically consistent)</li>
              <li>Recharts line chart rendered in the frontend with peak stat display</li>
            </ul>
          </div>

          <div className="changelog-entry">
            <div className="changelog-meta">
              <span className="changelog-version">v0.3.0</span>
              <span className="changelog-date">Jun 2026</span>
              <span className="changelog-tag tag-feature">feature</span>
            </div>
            <h3 className="changelog-title">Target-HP build planner</h3>
            <ul className="changelog-items">
              <li>New "Target HP" goal mode — enter a WHP target, get the cheapest mod sequence to reach it</li>
              <li>Greedy search algorithm: each iteration picks the highest gain-per-dollar upgrade available, prioritizing free mods</li>
              <li>Build plan card showing step-by-step sequence, cumulative WHP/WTQ, and per-step cost</li>
              <li>Capped at 26 iterations; shows "not reachable" with best achievable if target can't be met</li>
            </ul>
          </div>

          <div className="changelog-entry">
            <div className="changelog-meta">
              <span className="changelog-version">v0.2.0</span>
              <span className="changelog-date">May 2026</span>
              <span className="changelog-tag tag-feature">feature</span>
            </div>
            <h3 className="changelog-title">Risk engine</h3>
            <ul className="changelog-items">
              <li>JSON rule DSL for encoding N54-specific safety rules (<code>data/risk_rules.json</code>)</li>
              <li>Python evaluator supporting condition operators: fuel_gte, mod_absent, tune_gte, predicted_whp_gte, and more</li>
              <li>Seeded rules: E50/stock HPFP, E30/stock HPFP, S2 tune without downpipe, E85 without port injection, meth without tune</li>
              <li>Three severity levels: info, caution, warning — displayed per-recommendation with color coding</li>
              <li>Risk score used to sort recommendations in "Reliability" goal mode</li>
            </ul>
          </div>

          <div className="changelog-entry">
            <div className="changelog-meta">
              <span className="changelog-version">v0.1.0</span>
              <span className="changelog-date">Apr 2026</span>
              <span className="changelog-tag tag-model">model</span>
            </div>
            <h3 className="changelog-title">Initial LightGBM model + baseline</h3>
            <ul className="changelog-items">
              <li>LightGBM regression models for WHP and WTQ trained on community dyno data</li>
              <li>SHAP TreeExplainer for per-recommendation reasoning text</li>
              <li>Four goal modes: Max Power, Best Value, Reliability, Target HP</li>
              <li>Baseline average-gain lookup table as fallback if model artifacts are missing</li>
              <li>FastAPI backend with <code>/recommend</code> and <code>/predict</code> endpoints</li>
              <li>React + Vite frontend deployed to Vercel; backend deployed to Render</li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  )
}
