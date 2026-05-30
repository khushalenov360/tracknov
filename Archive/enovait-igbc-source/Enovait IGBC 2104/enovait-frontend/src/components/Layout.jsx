import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const ROLE_LABELS = { admin:'Enov360 Admin', architect:'Architect', mep:'MEP Consultant', contractor:'Contractor', client:'Client' }

export default function Layout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isAdmin = user.role === 'admin'
  const initials = user.full_name?.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()

  const logout = async () => {
    try {
      const { default: api } = await import('../api')
      await api.post('/auth/logout/', { refresh: localStorage.getItem('refresh') })
    } catch {}
    onLogout()
  }

  const navItem = (to, label, icon, end=false) => (
    <NavLink to={to} end={end} style={({isActive}) => ({...S.navItem, ...(isActive ? S.navActive : {})})}>
      <span style={{fontSize:15}}>{icon}</span> {label}
    </NavLink>
  )

  return (
    <div style={S.app}>
      <aside style={{...S.sidebar, transform: sidebarOpen ? 'none' : 'translateX(-220px)'}}>
        <div style={S.sidebarLogo}>
          <div style={S.logoMark}>⬡</div>
          <div>
            <div style={S.logoText}>EnovAIt</div>
            <div style={S.logoSub}>by Enov360</div>
          </div>
        </div>
        <nav style={S.nav}>
          <div style={S.navLabel}>Main</div>
          {navItem('/', 'Dashboard', '▦', true)}
          {navItem('/projects', 'Projects', '📁')}
          {navItem('/documents', 'Documents', '📄')}
          {navItem('/credits', 'Credit Tracker', '🏅')}
          {isAdmin && <>
            <div style={S.navLabel}>Admin</div>
            {navItem('/team', 'Team', '👥')}
          </>}
        </nav>
        <div style={S.sidebarUser}>
          <div style={S.avatar}>{initials}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={S.userName}>{user.full_name}</div>
            <div style={S.userRole}>{ROLE_LABELS[user.role] || user.role}</div>
          </div>
          <button style={S.logoutBtn} onClick={logout} title="Sign out">⏻</button>
        </div>
      </aside>

      <div style={{...S.main, marginLeft: sidebarOpen ? 220 : 0}}>
        <header style={S.topbar}>
          <button style={S.menuBtn} onClick={()=>setSidebarOpen(v=>!v)}>☰</button>
          <div style={{flex:1}} />
          <div style={S.topbarUser}>{initials}</div>
        </header>
        <div style={S.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

const S = {
  app:{ display:'flex', minHeight:'100vh' },
  sidebar:{ width:220, background:'#fff', borderRight:'1px solid #E5E3DC', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, height:'100vh', zIndex:100, transition:'transform 0.2s' },
  sidebarLogo:{ padding:'18px 16px 14px', borderBottom:'1px solid #E5E3DC', display:'flex', alignItems:'center', gap:10 },
  logoMark:{ width:32, height:32, background:'#1D9E75', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', flexShrink:0 },
  logoText:{ fontSize:16, fontWeight:600, color:'#1A1916' },
  logoSub:{ fontSize:10, color:'#A09E98', textTransform:'uppercase', letterSpacing:'0.5px' },
  nav:{ flex:1, padding:'10px 8px', overflowY:'auto' },
  navLabel:{ fontSize:10, letterSpacing:'0.8px', textTransform:'uppercase', color:'#A09E98', padding:'8px 10px 4px', fontWeight:500 },
  navItem:{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, cursor:'pointer', color:'#6B6860', fontSize:13, fontWeight:400, transition:'all 0.15s', marginBottom:2, textDecoration:'none' },
  navActive:{ background:'#E1F5EE', color:'#0F6E56', fontWeight:500 },
  sidebarUser:{ padding:'12px 14px', borderTop:'1px solid #E5E3DC', display:'flex', alignItems:'center', gap:10 },
  avatar:{ width:32, height:32, borderRadius:'50%', background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500, color:'#185FA5', flexShrink:0 },
  userName:{ fontSize:13, fontWeight:500, color:'#1A1916', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  userRole:{ fontSize:11, color:'#A09E98' },
  logoutBtn:{ background:'none', border:'none', cursor:'pointer', color:'#A09E98', fontSize:16, padding:4, borderRadius:6 },
  main:{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', transition:'margin 0.2s' },
  topbar:{ background:'#fff', borderBottom:'1px solid #E5E3DC', padding:'0 24px', height:52, display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:50 },
  menuBtn:{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#6B6860', padding:4 },
  topbarUser:{ width:30, height:30, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, color:'#0F6E56' },
  content:{ padding:24, flex:1 },
}
