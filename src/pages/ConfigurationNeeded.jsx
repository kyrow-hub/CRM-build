import { AlertTriangle } from 'lucide-react'
import logoMark from '../assets/logo-mark.png'

export default function ConfigurationNeeded() {
  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: 460 }}>
        <div className="sidebar-brand" style={{ marginBottom: 20, padding: 0 }}>
          <img src={logoMark} alt="Bori Muy" className="sidebar-brand-mark" />
          <span className="sidebar-brand-text">Bori Muy CRM</span>
        </div>

        <div className="login-error" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 0 }}>
          <AlertTriangle strokeWidth={2} style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Supabase is not configured</div>
            <div>
              Copy <code>.env.example</code> to <code>.env</code> and fill in your Supabase project's URL and anon
              key, then restart the dev server. See the README for the full setup walkthrough.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
