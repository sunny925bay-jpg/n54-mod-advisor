import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

export default function Nav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  function closeDrawer() { setDrawerOpen(false) }

  return (
    <>
      <nav className="top-nav">
        <div className="nav-inner">
          <Link to="/" className="nav-wordmark" onClick={closeDrawer}>
            <span className="nav-n54">N54</span>
            <span className="nav-slash"> / </span>
            <span className="nav-rest">MOD ADVISOR</span>
          </Link>

          <div className="nav-links">
            <NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              About
            </NavLink>
            <NavLink to="/faq" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              FAQ
            </NavLink>
            <NavLink to="/changelog" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Changelog
            </NavLink>
          </div>

          <div className="nav-ctas">
            <button className="nav-btn-secondary" onClick={() => navigate('/dyno')}>
              Dyno Graph
            </button>
            <button className="nav-btn-primary" onClick={() => navigate('/advisor')}>
              Get Recommendations
            </button>
          </div>

          <button
            className="nav-hamburger"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line${drawerOpen ? ' open' : ''}`} />
            <span className={`hamburger-line${drawerOpen ? ' open' : ''}`} />
            <span className={`hamburger-line${drawerOpen ? ' open' : ''}`} />
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="nav-wordmark">
                <span className="nav-n54">N54</span>
                <span className="nav-slash"> / </span>
                <span className="nav-rest">MOD ADVISOR</span>
              </span>
              <button className="drawer-close" onClick={closeDrawer}>✕</button>
            </div>
            <div className="drawer-links">
              <Link to="/advisor" className="drawer-link" onClick={closeDrawer}>Get Recommendations</Link>
              <Link to="/dyno" className="drawer-link" onClick={closeDrawer}>Dyno Graph</Link>
              <div className="drawer-divider" />
              <Link to="/about" className="drawer-link drawer-link-muted" onClick={closeDrawer}>About</Link>
              <Link to="/faq" className="drawer-link drawer-link-muted" onClick={closeDrawer}>FAQ</Link>
              <Link to="/changelog" className="drawer-link drawer-link-muted" onClick={closeDrawer}>Changelog</Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
