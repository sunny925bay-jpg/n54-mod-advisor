import { useState } from 'react'
import './App.css'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface GraphPoint {
  rpm: number
  whp: number
  wtq: number
}

interface GraphResponse {
  peak_whp: number
  peak_wtq: number
  points: GraphPoint[]
}

interface RiskFlag {
  id: string
  severity: 'info' | 'caution' | 'warning'
  message: string
}

interface PartOption {
  brand: string
  name: string
  price_usd: number
  vendor_url: string
  pros: string[]
  cons: string[]
}

interface Recommendation {
  mod: string
  predicted_whp_gain: number
  predicted_wtq_gain: number
  cost_usd: number
  hp_per_dollar: number
  reasoning: string
  explanation: string
  parts: PartOption[]
  risk_flags: RiskFlag[]
  risk_score: number
}

interface BuildStep {
  mod: string
  cumulative_whp: number
  cumulative_wtq: number
  cost_usd: number
}

interface BuildPlan {
  steps: BuildStep[]
  final_whp: number
  final_wtq: number
  total_cost_usd: number
  risk_flags: RiskFlag[]
  reachable: boolean
  message: string
}

interface RecommendResponse {
  current_whp: number
  current_wtq: number
  model: string
  recommendations: Recommendation[]
  build_plan?: BuildPlan
}

const CHASSIS_OPTIONS = [
  { value: 'e92', label: 'E92 335i (coupe)' },
  { value: 'e90', label: 'E90 335i (sedan)' },
  { value: 'e93', label: 'E93 335i (vert)' },
  { value: 'e82', label: 'E82 135i (coupe)' },
  { value: 'e88', label: 'E88 135i (vert)' },
  { value: 'e89', label: 'E89 Z4 35i' },
  { value: 'f10', label: 'F10 535i' },
]

const FUEL_OPTIONS = [
  { value: '91', label: '91 oct' },
  { value: '93', label: '93 oct' },
  { value: 'e30', label: 'E30' },
  { value: 'e50', label: 'E50' },
  { value: 'e85', label: 'E85' },
]

const FUELING_OPTIONS = [
  { value: 'stock_hpfp', label: 'Stock HPFP' },
  { value: 'upg_hpfp', label: 'Upgraded HPFP' },
  { value: 'meth', label: 'Meth Injection' },
  { value: 'port_inj', label: 'Port Injection' },
  { value: 'port_inj_meth', label: 'Port Inj + Meth' },
]

const TUNE_OPTIONS = [
  { value: 'stock', label: 'Stock' },
  { value: 'jb4_s1', label: 'JB4 Stage 1' },
  { value: 'mhd_s1', label: 'MHD Stage 1' },
  { value: 'jb4_s2', label: 'JB4 Stage 2' },
  { value: 'mhd_s2', label: 'MHD Stage 2' },
  { value: 'mhd_s2plus', label: 'MHD Stage 2+' },
  { value: 'mhd_custom', label: 'MHD Custom' },
  { value: 'cobb', label: 'COBB' },
  { value: 'custom', label: 'Custom' },
]

const BINARY_MODS = [
  { id: 'downpipe', label: 'Downpipe' },
  { id: 'charge_pipes', label: 'Charge Pipes' },
  { id: 'intercooler', label: 'Intercooler' },
  { id: 'intake', label: 'Intake' },
  { id: 'catback', label: 'Cat-back' },
  { id: 'bov_delete', label: 'BOV Delete' },
  { id: 'oil_cooler', label: 'Oil Cooler' },
]

const GOALS = [
  { value: 'max_power', label: 'Max Power' },
  { value: 'best_value', label: 'Best Value' },
  { value: 'reliability', label: 'Reliability' },
  { value: 'target_hp', label: 'Target HP' },
]

