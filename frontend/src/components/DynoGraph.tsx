import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { GraphPoint } from '../types'

interface Props {
  data: GraphPoint[]
  peakWhp: number
  peakWtq: number
  height?: number
  compact?: boolean
}

export default function DynoGraph({ data, peakWhp, peakWtq, height = 260, compact = false }: Props) {
  const yMin = Math.floor(Math.min(...data.map(d => Math.min(d.whp, d.wtq))) / 50) * 50
  const yMax = Math.ceil(Math.max(...data.map(d => Math.max(d.whp, d.wtq))) / 50) * 50

  return (
    <div className="dyno-graph">
      <div className="dyno-header">
        {!compact && (
          <div className="dyno-title">
            <h3>Projected Dyno</h3>
            <span className="dyno-projection-label">PROJECTION — templated curve, model-predicted peaks</span>
          </div>
        )}
        <div className={`dyno-peaks-row${compact ? ' dyno-peaks-compact' : ''}`}>
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
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            dataKey="rpm"
            type="number"
            domain={[2000, 7000]}
            tickCount={6}
            tickFormatter={(v) => `${v / 1000}k`}
            stroke="#333"
            tick={{ fill: '#666', fontSize: 11 }}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#333"
            tick={{ fill: '#666', fontSize: 11 }}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: '#0d0d0d',
              border: '1px solid #222',
              color: '#f0f0f0',
              fontSize: '0.8rem',
              borderRadius: '0',
            }}
            labelFormatter={(rpm) => `${rpm} rpm`}
          />
          <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#888' }} />
          <Line type="monotone" dataKey="whp" stroke="#1766D6" dot={false} strokeWidth={2} name="WHP" />
          <Line type="monotone" dataKey="wtq" stroke="#CC0000" dot={false} strokeWidth={2} name="WTQ" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
