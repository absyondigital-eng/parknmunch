import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error boundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <div style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '24px' }}>
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#9333ea',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 24px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
