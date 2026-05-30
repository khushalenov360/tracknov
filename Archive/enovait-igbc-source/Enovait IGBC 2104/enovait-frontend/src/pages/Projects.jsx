import { useState, useEffect } from 'react'
import api from '../api'

const STATUS_COLORS = { active:{bg:'#E1F5EE',color:'#0F6E56'}, on_hold:{bg:'#FAEEDA',color:'#BA7517'}, completed:{bg:'#E6F1FB',color:'#185FA5'} }
const CERT_COLORS = { EDGE:{bg:'#E6F1FB',color:'#185FA5'}, LEED:{bg:'#EAF3DE',color:'#3B6D11'}, IGBC:{bg:'#F3EEFF',color:'#534AB7'}, GRIHA:{bg:'#FAEEDA',color:'#BA7517'}, None:{bg:'#F2F0EA',color:'#6B6860'} }

export default function Projects({ user }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name:'', client:'', location:'', project_type:'residential', status:'active', certification:'None' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canCreate = ['admin','architect'].includes(user.role)

  const load = () => {
    setLoading(true)
    api.get('/projects/').then(r => setProjects(r.data.results || r.data)).catch(()=>{}).finally(()=>setLoading(false))
  }
  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post('/projects/', form)
      setShowModal(false)
      setForm({ name:'', client:'', location:'', project_type:'residential', status:'active', certification:'None' })
      load()
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Failed to create project')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={S.loading}>Loading...</div>

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.pageTitle}>Projects</div>
          <div style={S.pageSub}>{projects.length} project{projects.length!==1?'s':''}</div>
        </div>
        {canCreate && <button style={S.btn} onClick={()=>setShowModal(true)}>+ New Project</button>}
      </div>

      <div style={S.grid}>
        {projects.map(p => {
          const sc = STATUS_COLORS[p.status] || STATUS_COLORS.active
          const cert = p.certification || 'None'
          const cc = CERT_COLORS[cert] || CERT_COLORS.None
          return (
            <div key={p.id} style={S.card}>
              <div style={S.cardAccent} />
              <div style={S.cardHeader}>
                <div style={{flex:1}}>
                  <div style={S.projName}>{p.name}</div>
                  <div style={S.projMeta}>{p.client} · {p.location}</div>
                </div>
                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5}}>
                  <span style={{...S.badge, background:sc.bg, color:sc.color}}>{p.status?.replace('_',' ')}</span>
                  {cert !== 'None' && <span style={{...S.badge, background:cc.bg, color:cc.color}}>🏅 {cert}</span>}
                </div>
              </div>
              <div style={S.progressSection}>
                <div style={S.progressLabels}>
                  <span style={S.typeLabel}>{p.project_type_display}</span>
                  <span style={S.pct}>{p.progress}%</span>
                </div>
                <div style={S.progressBar}><div style={{...S.progressFill, width:`${p.progress}%`}} /></div>
              </div>
              <div style={S.cardFooter}>
                <span style={S.footerItem}>📄 {p.document_count} docs</span>
                <span style={S.footerItem}>👥 {p.members?.length || 0} members</span>
              </div>
            </div>
          )
        })}
        {projects.length === 0 && <div style={S.empty}>No projects yet{canCreate ? ' — create one above' : ''}</div>}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>New Project</div>
              <button style={S.closeBtn} onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit} style={S.modalBody}>
              {[['name','Project Name','e.g. Godrej Residency Block C'],['client','Client','Client name'],['location','Location','City, State']].map(([f,l,p])=>(
                <div key={f} style={S.group}>
                  <label style={S.label}>{l}</label>
                  <input style={S.input} value={form[f]} onChange={e=>setForm(v=>({...v,[f]:e.target.value}))} placeholder={p} required={f!=='location'} />
                </div>
              ))}
              <div style={S.row}>
                <div style={S.group}>
                  <label style={S.label}>Type</label>
                  <select style={S.input} value={form.project_type} onChange={e=>setForm(v=>({...v,project_type:e.target.value}))}>
                    {['residential','commercial','industrial','infrastructure','mixed_use'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div style={S.group}>
                  <label style={S.label}>Status</label>
                  <select style={S.input} value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value}))}>
                    {['active','on_hold','completed'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>

              <div style={S.group}>
                <label style={S.label}>Green Certification</label>
                <select style={S.input} value={form.certification} onChange={e=>setForm(v=>({...v,certification:e.target.value}))}>
                  <option value="None">None</option>
                  <option value="EDGE">EDGE</option>
                  <option value="LEED">LEED</option>
                  <option value="IGBC">IGBC</option>
                  <option value="GRIHA">GRIHA</option>
                </select>
                <div style={S.fieldHint}>Optional — select if this project targets a green building rating</div>
              </div>

              {error && <div style={S.error}>{error}</div>}
              <div style={S.modalFooter}>
                <button type="button" style={S.btnGhost} onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" style={S.btn} disabled={saving}>{saving?'Creating...':'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  loading:{padding:40,textAlign:'center',color:'#A09E98'},
  header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20},
  pageTitle:{fontSize:22,fontWeight:600,color:'#1A1916'},
  pageSub:{fontSize:13,color:'#A09E98',marginTop:2},
  btn:{padding:'8px 16px',background:'#1D9E75',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'},
  btnGhost:{padding:'8px 16px',background:'none',color:'#6B6860',border:'1px solid #E5E3DC',borderRadius:8,fontSize:13,cursor:'pointer'},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14},
  card:{background:'#fff',border:'1px solid #E5E3DC',borderRadius:12,padding:18,position:'relative',overflow:'hidden'},
  cardAccent:{position:'absolute',top:0,left:0,right:0,height:3,background:'#1D9E75'},
  cardHeader:{display:'flex',alignItems:'flex-start',gap:10,marginBottom:12},
  projName:{fontSize:14,fontWeight:500,color:'#1A1916',marginBottom:2},
  projMeta:{fontSize:12,color:'#A09E98'},
  badge:{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:500,whiteSpace:'nowrap',textTransform:'capitalize'},
  progressSection:{marginBottom:10},
  progressLabels:{display:'flex',justifyContent:'space-between',marginBottom:4},
  typeLabel:{fontSize:11,color:'#A09E98',textTransform:'capitalize'},
  pct:{fontSize:11,color:'#A09E98'},
  progressBar:{height:3,background:'#E5E3DC',borderRadius:2,overflow:'hidden'},
  progressFill:{height:'100%',background:'#1D9E75',borderRadius:2},
  cardFooter:{display:'flex',gap:14,paddingTop:10,borderTop:'1px solid #F2F0EA'},
  footerItem:{fontSize:12,color:'#6B6860'},
  empty:{gridColumn:'1/-1',textAlign:'center',padding:'48px 0',color:'#A09E98'},
  overlay:{position:'fixed',inset:0,background:'rgba(26,25,22,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
  modal:{background:'#fff',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'},
  modalHeader:{padding:'18px 20px 14px',borderBottom:'1px solid #E5E3DC',display:'flex',alignItems:'center',justifyContent:'space-between'},
  modalTitle:{fontSize:16,fontWeight:600,color:'#1A1916'},
  closeBtn:{background:'none',border:'none',cursor:'pointer',color:'#A09E98',fontSize:16},
  modalBody:{padding:20},
  modalFooter:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16},
  group:{marginBottom:14},
  row:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
  label:{display:'block',fontSize:11,fontWeight:500,color:'#6B6860',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'},
  input:{width:'100%',padding:'8px 12px',border:'1px solid #D0CEC7',borderRadius:8,fontSize:13,color:'#1A1916',outline:'none',boxSizing:'border-box'},
  fieldHint:{fontSize:11,color:'#A09E98',marginTop:4},
  error:{background:'#FCEBEB',color:'#A32D2D',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:8},
}
