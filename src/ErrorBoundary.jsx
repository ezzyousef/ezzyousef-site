import { Component } from 'react';

/**
 * Without this, any render error unmounts the whole page and leaves a blank
 * screen with no clue what happened. This shows the error instead.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Site error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error && this.state.error.message || this.state.error);
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999, overflow: 'auto',
        background: '#12171B', color: '#EAF1F5', padding: '28px',
        font: '15px/1.6 system-ui, sans-serif',
      }}>
        <h1 style={{ font: '600 20px/1.3 system-ui, sans-serif', margin: '0 0 12px' }}>
          Something broke while drawing the page
        </h1>
        <p style={{ margin: '0 0 18px', color: '#9FB2BD', maxWidth: '60ch' }}>
          This message replaces what used to be a blank screen. Copy the text below and send it
          to me, then reload the page.
        </p>
        <pre style={{
          background: '#0A0F12', border: '1px solid #2A363D', borderRadius: '8px',
          padding: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          font: '13px/1.5 ui-monospace, Consolas, monospace', color: '#F0A79E',
        }}>{msg}</pre>
        <p style={{ marginTop: '18px', fontSize: '13px', color: '#7E919C' }}>
          Build {typeof __BUILD__ === 'string' ? __BUILD__ : 'unknown'}
        </p>
        <button
          onClick={() => { window.location.hash = ''; window.location.reload(); }}
          style={{
            marginTop: '10px', background: '#4FC7E8', color: '#061318', border: 0,
            borderRadius: '100px', padding: '11px 20px', font: '600 14px system-ui, sans-serif',
            cursor: 'pointer',
          }}>
          Reload the site
        </button>
      </div>
    );
  }
}
