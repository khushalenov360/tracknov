import { useState, useEffect, useRef } from 'react'
import api from '../api'

const STATUS = { validated:{bg:'#E1F5EE',color:'#0F6E56'}, pending:{bg:'#FAEEDA',color:'#BA7517'}, rejected:{bg:'#FCEBEB',color:'#A32D2D'} }
const EXT = { pdf:{bg:'#FCEBEB',color:'#A32D2D'}, docx:{bg:'#E6F1FB',color:'#185FA5'}, xlsx:{bg:'#EAF3DE',color:'#3B6D11'} }

export default function Documents({ user }) {
  const [docs, setDocs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status:'', project:'', search:'' })
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({ project:'', category:'arch_drawings', notes:'' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const isAdmin = user.role === 'admin'

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.status) params.append('validation_status', filter.status)
    if (filter.project) params.append('project', filter.project)
    if (filter.search) params.append('search', filter.search)
    Promise.all([
      api.get(`/documents/?${params}`),
      api.get('/projects/'),
    ]).then(([d, p]) => {
      setDocs(d.data.results || d.data)
      setProjects(p.data.results || p.data)
    }).catch(()=>{}).finally(()=>setLoading(false))
  }
  useEffect(load, [filter])

  const upload = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a file'); return }
    setSaving(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('project', form.project)
    fd.append('category', form.category)
    fd.append('notes', form.notes)
    try {
      await api.post('/documents/upload/', fd, { headers:{'Content-Type':'multipart/form-data'} })
      setShowUpload(false); setFile(null); setForm({project:'',category:'arch_drawings',notes:''})
      load()
    } catch (err) {
      setError(err.response?.data?.file?.[0] || err.response?.data?.project?.[0] || 'Upload failed')
    } finally { setSaving(false) }
  }

  const validate = async (id, action) => {
    try {
      await api.post(`/documents/${id}/validate/`, { action })
      load()
    } catch {}
  }

  const deleteDoc = async (id) => {
    if (!window.confirm('Delete this document?')) return
    try { await api.delete(`/documents/${id}/`); load() } catch {}
  }

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.pageTitle}>Documents</div>
          <div style={S.pageSub}>{docs.length} document{docs.length!==1?'s':''}</div>
        </div>
        <button style={S.btn} onClick={()=>setShowUpload(true)}>↑ Upload</button>
      </div>

      <div style={S.filterBar}>
        <input style={S.search} placeholder="Search documents…" value={filter.search} onChange={e=>setFilter(v=>({...v,search:e.target.value}))} />
        <select style={S.sel} value={filter.status} onChange={e=>setFilter(v=>({...v,status:e.target.value}))}>
          <option value="">All Status</option>
          <option value="validated">Validated</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select style={S.sel} value={filter.project} onChange={e=>setFilter(v=>({...v,project:e.target.value}))}>
          <option value="">All Projects</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={S.card}>
        {loading ? <div style={S.loading}>Loading...</div> :
        docs.length === 0 ? <div style={S.empty}>No documents found</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                {['Document','Project','Uploaded by','Date','Status','Actions'].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(d => {
                const ext = d.file_extension || 'pdf'
                const ec = EXT[ext] || EXT.pdf
                const sc = STATUS[d.validation_status] || STATUS.pending
                const canDel = isAdmin || d.uploaded_by?.id === user.id
                return (
                  <tr key={d.id} style={S.tr}>
                    <td style={S.td}>
                      <div style={S.docCell}>
                        <div style={{...S.fileIcon, background:ec.bg, color:ec.color}}>{ext.toUpperCase()}</div>
                        <div>
                          <div style={S.docName}>{d.name}</div>
                          <div style={S.docMeta}>{d.category_display} · {d.file_size_display}</div>
                        </div>
                      </div>
                    </td>
                    <td style={S.tdMuted}>{d.project_name}</td>
                    <td style={S.tdMuted}>{d.uploaded_by?.full_name?.split(' ')[0]}</td>
                    <td style={{...S.tdMuted, fontSize:12}}>{new Date(d.uploaded_at).toLocaleDateString('en-IN')}</td>
                    <td><span style={{...S.badge, background:sc.bg, color:sc.color}}>{d.validation_status_display}</span></td>
                    <td style={S.tdActions}>
                      <div style={S.actions}>
                        {isAdmin && d.validation_status === 'pending' && <>
                          <button style={S.btnSm} onClick={()=>validate(d.id,'approve')}>✓ Approve</button>
                          <button style={{...S.btnSm,...S.btnDanger}} onClick={()=>validate(d.id,'reject')}>Reject</button>
                        </>}
                        {canDel && <button style={{...S.btnSm,...S.btnDanger}} onClick={()=>deleteDoc(d.id)}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showUpload && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowUpload(false)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>Upload Document</div>
              <button style={S.closeBtn} onClick={()=>setShowUpload(false)}>✕</button>
            </div>
            <form onSubmit={upload} style={S.modalBody}>
              <div style={S.group}>
                <label style={S.label}>Project</label>
                <select style={S.input} value={form.project} onChange={e=>setForm(v=>({...v,project:e.target.value}))} required>
                  <option value="">Select project…</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={S.group}>
                <label style={S.label}>Category</label>
                <select style={S.input} value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>
                  {[['arch_drawings','Architectural Drawings'],['struct_drawings','Structural Drawings'],['mep_drawings','MEP Drawings'],['boq','BOQ / Estimates'],['contracts','Contracts'],['permits','Permits & Approvals'],['site_reports','Site Reports'],['other','Other']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={S.group}>
                <label style={S.label}>Notes (optional)</label>
                <textarea style={{...S.input, minHeight:70, resize:'vertical'}} value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} placeholder="Revision notes…" />
              </div>
              <div style={S.group}>
                <label style={S.label}>File (.pdf, .docx, .xlsx)</label>
                <div style={S.uploadZone} onClick={()=>fileRef.current.click()}>
                  <div style={S.uploadIcon}>↑</div>
                  <div style={S.uploadText}>{file ? file.name : 'Click to browse or drag & drop'}</div>
                  <div style={S.uploadSub}>Max 25MB</div>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])} />
                </div>
              </div>
              {error && <div style={S.error}>{error}</div>}
              <div style={S.modalFooter}>
                <button type="button" style={S.btnGhost} onClick={()=>setShowUpload(false)}>Cancel</button>
                <button type="submit" style={S.btn} disabled={saving}>{saving?'Uploading...':'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16},
  pageTitle:{fontSize:22,fontWeight:600,color:'#1A1916'},
  pageSub:{fontSize:13,color:'#A09E98',marginTop:2},
  btn:{padding:'8px 16px',background:'#1D9E75',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'},
  btnGhost:{padding:'8px 16px',background:'none',color:'#6B6860',border:'1px solid #E5E3DC',borderRadius:8,fontSize:13,cursor:'pointer'},
  filterBar:{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'},
  search:{padding:'7px 12px',border:'1px solid #E5E3DC',borderRadius:8,fontSize:13,color:'#1A1916',outline:'none',flex:1,minWidth:200},
  sel:{padding:'7px 10px',border:'1px solid #E5E3DC',borderRadius:8,fontSize:12,color:'#6B6860',outline:'none',background:'#fff'},
  card:{background:'#fff',border:'1px solid #E5E3DC',borderRadius:12,overflow:'hidden'},
  loading:{padding:40,textAlign:'center',color:'#A09E98'},
  empty:{padding:40,textAlign:'center',color:'#A09E98'},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.5px',color:'#A09E98',borderBottom:'1px solid #E5E3DC',background:'#F7F5F0'},
  tr:{borderBottom:'1px solid #F2F0EA'},
  td:{padding:'11px 14px',verticalAlign:'middle'},
  tdMuted:{padding:'11px 14px',verticalAlign:'middle',color:'#6B6860',fontSize:13},
  tdActions:{padding:'11px 14px',verticalAlign:'middle',textAlign:'right'},
  docCell:{display:'flex',alignItems:'center',gap:10},
  fileIcon:{width:32,height:32,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600,flexShrink:0},
  docName:{fontSize:13,fontWeight:500,color:'#1A1916'},
  docMeta:{fontSize:11,color:'#A09E98'},
  badge:{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:500},
  actions:{display:'flex',gap:6,justifyContent:'flex-end'},
  btnSm:{padding:'4px 10px',background:'#E1F5EE',color:'#0F6E56',border:'none',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:500},
  btnDanger:{background:'#FCEBEB',color:'#A32D2D'},
  overlay:{position:'fixed',inset:0,background:'rgba(26,25,22,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
  modal:{background:'#fff',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'},
  modalHeader:{padding:'18px 20px 14px',borderBottom:'1px solid #E5E3DC',display:'flex',alignItems:'center',justifyContent:'space-between'},
  modalTitle:{fontSize:16,fontWeight:600,color:'#1A1916'},
  closeBtn:{background:'none',border:'none',cursor:'pointer',color:'#A09E98',fontSize:16},
  modalBody:{padding:20},
  modalFooter:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16},
  group:{marginBottom:14},
  label:{display:'block',fontSize:11,fontWeight:500,color:'#6B6860',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'},
  input:{width:'100%',padding:'8px 12px',border:'1px solid #D0CEC7',borderRadius:8,fontSize:13,color:'#1A1916',outline:'none',boxSizing:'border-box'},
  uploadZone:{border:'2px dashed #D0CEC7',borderRadius:8,padding:'24px 20px',textAlign:'center',cursor:'pointer'},
  uploadIcon:{fontSize:24,color:'#A09E98',marginBottom:8},
  uploadText:{fontSize:13,color:'#6B6860',marginBottom:4},
  uploadSub:{fontSize:11,color:'#A09E98'},
  error:{background:'#FCEBEB',color:'#A32D2D',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:8},
}
