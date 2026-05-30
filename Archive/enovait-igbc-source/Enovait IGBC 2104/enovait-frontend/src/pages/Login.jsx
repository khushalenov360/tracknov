import { useState } from 'react'
import api from '../api'

const S = {
  wrap: { minHeight:'100vh', background:'#F7F5F0', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  card: { background:'#fff', border:'1px solid #E5E3DC', borderRadius:14, padding:36, width:'100%', maxWidth:380 },
  logoMark: { width:48, height:48, background:'#1D9E75', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:22, color:'#fff' },
  logoText: { fontSize:22, fontWeight:600, color:'#1A1916', textAlign:'center', marginBottom:2 },
  logoSub: { fontSize:13, color:'#A09E98', textAlign:'center', marginBottom:28 },
  group: { marginBottom:14 },
  label: { display:'block', fontSize:11, fontWeight:500, color:'#6B6860', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.5px' },
  input: { width:'100%', padding:'9px 12px', border:'1px solid #D0CEC7', borderRadius:8, fontSize:13, color:'#1A1916', outline:'none', boxSizing:'border-box' },
  error: { background:'#FCEBEB', color:'#A32D2D', padding:'8px 12px', borderRadius:8, fontSize:13, marginBottom:12 },
  btn: { width:'100%', padding:10, background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:500, cursor:'pointer', marginTop:4 },
  demo: { marginTop:16, padding:14, background:'#F2F0EA', borderRadius:8, border:'1px solid #E5E3DC' },
  demoTitle: { fontSize:11, fontWeight:500, color:'#A09E98', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 },
  demoBtn: { display:'block', width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:6, border:'none', background:'none', cursor:'pointer', fontSize:12, color:'#6B6860', marginBottom:3 },
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async (e, demoEmail) => {
    if (e) e.preventDefault()
    const loginEmail = demoEmail || email
    const loginPass = demoEmail ? 'password123' : password
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login/', { email: loginEmail, password: loginPass })
      onLogin(res.data.user, { access: res.data.access, refresh: res.data.refresh })
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logoMark}>⬡</div>
        <div style={S.logoText}>EnovAIt</div>
        <div style={S.logoSub}>Project Document Hub</div>
        <form onSubmit={doLogin}>
          <div style={S.group}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div style={S.group}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btn} type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div style={S.demo}>
          <div style={S.demoTitle}>Demo — click to log in as</div>
          {[
            ['admin@enov360.com','Aryan Shah','Enov360 Admin'],
            ['arch@firm.com','Priya Mehta','Architect'],
            ['mep@consult.com','Rohan Verma','MEP Consultant'],
            ['contractor@build.com','Suresh Kumar','Contractor'],
            ['client@group.com','Nisha Patel','Client'],
          ].map(([em,name,role]) => (
            <button key={em} style={S.demoBtn} onClick={()=>doLogin(null,em)}>
              <strong>{name}</strong> · {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
