import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="app-layout-guest">
        <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <h2 className="section-title">Something went wrong</h2>
          <p className="section-subtitle" style={{ margin: '8px 0 20px' }}>
            The page hit an unexpected error. Reloading usually fixes it.
          </p>
          <button className="btn btn-gradient" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}

