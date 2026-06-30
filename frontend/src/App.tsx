import { useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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
  risk_score: number
}

interface RecommendResponse {
  current_whp: number
  current_wtq: number
  model: string
  recommendations: Recommendation[]
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

function RecCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rec-card">
      <div className="rec-header" onClick={() => setOpen(!open)}>
        <div className="rec-title">
          <span className="rec-mod">{rec.mod}</span>
          <span className="rec-gains">
            +{rec.predicted_whp_gain} whp / +{rec.predicted_wtq_gain} wtq
          </span>
        </div>
        <div className="rec-meta">
          {rec.cost_usd > 0 && <span className="rec-cost">${rec.cost_usd}</span>}
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

  function toggleMod(mod: string) {
    setMods((prev) => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
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
    <div className="app">
      <header className="app-header">
        <h1>N54 Mod Advisor</h1>
        <p>Enter your build to get ranked mod recommendations with predicted whp/tq gain.</p>
      </header>

      <main>
        <section className="form-section">
          <div className="form-row">
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
          </div>

          <div className="form-row">
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
            <div className="checkboxes">
              {BINARY_MODS.map((m) => (
                <label key={m.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={mods.has(m.id)}
                    onChange={() => toggleMod(m.id)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Goal</label>
            <div className="goal-buttons">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  className={`goal-btn${goal === g.value ? ' active' : ''}`}
                  onClick={() => setGoal(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {goal === 'target_hp' && (
            <div className="field">
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

          <button className="submit-btn" onClick={submit} disabled={loading}>
            {loading ? 'Calculating...' : 'Get Recommendations'}
          </button>
        </section>

        {error && <div className="error">{error}</div>}

        {result && (
          <section className="results-section">
            <div className="current-power">
              <span>
                Current: <strong>{result.current_whp} whp</strong> /{' '}
                <strong>{result.current_wtq} wtq</strong>
              </span>
              <span className="model-badge">{result.model}</span>
            </div>
            {result.recommendations.length === 0 ? (
              <p className="no-recs">No further upgrades found for this build.</p>
            ) : (
              result.recommendations.map((rec, i) => <RecCard key={i} rec={rec} />)
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
