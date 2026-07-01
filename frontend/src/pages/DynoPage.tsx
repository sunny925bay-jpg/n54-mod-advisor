import { useState } from 'react'
import DynoGraph from '../components/DynoGraph'
import {
  API, CHASSIS_OPTIONS, FUEL_OPTIONS, FUELING_OPTIONS,
  TUNE_OPTIONS, BINARY_MODS,
} from '../constants'
import type { GraphResponse } from '../types'

export default function DynoPage() {
  const [chassis, setChassis] = useState('e92')
  const [year, setYear] = useState(2010)
  const [fuel, setFuel] = useState('93')
  const [fuelingHw, setFuelingHw] = useState('stock_hpfp')
  const [tune, setTune] = useState('stock')
  const [mods, setMods] = useState<Set<string>>(new Set())
  const [graphData, setGraphData] = useState<GraphResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleMod(mod: string) {
    setMods((prev) => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chassis, year, fuel, fueling_hw: fuelingHw, tune, mods: [...mods] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setGraphData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-content">
      <section className="config-card">
        <h2 className="section-heading">Build Config</h2>

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

        <div className="action-row">
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate Dyno Graph'}
          </button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {graphData && (
        <DynoGraph
          data={graphData.points}
          peakWhp={graphData.peak_whp}
          peakWtq={graphData.peak_wtq}
        />
      )}

      {!graphData && !loading && (
        <div className="dyno-placeholder">
          <p>Configure your build above and click <strong>Generate Dyno Graph</strong> to see a projected pull curve.</p>
          <p className="dyno-placeholder-sub">Curve shape is derived from N54 twin-scroll boost characteristics; peaks are model-predicted.</p>
        </div>
      )}
    </div>
  )
}
