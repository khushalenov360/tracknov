import { useState, useEffect } from 'react'
import api from '../api'

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({ projects:0, documents:0, pending:0 })
  const [recentDocs, setRecentDocs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/projects/'),
      api.get('/documents/'),
      api.get('/documents/?validation_status=pending'),
    ]).then(([p, d, pend]) => {
      setProjects(p.data.results || p.data)
      setRecentDocs((d.data.results || d.data).slice(0,5))
      setStats({
        projects: (p.data.results || p.data).length,
        documents: (d.data.results || d.data).length,
        pending: (pend.data.results || pend.data).length,
      })
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const statusColor = { validated:'#1D9E75', pending:'#BA7517', rejected:'#A32D2D' }
  const statusBg = { validated:'#E1F5EE', pending:'#FAEEDA', rejected:'#FCEBEB' }

  if (loading) return <div style={S.loading}>Loading...</div>

  return (
    <div>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Dashboard</div>
        <div style={S.pageSub}>Welcome back, {user.full_name?.split(' ')[0]}</div>
      </div>

      <div style={S.statsGrid}>
        {[
          { label:'Active Projects', value: stats.projects, sub:'Your projects' },
          { label:'Total Documents', value: stats.documents, sub:'Across all projects' },
          { label:'Pending Review', value: stats.pending, sub:'Needs validation', warn: stats.pending > 0 },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{...S.statValue, color: s.warn ? '#BA7517' : '#1A1916'}}>{s.value}</div>
            <div style={S.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Recent Documents</div>
          </div>
          {recentDocs.length === 0 ? <div style={S.empty}>No documents yet</div> :
            recentDocs.map(d => (
              <div key={d.id} style={S.docRow}>
                <div style={{...S.fileIcon, background: d.file_extension==='pdf'?'#FCEBEB':d.file_extension==='docx'?'#E6F1FB':'#EAF3DE', color: d.file_extension==='pdf'?'#A32D2D':d.file_extension==='docx'?'#185FA5':'#3B6D11'}}>
                  {d.file_extension?.toUpperCase()}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={S.docName}>{d.name}</div>
                  <div style={S.docMeta}>{d.project_name}</div>
                </div>
                <span style={{...S.badge, background: statusBg[d.validation_status], color: statusColor[d.validation_status]}}>
                  {d.validation_status}
                </span>
              </div>
            ))
          }
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Projects</div>
          </div>
          {projects.length === 0 ? <div style={S.empty}>No projects yet</div> :
            projects.slice(0,5).map(p => (
              <div key={p.id} style={S.projRow}>
                <div style={{flex:1}}>
                  <div style={S.projName}>{p.name}</div>
                  <div style={S.projMeta}>{p.client} · {p.location}</div>
                </div>
                <div style={S.progressWrap}>
                  <div style={S.progressBar}>
                    <div style={{...S.progressFill, width:`${p.progress}%`}} />
                  </div>
                  <div style={S.progressLabel}>{p.progress}%</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

const S = {
  loading: { padding:40, textAlign:'center', color:'#A09E98' },
  pageHeader: { marginBottom:20 },
  pageTitle: { fontSize:22, fontWeight:600, color:'#1A1916' },
  pageSub: { fontSize:13, color:'#A09E98', marginTop:2 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 },
  statCard: { background:'#fff', border:'1px solid #E5E3DC', borderRadius:10, padding:'14px 16px' },
  statLabel: { fontSize:11, textTransform:'uppercase', letterSpacing:'0.6px', color:'#A09E98', fontWeight:500, marginBottom:6 },
  statValue: { fontSize:28, fontWeight:600, color:'#1A1916', lineHeight:1 },
  statSub: { fontSize:11, color:'#A09E98', marginTop:4 },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  card: { background:'#fff', border:'1px solid #E5E3DC', borderRadius:12, padding:18 },
  cardHeader: { marginBottom:14 },
  cardTitle: { fontSize:15, fontWeight:600, color:'#1A1916' },
  docRow: { display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F2F0EA' },
  fileIcon: { width:32, height:32, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:600, flexShrink:0 },
  docName: { fontSize:13, fontWeight:500, color:'#1A1916', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  docMeta: { fontSize:11, color:'#A09E98' },
  badge: { padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:'nowrap' },
  projRow: { padding:'10px 0', borderBottom:'1px solid #F2F0EA' },
  projName: { fontSize:13, fontWeight:500, color:'#1A1916', marginBottom:2 },
  projMeta: { fontSize:11, color:'#A09E98', marginBottom:6 },
  progressWrap: { display:'flex', alignItems:'center', gap:8 },
  progressBar: { height:4, background:'#E5E3DC', borderRadius:2, overflow:'hidden', width:80 },
  progressFill: { height:'100%', background:'#1D9E75', borderRadius:2 },
  progressLabel: { fontSize:11, color:'#A09E98', minWidth:28 },
  empty: { textAlign:'center', padding:'24px 0', color:'#A09E98', fontSize:13 },
}