const MOD_NAMES: Record<string, string> = {
  downpipe: 'Downpipe',
  charge_pipes: 'Charge Pipes',
  intercooler: 'Intercooler',
  intake: 'Intake',
  catback: 'Cat-back Exhaust',
  bov_delete: 'BOV Delete',
  oil_cooler: 'Oil Cooler',
  jb4_s1: 'JB4 Stage 1',
  jb4_s2: 'JB4 Stage 2',
  mhd_s1: 'MHD Stage 1',
  mhd_s2: 'MHD Stage 2',
  mhd_s2plus: 'MHD Stage 2+',
  mhd_custom: 'MHD Custom',
  cobb: 'COBB',
  custom: 'Custom Tune',
  upg_hpfp: 'Upgraded HPFP',
  port_inj: 'Port Injection',
  meth: 'Meth Injection',
  port_inj_meth: 'Port Inj + Meth',
}

function humanizeMod(mod: string): string {
  if (mod.startsWith('tune → ')) {
    const key = mod.replace('tune → ', '')
    return `${MOD_NAMES[key] ?? key} Tune`
  }
  if (mod.startsWith('fuel → ')) {
    const fuel = mod.replace('fuel → ', '').toUpperCase()
    return `Switch to ${fuel}`
  }
  if (mod.startsWith('fueling → ')) {
    const key = mod.replace('fueling → ', '')
    return MOD_NAMES[key] ?? key
  }
  return MOD_NAMES[mod] ?? mod
}

