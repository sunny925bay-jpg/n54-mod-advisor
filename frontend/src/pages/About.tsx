import { useNavigate } from 'react-router-dom'

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="main-content">
      <article className="static-page">
        <header className="static-header">
          <h1 className="static-title">How It Works</h1>
          <p className="static-subtitle">
            The model, the data, and what these numbers actually mean
          </p>
        </header>

        <section className="static-section">
          <h2>What is N54 Mod Advisor?</h2>
          <p>
            N54 Mod Advisor is a data-driven tool that predicts horsepower and torque gains for
            BMW N54-powered vehicles (2007–2013). Instead of generic forum estimates like "a
            downpipe adds ~30whp," it uses a trained machine learning model to predict gains
            specific to <em>your</em> tune, fuel, and existing mods. The goal is to help you
            prioritize upgrades intelligently — not just by gut feel or marketing claims.
          </p>
        </section>

        <section className="static-section">
          <h2>The Model</h2>
          <p>
            Predictions are made by a <strong>LightGBM gradient-boosting regression model</strong>{' '}
            trained on real community dyno pulls. LightGBM is the same class of model used in
            competitive ML benchmarks — it handles the non-linear interaction effects in N54
            tuning (e.g., why a downpipe adds 40whp on a Stage 2 custom tune but only 15whp
            on a JB4 Stage 1) far better than a lookup table or linear regression.
          </p>
          <p>
            Two models are trained — one for WHP and one for WTQ — with features including
            chassis, model year, fuel type, fueling hardware, tune level, and installed bolt-ons.
            SHAP (SHapley Additive exPlanations) values are used to generate the per-upgrade
            reasoning text you see in each recommendation card.
          </p>
          <p className="static-note">
            If the trained model artifacts are unavailable (e.g., first deployment), the system
            automatically falls back to a baseline average-gain lookup table.
          </p>
        </section>

        <section className="static-section">
          <h2>Training Data</h2>
          <p>
            The model is trained on dyno results collected from the N54 community — forum
            threads, build logs, and shared dyno sheets. All values are wheel horsepower (WHP)
            and wheel torque (WTQ) measured on a Mustang AWD dyno unless noted otherwise.
            Data is filtered to remove obvious outliers (sensor errors, uncalibrated dynos).
          </p>
          <p>
            Because dyno data is inherently noisy (different dyno machines, weather conditions,
            gear used, car condition), the model learns the <em>expected distribution</em> of
            gains rather than memorizing individual pulls.
          </p>
        </section>

        <section className="static-section">
          <h2>WHP vs Crank HP</h2>
          <p>
            All numbers on this site are <strong>wheel horsepower (WHP)</strong> — measured at
            the wheels, after drivetrain losses. Crank horsepower (BHP/PS) is measured at the
            engine before those losses. For an N54 in a rear-wheel-drive chassis, drivetrain
            loss is typically 12–18%. For an xDrive AWD, it's higher.
          </p>
          <p>
            BMW's stock rating for the 335i is 300hp at the crank (~255–270 WHP). If the tool
            shows your stock build at ~260 WHP, that's accurate — not a low estimate.
          </p>
        </section>

        <section className="static-section">
          <h2>The Virtual Dyno</h2>
          <p>
            The dyno graph is a <strong>projected pull curve</strong>, not a measured one.
            The curve shape is templated from N54 twin-scroll turbo boost characteristics
            (rapid spool 2000–3000 rpm, flat plateau 3600–5200, power taper toward redline).
            The peaks — WHP and WTQ — are model-predicted for your specific build.
            Wheel torque follows the template directly; wheel horsepower is derived from
            WTQ × RPM / 5252, then rescaled so its peak matches the predicted WHP.
            This ensures the physics are physically consistent.
          </p>
        </section>

        <section className="static-section">
          <h2>Limitations</h2>
          <ul className="static-list">
            <li>Predictions are probabilistic. Individual cars vary due to condition, altitude, fuel batch, and dyno calibration.</li>
            <li>The model was trained on bolt-on N54 builds. Large turbo, forged motor, or radical fuel system setups are out of distribution.</li>
            <li>Downpipe gains assume a high-flow catted or catless unit. Stock cat replacements produce minimal gains.</li>
            <li>E85 predictions assume proper flex fuel sensor tuning is in place.</li>
            <li>The build planner uses a greedy algorithm — it finds a good path, not necessarily the globally optimal one.</li>
          </ul>
        </section>

        <div className="static-cta">
          <button className="btn-primary" onClick={() => navigate('/advisor')}>
            Try the Advisor
          </button>
          <button className="btn-secondary" onClick={() => navigate('/faq')}>
            Read the FAQ
          </button>
        </div>
      </article>
    </div>
  )
}
