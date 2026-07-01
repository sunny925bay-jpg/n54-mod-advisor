import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-wordmark">
            <span className="nav-n54">N54</span>
            <span className="nav-slash"> / </span>
            <span className="nav-rest">MOD ADVISOR</span>
          </span>
          <p className="footer-disclaimer">
            Projections are model-estimated from community dyno data and are not guaranteed.
            Real-world results vary by car condition, altitude, fuel quality, and dyno type.
            This tool is for educational and planning purposes only — not a substitute for a
            professional tune or mechanical inspection.
          </p>
        </div>

        <div className="footer-cols">
          <div className="footer-col">
            <span className="footer-col-heading">Tools</span>
            <Link to="/advisor" className="footer-link">Get Recommendations</Link>
            <Link to="/dyno" className="footer-link">Dyno Graph</Link>
          </div>
          <div className="footer-col">
            <span className="footer-col-heading">Info</span>
            <Link to="/about" className="footer-link">How it works</Link>
            <Link to="/faq" className="footer-link">FAQ</Link>
            <Link to="/changelog" className="footer-link">Changelog</Link>
          </div>
          <div className="footer-col">
            <span className="footer-col-heading">Project</span>
            <a
              href="https://github.com/sunny925bay-jpg/n54-mod-advisor"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-meta">Model v0.5.0 · LightGBM · BMW N54 2007–2013</span>
        <span className="footer-meta">For informational purposes only</span>
      </div>
    </footer>
  )
}
