function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>N54 Mod Advisor</h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        Enter your build → get ranked mod recommendations with predicted whp / tq gain.
      </p>
      <hr style={{ margin: '1.5rem 0' }} />
      <p style={{ color: '#888', fontSize: '0.85rem' }}>
        Backend: stub &nbsp;·&nbsp; Model: baseline lookup (coming next)
      </p>
    </div>
  )
}

export default App
