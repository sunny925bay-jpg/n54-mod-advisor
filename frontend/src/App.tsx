import { Routes, Route } from 'react-router-dom'
import './App.css'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Advisor from './pages/Advisor'
import DynoPage from './pages/DynoPage'
import About from './pages/About'
import FAQ from './pages/FAQ'
import Changelog from './pages/Changelog'

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/advisor" element={<Advisor />} />
        <Route path="/dyno" element={<DynoPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/changelog" element={<Changelog />} />
      </Routes>
      <Footer />
    </div>
  )
}
