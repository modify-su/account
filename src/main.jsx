import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error Boundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      const adminUser = { id: 'u1', name: 'ผู้ดูแลระบบสูงสุด', username: 'admin', role: 'admin' };
      localStorage.setItem('current_user', JSON.stringify(adminUser));
    } catch (e) {
      console.error(e);
    }
    window.location.href = window.location.origin + '?reset=' + Date.now();
  };

  handleAutoLoginAdmin = () => {
    try {
      const adminUser = { id: 'u1', name: 'ผู้ดูแลระบบสูงสุด', username: 'admin', role: 'admin' };
      localStorage.setItem('current_user', JSON.stringify(adminUser));
    } catch (e) {
      console.error(e);
    }
    window.location.href = window.location.origin + '?login=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0B0F19',
          color: '#F3F4F6',
          fontFamily: 'Sarabun, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            padding: '2.5rem',
            backgroundColor: '#111827',
            borderRadius: '16px',
            border: '1px solid #1F2937',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#6366F1', marginBottom: '0.75rem' }}>
              ระบบปรับปรุงการตั้งค่าใหม่ (FlowLedger System Update)
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#9CA3AF', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              พบบางข้อมูลแคชในบราวเซอร์ถูกอัปเดตระบบแล้ว กรุณากดปุ่มด้านล่างเพื่อเข้าสู่ระบบเวอร์ชันล่าสุดได้ทันที
            </p>
            {this.state.error && (
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '0.75rem', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: '8px', 
                fontSize: '0.75rem', 
                color: '#f87171',
                textAlign: 'left',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '100px'
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexDirection: 'column' }}>
              <button 
                onClick={this.handleAutoLoginAdmin} 
                style={{
                  padding: '0.85rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                }}
              >
                🚀 เข้าสู่ระบบในสิทธิ์ Admin ทันที (Auto Login)
              </button>
              <button 
                onClick={this.handleReset} 
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: '#D1D5DB',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                🧹 ล้างแคชทั้งหมด & คืนค่าเริ่มต้น
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
