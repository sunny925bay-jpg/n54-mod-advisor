import { useState } from 'react'

interface FAQItem {
  q: string
  a: string | JSX.Element
}

const FAQS: FAQItem[] = [
  {
    q: "What's the difference between JB4 and MHD?",
    a: `The JB4 is a piggyback tune — it intercepts boost and sensor signals to fool the ECU into running more boost without modifying the ECU directly. It's easy to install and remove, making it popular for leased cars or those who want a reversible option. MHD is a full ECU flash — it rewrites the engine control maps directly, allowing for more precise fueling, ignition, and boost targets. MHD Stage 2 and above typically make more power than JB4 Stage 2 on the same hardware, but the ECU needs to be flashed back to stock for dealership visits.`,
  },
  {
    q: 'Is E85 safe on a stock HPFP?',
    a: `No. E85 requires significantly more fuel volume than pump gas (roughly 35–40% more) because ethanol has lower energy density. The stock N54 High Pressure Fuel Pump (HPFP) cannot flow enough volume to support E85 at high load — you'll go lean and risk detonation or engine damage. E85 requires either an upgraded HPFP (e.g., Pure Stage 2) or a port injection setup. Running E30–E50 blends is possible on an upgraded HPFP and proper tune, but full E85 demands port injection or an equivalent high-flow fueling solution.`,
  },
  {
    q: "What does 'hp/$' mean?",
    a: `hp/$ (horsepower per dollar) is the ratio of predicted WHP gain to part cost. It's used to rank mods by efficiency: a $200 BOV delete that adds 8 whp is 0.04 hp/$, while a $1,200 FMIC that adds 25 whp is 0.021 hp/$. Higher is better if your goal is maximum gain per dollar spent. When the goal is set to "Best Value," recommendations are sorted by this ratio. Note that some mods (like a downpipe) have a low hp/$ ratio but unlock disproportionate gains from other mods — context matters.`,
  },
  {
    q: 'How accurate are the predictions?',
    a: `The model is trained on real community dyno data and uses non-linear gradient boosting to capture interaction effects between mods. In testing, predictions for common build configurations (Stage 1/2 tune with standard bolt-ons) are typically within ±15–25 WHP of real pulls. Less common configurations (E85, port injection, unusual chassis) have higher variance due to less training data. The model is a planning tool, not a guarantee — treat it as a well-informed estimate, not a dyno substitute.`,
  },
  {
    q: 'What is a downpipe, and why is it such a big gain?',
    a: `The downpipe connects the twin turbos to the rest of the exhaust. The stock unit has a catalytic converter with restrictive metallic substrate that creates backpressure, limiting turbo spool and top-end flow. A high-flow catted or catless aftermarket downpipe dramatically reduces this backpressure, letting the turbos spool faster and breathe more freely at high RPM. On a Stage 2 tune specifically calibrated for a downpipe, gains of 25–45 WHP are typical. Without a matching tune remap, the gains are much smaller — which is why the tool flags downpipe + stock/S1 tune combinations.`,
  },
  {
    q: "What does 'Stage 1' vs 'Stage 2' mean?",
    a: `Stage 1 is a tune that runs on stock hardware with no additional hardware modifications required — just the flash/piggyback. Stage 2 is a tune designed to work with a downpipe and potentially upgraded charge pipes; it runs higher boost and more aggressive fueling maps. Stage 2+ and MHD Custom go further — they're typically used with upgraded fueling hardware (HPFP, port injection), ethanol, or intercooler upgrades. The stages aren't standardized across tuners, so JB4 Stage 2 and MHD Stage 2 have different strategies despite the same label.`,
  },
  {
    q: 'What are charge pipes, and do I need them?',
    a: `Charge pipes carry compressed air from the turbos to the intercooler and intercooler to the intake. The stock plastic pipes are prone to cracking under higher boost pressure — common failure points for Stage 2+ builds. Aluminum aftermarket charge pipes won't add significant power on their own (the tool shows minimal direct gains), but they're a reliability prerequisite for running elevated boost. If you're on Stage 2 or above, charge pipes are a relatively cheap insurance policy.`,
  },
  {
    q: 'Can I run E85 with a JB4?',
    a: `Not directly. The JB4 doesn't rewrite fueling maps — it manipulates sensor signals. Without a proper flex fuel tune, the ECU's fueling tables won't compensate correctly for E85's lower energy density. JB4 does offer a "JB4 Connect" integration and some E blend support when paired with MHD, but pure E85 on JB4 alone is not safe. If you want ethanol, a full MHD flash with a proper flex fuel map (or a custom tune) is the right path.`,
  },
  {
    q: 'Why does the dyno graph say "projection"?',
    a: `The dyno graph shows a projected pull curve — not a measured one. The curve shape is a template derived from N54 twin-scroll turbo behavior (boost spool rate, plateau, taper), and the peak WHP and WTQ numbers are predicted by the ML model for your specific build. Real dynos vary significantly based on temperature, altitude, dyno brand (Mustang, Dynapack, Dynojet), gear used, and how the operator pulls. Think of it as a visualization of the model's prediction, not a substitute for an actual dyno session.`,
  },
]

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{item.q}</span>
        <span className={`faq-chevron${open ? ' open' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="faq-answer">
          {typeof item.a === 'string' ? <p>{item.a}</p> : item.a}
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <div className="main-content">
      <article className="static-page">
        <header className="static-header">
          <h1 className="static-title">FAQ</h1>
          <p className="static-subtitle">Common questions about the N54, tuning, and how the tool works</p>
        </header>
        <div className="faq-list">
          {FAQS.map((item, i) => <FAQAccordion key={i} item={item} />)}
        </div>
      </article>
    </div>
  )
}
