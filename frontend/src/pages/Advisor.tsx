import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import DynoGraph from '../components/DynoGraph'
import {
  API, CHASSIS_OPTIONS, FUEL_OPTIONS, FUELING_OPTIONS,
  TUNE_OPTIONS, BINARY_MODS, GOALS,
} from '../constants'
import { humanizeMod, worstSeverity } from '../utils'
import type {
  Recommendation, BuildPlan, BuildStep,
  RiskFlag, PartOption, RecommendResponse, GraphResponse,
} from '../types'

function RecCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  const [open, setOpen] = useState(false)
  const severity = worstSeverity(rec.risk_flags)

  return (
    <div className={`rec-card${severity ? ` rec-risk-${severity}` : ''}`}>
      <div className="rec-header" onClick={() => setOpen(!open)}>
        <div className="rec-rank">{rank}</div>
        <div className="rec-title">
          <span className="rec-mod">{humanizeMod(rec.mod)}</span>
          <div className="rec-gain-row">
            <span className="rec-gain-num">+{rec.predicted_whp_gain}</span>
            <span className="rec-gain-unit">whp</span>
            <span className="rec-gain-sep">/</span>
            <span className="rec-gain-num rec-gain-tq">+{rec.predicted_wtq_gain}</span>
            <span className="rec-gain-unit">wtq</span>
          </div>
        </div>
        <div className="rec-meta">
          {rec.cost_usd > 0 && <span className="rec-cost">${rec.cost_usd.toLocaleString()}</span>}
          {rec.cost_usd > 0 && (
            <span className="rec-ratio">{rec.hp_per_dollar.toFixed(3)} hp/$</span>
          )}
          <span className={`rec-toggle${open ? ' open' : ''}`}>▼</span>
        </div>
      </div>
      {open && (
        <div className="rec-body">
          {rec.reasoning && <p className="rec-reasoning">{rec.reasoning}</p>}
          {rec.explanation && <p className="rec-explanation">{rec.explanation}</p>}
          {rec.risk_flags.length > 0 && (
            <div className="risk-flags">
              {rec.risk_flags.map((f: RiskFlag) => (
                <div key={f.id} className={`risk-flag risk-${f.severity}`}>
                  <span className="risk-icon">
                    {f.severity === 'warning' ? '⚠' : f.severity === 'caution' ? '◆' : 'ℹ'}
                  </span>
                  {f.message}
                </div>
              ))}
            </div>
          )}
          {rec.parts.length > 0 && (
            <div className="rec-parts">
              <h4>Buy options</h4>
              {rec.parts.map((p: PartOption) => (
                <div key={p.name} className="part-row">
                  <div className="part-info">
                    <a
                      href={p.vendor_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="part-link"
                    >
                      {p.brand} — {p.name}
                    </a>
                    <span className="part-price">${p.price_usd}</span>
                  </div>
                  <ul className="part-pros">
                    {p.pros.map((pro) => <li key={pro}>{pro}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BuildPlanCard({ plan, targetHp }: { plan: BuildPlan; targetHp: number }) {
  return (
    <div className={`build-plan ${plan.reachable ? 'plan-reachable' : 'plan-unreachable'}`}>
      <div className="plan-header">
        <h3>{plan.reachable ? `Cheapest path to ${targetHp} whp` : 'Max reachable build'}</h3>
        <span className={`plan-badge ${plan.reachable ? 'badge-ok' : 'badge-fail'}`}>
          {plan.reachable ? '✓ Target reached' : '✗ Not reachable'}
        </span>
      </div>
      <p className="plan-message">{plan.message}</p>
      <div className="plan-steps">
        {plan.steps.map((step: BuildStep, i: number) => (
          <div key={i} className="plan-step">
            <span className="step-num">{i + 1}</span>
            <span className="step-mod">{humanizeMod(step.mod)}</span>
            <span className="step-whp">{step.cumulative_whp} whp / {step.cumulative_wtq} wtq</span>
            <span className="step-cost">{step.cost_usd === 0 ? 'free' : `$${step.cost_usd}`}</span>
          </div>
        ))}
      </div>
      <div className="plan-summary">
        <div className="plan-summary-row">
          <span className="plan-label">Final</span>
          <span className="plan-value">{plan.final_whp} whp / {plan.final_wtq} wtq</span>
        </div>
        <div className="plan-summary-row">
          <span className="plan-label">Total cost</span>
          <span className="plan-value plan-total-cost">${plan.total_cost_usd.toLocaleString()}</span>
        </div>
      </div>
      {plan.risk_flags.length > 0 && (
        <div className="risk-flags" style={{ padding: '0 1rem 1rem' }}>
          {plan.risk_flags.map((f: RiskFlag) => (
            <div key={f.id} className={`risk-flag risk-${f.severity}`}>
              <span className="risk-icon">
                {f.severity === 'warning' ? '⚠' : f.severity === 'caution' ? '◆' : 'ℹ'}
              </span>
              {f.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Advisor() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [chassis, setChassis] = useState(searchParams.get('chassis') ?? 'e92')
  const [year, setYear] = useState(parseInt(searchParams.get('year') ?? '2010'))
  const [fuel, setFuel] = useState(searchParams.get('fuel') ?? '93')
  const [fuelingHw, setFuelingHw] = useState(searchParams.get('fueling_hw') ?? 'stock_hpfp')
  const [tune, setTune] = useState(searchParams.get('tune') ?? 'stock')
  const [mods, setMods] = useState<Set<string>>(
    () => new Set((searchParams.get('mods') ?? '').split(',').filter(Boolean))
  )
  const [goal, setGoal] = useState(searchParams.get('goal') ?? 'max_power')
  const [targetHp, setTargetHp] = useState(parseInt(searchParams.get('target_hp') ?? '400'))

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecommendResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<GraphResponse | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function toggleMod(mod: string) {
    setMods((prev) => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
  }

  function buildParams() {
    const p: Record<string, string> = {
      chassis, year: String(year), fuel, fueling_hw: fuelingHw, tune, goal,
    }
    const modList = [...mods].join(',')
    if (modList) p.mods = modList
    if (goal === 'target_hp') p.target_hp = String(targetHp)
    return p
  }

  function copyShareLink() {
    const params = new URLSearchParams(buildParams())
    const url = `${window.location.origin}/advisor?${params.toString()}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Keep URL in sync with form so the page is always shareable
  useEffect(() => {
    setSearchParams(buildParams(), { replace: true })
  }, [chassis, year, fuel, fuelingHw, tune, mods, goal, targetHp])

  async function generateGraph() {
    setGraphLoading(true)
    setGraphError(null)
    try {
      const res = await fetch(`${API}/graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chassis, year, fuel, fueling_hw: fuelingHw, tune, mods: [...mods] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setGraphData(await res.json())
    } catch (e) {
      setGraphError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setGraphLoading(false)
    }
  }

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassis, year, fuel, fueling_hw: fuelingHw, tune,
          mods: [...mods], goal,
          target_hp: goal === 'target_hp' ? targetHp : undefined,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-content">
      <section className="config-card">
        <h2 className="section-heading">Your Build</h2>

        <div className="config-grid">
          <div className="field">
            <label>Chassis</label>
            <select value={chassis} onChange={(e) => setChassis(e.target.value)}>
              {CHASSIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Year</label>
            <input type="number" min={2007} max={2013} value={year}
              onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Fuel</label>
            <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
              {FUEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Fueling Hardware</label>
            <select value={fuelingHw} onChange={(e) => setFuelingHw(e.target.value)}>
              {FUELING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Tune</label>
          <select value={tune} onChange={(e) => setTune(e.target.value)}>
            {TUNE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Installed Mods</label>
          <div className="mod-chips">
            {BINARY_MODS.map((m) => (
              <button
                key={m.id}
                className={`mod-chip${mods.has(m.id) ? ' active' : ''}`}
                onClick={() => toggleMod(m.id)}
                type="button"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Goal</label>
          <div className="goal-pills">
            {GOALS.map((g) => (
              <button
                key={g.value}
                className={`goal-pill${goal === g.value ? ' active' : ''}`}
                onClick={() => setGoal(g.value)}
                type="button"
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {goal === 'target_hp' && (
          <div className="field field-narrow">
            <label>Target WHP</label>
            <input type="number" min={200} max={800} value={targetHp}
              onChange={(e) => setTargetHp(Number(e.target.value))} />
          </div>
        )}

        <div className="action-row">
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Calculating…' : 'Get Recommendations'}
          </button>
          <button className="btn-secondary" onClick={generateGraph} disabled={graphLoading}>
            {graphLoading ? 'Generating…' : 'Dyno Graph'}
          </button>
          <button className="btn-ghost" onClick={copyShareLink} title="Copy shareable link">
            {copied ? '✓ Copied!' : '🔗 Share Build'}
          </button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {graphError && <div className="error-banner">{graphError}</div>}

      {graphData && (
        <DynoGraph
          data={graphData.points}
          peakWhp={graphData.peak_whp}
          peakWtq={graphData.peak_wtq}
        />
      )}

      {result && (
        <section className="results-section">
          <div className="current-power">
            <div className="current-power-stats">
              <div className="current-stat">
                <span className="current-stat-num">{result.current_whp}</span>
                <span className="current-stat-label">WHP</span>
              </div>
              <span className="current-stat-sep">/</span>
              <div className="current-stat">
                <span className="current-stat-num current-wtq">{result.current_wtq}</span>
                <span className="current-stat-label">WTQ</span>
              </div>
              <span className="current-label">Current estimated output</span>
            </div>
            <span className="model-badge">{result.model}</span>
          </div>

          {result.build_plan && <BuildPlanCard plan={result.build_plan} targetHp={targetHp} />}

          {result.recommendations.length === 0 ? (
            <p className="no-recs">No further upgrades found for this build.</p>
          ) : (
            <>
              {result.build_plan && <p className="recs-subheader">All available upgrades</p>}
              {result.recommendations.map((rec, i) => <RecCard key={i} rec={rec} rank={i + 1} />)}
            </>
          )}

          <div className="accuracy-note">
            <span className="accuracy-icon">ℹ</span>
            Predictions are model-estimated from community dyno data. Real-world gains vary by
            car condition, altitude, fuel quality, and dyno type. Use as a planning guide,
            not a guarantee.
          </div>
        </section>
      )}
    </div>
  )
}
