import { AccidentProvider } from './store/AccidentStore'
import StatusHeader from './components/StatusHeader'
import MapView from './components/MapView'
import AlertSidebar from './components/AlertSidebar'
import './App.css'

function App() {
  return (
    <AccidentProvider>
      <div className="app-shell">
        <StatusHeader />

        <main className="dashboard-grid">
          <section className="panel map-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Live incident mapping</p>
                <h1>Visual highway intelligence</h1>
              </div>
            </div>
            <MapView />
          </section>

          <section className="panel sidebar-panel-wrapper">
            <AlertSidebar />
          </section>
        </main>
      </div>
    </AccidentProvider>
  )
}

export default App