function worstSeverity(flags: RiskFlag[]): 'warning' | 'caution' | 'info' | null {
  if (flags.some(f => f.severity === 'warning')) return 'warning'
  if (flags.some(f => f.severity === 'caution')) return 'caution'
  if (flags.some(f => f.severity === 'info')) return 'info'
  return null
}

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
              {rec.risk_flags.map((f) => (
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
              {rec.parts.map((p) => (
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
                    {p.pros.map((pro) => (
                      <li key={pro}>{pro}</li>
                    ))}
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

function DynoGraph({ data, peakWhp, peakWtq }: { data: GraphPoint[]; peakWhp: number; peakWtq: number }) {
  const yMin = Math.floor(Math.min(...data.map(d => Math.min(d.whp, d.wtq))) / 50) * 50
  const yMax = Math.ceil(Math.max(...data.map(d => Math.max(d.whp, d.wtq))) / 50) * 50

  return (
    <div className="dyno-graph">
      <div className="dyno-header">
        <div className="dyno-title">
          <h3>Projected Dyno</h3>
          <span className="dyno-projection-label">PROJECTION — templated curve, model-predicted peaks</span>
        </div>
        <div className="dyno-peaks-row">
          <div className="dyno-stat">
            <span className="dyno-stat-num dyno-whp-num">{peakWhp}</span>
            <span className="dyno-stat-label">WHP</span>
          </div>
          <div className="dyno-stat-div" />
          <div className="dyno-stat">
            <span className="dyno-stat-num dyno-wtq-num">{peakWtq}</span>
            <span className="dyno-stat-label">WTQ</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2538" />
          <XAxis
            dataKey="rpm"
            type="number"
            domain={[2000, 7000]}
            tickCount={6}
            tickFormatter={(v) => `${v / 1000}k`}
            stroke="#28334A"
            tick={{ fill: '#4B5675', fontSize: 11 }}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#28334A"
            tick={{ fill: '#4B5675', fontSize: 11 }}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: '#0C0F18',
              border: '1px solid #1E2538',
              color: '#F1F5F9',
              fontSize: '0.8rem',
              borderRadius: '6px',
            }}
            labelFormatter={(rpm) => `${rpm} rpm`}
          />
          <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#94A3B8' }} />
          <Line type="monotone" dataKey="whp" stroke="#3B82F6" dot={false} strokeWidth={2} name="WHP" />
          <Line type="monotone" dataKey="wtq" stroke="#F97316" dot={false} strokeWidth={2} name="WTQ" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function BuildPlanCard({ plan, targetHp }: { plan: BuildPlan; targetHp: number }) {
  return (
    <div className={`build-plan ${plan.reachable ? 'plan-reachable' : 'plan-unreachable'}`}>
      <div className="plan-header">
        <h3>
          {plan.reachable ? `Cheapest path to ${targetHp} whp` : `Max reachable build`}
        </h3>
        <span className={`plan-badge ${plan.reachable ? 'badge-ok' : 'badge-fail'}`}>
          {plan.reachable ? '✓ Target reached' : '✗ Not reachable'}
        </span>
      </div>
      <p className="plan-message">{plan.message}</p>

      <div className="plan-steps">
        {plan.steps.map((step, i) => (
          <div key={i} className="plan-step">
            <span className="step-num">{i + 1}</span>
            <span className="step-mod">{humanizeMod(step.mod)}</span>
            <span className="step-whp">
              {step.cumulative_whp} whp / {step.cumulative_wtq} wtq
            </span>
            <span className="step-cost">
              {step.cost_usd === 0 ? 'free' : `$${step.cost_usd}`}
            </span>
          </div>
        ))}
      </div>

      <div className="plan-summary">
        <div className="plan-summary-row">
          <span className="plan-label">Final</span>
          <span className="plan-value">
            {plan.final_whp} whp / {plan.final_wtq} wtq
          </span>
        </div>
        <div className="plan-summary-row">
          <span className="plan-label">Total cost</span>
          <span className="plan-value plan-total-cost">
            ${plan.total_cost_usd.toLocaleString()}
          </span>
        </div>
      </div>

      {plan.risk_flags.length > 0 && (
        <div className="risk-flags" style={{ padding: '0 1rem 1rem' }}>
          {plan.risk_flags.map((f) => (
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

function App() {
  const [chassis, setChassis] = useState('e92')
  const [year, setYear] = useState(2010)
  const [fuel, setFuel] = useState('93')
  const [fuelingHw, setFuelingHw] = useState('stock_hpfp')
  const [tune, setTune] = useState('stock')
  const [mods, setMods] = useState<Set<string>>(new Set())
  const [goal, setGoal] = useState('max_power')
  const [targetHp, setTargetHp] = useState(400)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecommendResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<GraphResponse | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState<string | null>(null)

  function toggleMod(mod: string) {
    setMods((prev) => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
  }

  async function generateGraph() {
    setGraphLoading(true)
    setGraphError(null)
    try {
      const res = await fetch(`${API}/graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chassis, year, fuel,
          fueling_hw: fuelingHw,
          tune,
          mods: [...mods],
        }),
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
          chassis,
          year,
          fuel,
          fueling_hw: fuelingHw,
          tune,
          mods: [...mods],
          goal,
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
    <div className="app-shell">
      <nav className="top-nav">
        <div className="nav-inner">
          <span className="nav-wordmark">
            <span className="nav-n54">N54</span>
            <span className="nav-slash"> / </span>
            <span className="nav-rest">MOD ADVISOR</span>
          </span>
          <span className="nav-tag">BMW N54 · 2007–2013</span>
        </div>
      </nav>

      <main className="main-content">
        <section className="config-card">
          <h2 className="section-heading">Your Build</h2>

          <div className="config-grid">
            <div className="field">
              <label>Chassis</label>
              <select value={chassis} onChange={(e) => setChassis(e.target.value)}>
                {CHASSIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Year</label>
              <input
                type="number"
                min={2007}
                max={2013}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Fuel</label>
              <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
                {FUEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fueling Hardware</label>
              <select value={fuelingHw} onChange={(e) => setFuelingHw(e.target.value)}>
                {FUELING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Tune</label>
            <select value={tune} onChange={(e) => setTune(e.target.value)}>
              {TUNE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
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
              <input
                type="number"
                min={200}
                max={800}
                value={targetHp}
                onChange={(e) => setTargetHp(Number(e.target.value))}
              />
            </div>
          )}

          <div className="action-row">
            <button className="btn-primary" onClick={submit} disabled={loading}>
              {loading ? 'Calculating…' : 'Get Recommendations'}
            </button>
            <button className="btn-secondary" onClick={generateGraph} disabled={graphLoading}>
              {graphLoading ? 'Generating…' : 'Dyno Graph'}
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

            {result.build_plan && (
              <BuildPlanCard plan={result.build_plan} targetHp={targetHp} />
            )}

            {result.recommendations.length === 0 ? (
              <p className="no-recs">No further upgrades found for this build.</p>
            ) : (
              <>
                {result.build_plan && (
                  <p className="recs-subheader">All available upgrades</p>
                )}
                {result.recommendations.map((rec, i) => (
                  <RecCard key={i} rec={rec} rank={i + 1} />
                ))}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
