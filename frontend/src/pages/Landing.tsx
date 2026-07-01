import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// Computed from N54 dyno curve formula at 420 whp / 445 wtq (Stage 2+ example build)
const SAMPLE_DYNO = [
  { rpm: 2000, whp: 48,  wtq: 125 },
  { rpm: 2500, whp: 155, wtq: 327 },
  { rpm: 3000, whp: 242, wtq: 423 },
  { rpm: 3400, whp: 283, wtq: 437 },
  { rpm: 3600, whp: 305, wtq: 445 },
  { rpm: 4000, whp: 335, wtq: 440 },
  { rpm: 4500, whp: 372, wtq: 434 },
  { rpm: 5000, whp: 407, wtq: 428 },
  { rpm: 5200, whp: 420, wtq: 425 },
  { rpm: 5500, whp: 407, wtq: 389 },
  { rpm: 6000, whp: 374, wtq: 327 },
  { rpm: 6500, whp: 339, wtq: 274 },
  { rpm: 7000, whp: 294, wtq: 220 },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-headline">
          <h1 className="hero-title">
            Every mod ranked.<br />Every dollar justified.
          </h1>
          <p className="hero-sub">
            ML-powered mod advice for the BMW N54 — precise gain predictions,
            build cost analysis, and risk flags before you buy anything.
          </p>
        </div>

        <div className="hero-visuals">
          {/* Car photo — place your E92 image at /public/hero-e92.jpg */}
          <div className="hero-car">
            <img
              src="/hero-e92.jpg"
              alt="Modified BMW E92 335i"
              className="hero-car-img"
            />
            <div className="hero-car-gradient" />
            <span className="hero-car-caption">E92 335i · Stage 2+ build</span>
          </div>

          {/* Sample dyno graph */}
          <div className="hero-dyno">
            <div className="hero-dyno-header">
              <div className="hero-dyno-peaks">
                <span className="hero-dyno-stat hero-dyno-whp">420 <em>WHP</em></span>
                <span className="hero-dyno-sep">/</span>
                <span className="hero-dyno-stat hero-dyno-wtq">445 <em>WTQ</em></span>
              </div>
              <span className="hero-dyno-label">MHD S2+ · DP · FMIC · 93oct</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={SAMPLE_DYNO} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2538" />
                <XAxis
                  dataKey="rpm"
                  type="number"
                  domain={[2000, 7000]}
                  tickCount={6}
                  tickFormatter={(v) => `${v / 1000}k`}
                  stroke="#28334A"
                  tick={{ fill: '#4B5675', fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 500]}
                  stroke="#28334A"
                  tick={{ fill: '#4B5675', fontSize: 10 }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0C0F18',
                    border: '1px solid #1E2538',
                    color: '#F1F5F9',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                  }}
                  labelFormatter={(rpm) => `${rpm} rpm`}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94A3B8' }} />
                <Line type="monotone" dataKey="whp" stroke="#3B82F6" dot={false} strokeWidth={2} name="WHP" />
                <Line type="monotone" dataKey="wtq" stroke="#F97316" dot={false} strokeWidth={2} name="WTQ" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hero-ctas">
          <button className="btn-primary btn-lg" onClick={() => navigate('/advisor')}>
            Get Recommendations
          </button>
          <button className="btn-secondary btn-lg" onClick={() => navigate('/dyno')}>
            Dyno Graph
          </button>
        </div>
      </section>

      {/* ── Description ── */}
      <section className="landing-about">
        <div className="landing-about-inner">
          <h2 className="landing-section-title">What is N54 Mod Advisor?</h2>
          <p className="landing-about-text">
            N54 Mod Advisor is a data-driven tool built specifically for BMW N54 owners who want
            to make smarter modding decisions. Under the hood, it uses a{' '}
            <strong>LightGBM gradient-boosting model</strong> trained on hundreds of real community
            dyno pulls — giving you precise wheel horsepower and wheel torque predictions for any
            combination of tune, fuel, fueling hardware, and bolt-ons. Enter your current build
            and goal (max power, best value, reliability, or a specific target WHP), and the tool
            returns a ranked list of upgrades with predicted gains, cost-per-horsepower ratios,
            risk flags, and a greedy build plan that finds the cheapest path to your target.
            The virtual dyno feature generates a projected pull curve shaped from N54 twin-scroll
            boost characteristics, scaled to model-predicted peaks — so you can visualize the
            powerband before you touch a wrench.
          </p>

          <div className="landing-feature-grid">
            <div className="landing-feature">
              <span className="landing-feature-icon">⚡</span>
              <strong>Gain predictions</strong>
              <span>WHP and WTQ delta for every available mod on your exact build</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">💰</span>
              <strong>Cost analysis</strong>
              <span>hp-per-dollar ranking and curated part links with prices</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">⚠</span>
              <strong>Risk engine</strong>
              <span>Flags unsafe combinations before you commit — HPFP limits, fuel safety, tune compatibility</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">🗺</span>
              <strong>Build planner</strong>
              <span>Greedy path-finding that sequences mods from your current state to your target WHP</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">📈</span>
              <strong>Virtual dyno</strong>
              <span>Projected pull curve shaped from N54 twin-scroll behavior, scaled to predicted peaks</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">🔗</span>
              <strong>Shareable builds</strong>
              <span>Every build encodes into a URL you can save or send to your tuner</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="landing-cta-bar">
        <p className="landing-cta-text">Ready to map your build?</p>
        <div className="hero-ctas">
          <button className="btn-primary btn-lg" onClick={() => navigate('/advisor')}>
            Get Recommendations
          </button>
          <button className="btn-secondary btn-lg" onClick={() => navigate('/dyno')}>
            Dyno Graph
          </button>
        </div>
      </section>
    </div>
  )
}
