import { useState, useEffect } from 'react'
import api from '../api'

const ROLE_LABELS = { admin:'Enov360 Admin', architect:'Architect', mep:'MEP Consultant', contractor:'Contractor', client:'Client' }
const ROLE_COLORS = { admin:{bg:'#1A1916',color:'#fff'}, architect:{bg:'#E6F1FB',color:'#185FA5'}, mep:{bg:'#F3EEFF',color:'#534AB7'}, contractor:{bg:'#E1F5EE',color:'#0F6E56'}, client:{bg:'#FAEEDA',color:'#BA7517'} }

export default function Team({ user }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ full_name:'', email:'', role:'architect', company:'', password:'', password2:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    api.get('/auth/users/').then(r=>setMembers(r.data.results||r.data)).catch(()=>{}).finally(()=>setLoading(false))
  }
  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post('/auth/users/', form)
      setShowModal(false)
      setForm({full_name:'',email:'',role:'architect',company:'',password:'',password2:''})
      load()
    } catch (err) {
      const d = err.response?.data
      setError(d?.email?.[0] || d?.password?.[0] || d?.non_field_errors?.[0] || 'Failed to add member')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (id === user.id) { alert("You can't remove yourself"); return }
    if (!window.confirm('Remove this member?')) return
    try { await api.delete(`/auth/users/${id}/`); load() } catch {}
  }

  if (loading) return <div style={S.loading}>Loading...</div>

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.pageTitle}>Team</div>
          <div style={S.pageSub}>{members.length} member{members.length!==1?'s':''}</div>
        </div>
        <button style={S.btn} onClick={()=>setShowModal(true)}>+ Add Member</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{['Member','Role','Company','Joined','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {members.map(m => {
              const rc = ROLE_COLORS[m.role] || ROLE_COLORS.client
              const initials = m.full_name?.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()
              return (
                <tr key={m.id} style={S.tr}>
                  <td style={S.td}>
                    <div style={S.memberCell}>
                      <div style={S.avatar}>{initials}</div>
                      <div>
                        <div style={S.memberName}>{m.full_name}</div>
                        <div style={S.memberEmail}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={S.td}><span style={{...S.badge, background:rc.bg, color:rc.color}}>{ROLE_LABELS[m.role]||m.role}</span></td>
                  <td style={S.tdMuted}>{m.company||'—'}</td>
                  <td style={S.tdMuted}>{new Date(m.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={S.td}>
                    <button style={S.btnDanger} onClick={()=>remove(m.id)}>Remove</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {members.length === 0 && <div style={S.empty}>No team members yet</div>}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>Add Team Member</div>
              <button style={S.closeBtn} onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit} style={S.modalBody}>
              <div style={S.row}>
                <div style={S.group}>
                  <label style={S.label}>Full Name</label>
                  <input style={S.input} value={form.full_name} onChange={e=>setForm(v=>({...v,full_name:e.target.value}))} required />
                </div>
                <div style={S.group}>
                  <label style={S.label}>Email</label>
                  <input style={S.input} type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} required />
                </div>
              </div>
              <div style={S.row}>
                <div style={S.group}>
                  <label style={S.label}>Role</label>
                  <select style={S.input} value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}>
                    {Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div style={S.group}>
                  <label style={S.label}>Company</label>
                  <input style={S.input} value={form.company} onChange={e=>setForm(v=>({...v,company:e.target.value}))} />
                </div>
              </div>
              <div style={S.row}>
                <div style={S.group}>
                  <label style={S.label}>Password</label>
                  <input style={S.input} type="password" value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))} required minLength={8} />
                </div>
                <div style={S.group}>
                  <label style={S.label}>Confirm Password</label>
                  <input style={S.input} type="password" value={form.password2} onChange={e=>setForm(v=>({...v,password2:e.target.value}))} required />
                </div>
              </div>
              {error && <div style={S.error}>{error}</div>}
              <div style={S.modalFooter}>
                <button type="button" style={S.btnGhost} onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" style={S.btn} disabled={saving}>{saving?'Adding...':'Add Member'}</button>
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
  btnDanger:{padding:'4px 10px',background:'#FCEBEB',color:'#A32D2D',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'},
  card:{background:'#fff',border:'1px solid #E5E3DC',borderRadius:12,overflow:'hidden'},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.5px',color:'#A09E98',borderBottom:'1px solid #E5E3DC',background:'#F7F5F0'},
  tr:{borderBottom:'1px solid #F2F0EA'},
  td:{padding:'12px 14px',verticalAlign:'middle'},
  tdMuted:{padding:'12px 14px',verticalAlign:'middle',color:'#6B6860',fontSize:13},
  memberCell:{display:'flex',alignItems:'center',gap:10},
  avatar:{width:34,height:34,borderRadius:'50%',background:'#E6F1FB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:500,color:'#185FA5',flexShrink:0},
  memberName:{fontSize:13,fontWeight:500,color:'#1A1916'},
  memberEmail:{fontSize:11,color:'#A09E98'},
  badge:{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:500},
  empty:{padding:40,textAlign:'center',color:'#A09E98'},
  overlay:{position:'fixed',inset:0,background:'rgba(26,25,22,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
  modal:{background:'#fff',borderRadius:14,width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto'},
  modalHeader:{padding:'18px 20px 14px',borderBottom:'1px solid #E5E3DC',display:'flex',alignItems:'center',justifyContent:'space-between'},
  modalTitle:{fontSize:16,fontWeight:600,color:'#1A1916'},
  closeBtn:{background:'none',border:'none',cursor:'pointer',color:'#A09E98',fontSize:16},
  modalBody:{padding:20},
  modalFooter:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16},
  row:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
  group:{marginBottom:14},
  label:{display:'block',fontSize:11,fontWeight:500,color:'#6B6860',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'},
  input:{width:'100%',padding:'8px 12px',border:'1px solid #D0CEC7',borderRadius:8,fontSize:13,color:'#1A1916',outline:'none',boxSizing:'border-box'},
  error:{background:'#FCEBEB',color:'#A32D2D',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:8},
}
