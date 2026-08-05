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
    localStorage.clear();
    window.location.reload();
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
            maxWidth: '480px',
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
              พบบางข้อมูลแคชในบราวเซอร์ถูกอัปเดต กดปุ่มรีเซ็ตด้านล่างเพื่อเข้าใช้งานระบบบัญชีเวอร์ชันล่าสุดได้ทันที
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                onClick={this.handleReset} 
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                🧹 รีเซ็ตระบบ & เข้าสู่หน้าหลัก
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
