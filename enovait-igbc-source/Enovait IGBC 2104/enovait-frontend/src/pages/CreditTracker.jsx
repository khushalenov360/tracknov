import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { IGBC_GREEN_INTERIORS } from '../data/igbc_green_interiors'

export default function CreditTracker({ user }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectType, setProjectType] = useState('new')
  const [selectedCredit, setSelectedCredit] = useState(null)
  const [documents, setDocuments] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [uploadCredit, setUploadCredit] = useState(null)
  const [file, setFile] = useState(null)
  const [uploadNotes, setUploadNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [activeCategory, setActiveCategory] = useState('EDA')
  const fileRef = useRef()

  useEffect(() => {
    api.get('/projects/').then(r => {
      const projs = r.data.results || r.data
      setProjects(projs)
      if (projs.length > 0) setSelectedProject(projs[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    api.get(`/documents/?project=${selectedProject.id}`).then(r => {
      setDocuments(r.data.results || r.data)
    }).catch(() => {})
  }, [selectedProject])

  const schema = IGBC_GREEN_INTERIORS
  const allCredits = schema.categories.flatMap(c => c.credits)

  // Map documents to credit IDs via notes field (format: "CREDIT_ID:...")
  const docsByCredit = {}
  documents.forEach(doc => {
    const match = doc.notes?.match(/^CREDIT_ID:([A-Z0-9-]+)/)
    if (match) {
      const cid = match[1]
      if (!docsByCredit[cid]) docsByCredit[cid] = []
      docsByCredit[cid].push(doc)
    }
  })

  const getCreditStatus = (credit) => {
    if (credit.mandatory) {
      const docs = docsByCredit[credit.id] || []
      return docs.length > 0 ? 'complete' : 'required'
    }
    const docs = docsByCredit[credit.id] || []
    if (docs.length === 0) return 'not_started'
    const allValid = docs.some(d => d.validation_status === 'validated')
    if (allValid) return 'complete'
    if (docs.some(d => d.validation_status === 'pending')) return 'in_review'
    return 'in_review'
  }

  const earnedPoints = () => {
    let total = 0
    allCredits.forEach(credit => {
      if (getCreditStatus(credit) === 'complete' && !credit.mandatory) {
        total += credit.points[projectType] || 0
      }
    })
    return total
  }

  const totalAvailable = schema.totalPoints[projectType]
  const earned = earnedPoints()
  const pct = Math.round((earned / totalAvailable) * 100)

  const getCertLevel = () => {
    const levels = schema.certificationLevels
    for (let i = levels.length - 1; i >= 0; i--) {
      const [min] = levels[i][projectType]
      if (earned >= min) return levels[i]
    }
    return null
  }
  const certLevel = getCertLevel()

  const openUpload = (credit) => {
    setUploadCredit(credit)
    setFile(null)
    setUploadNotes('')
    setUploadError('')
    setShowUpload(true)
  }

  const submitUpload = async (e) => {
    e.preventDefault()
    if (!file) { setUploadError('Please select a file'); return }
    if (!selectedProject) { setUploadError('No project selected'); return }
    setSaving(true); setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('project', selectedProject.id)
    fd.append('category', 'other')
    fd.append('notes', `CREDIT_ID:${uploadCredit.id} | ${uploadCredit.code} — ${uploadCredit.name}${uploadNotes ? ' | ' + uploadNotes : ''}`)
    try {
      await api.post('/documents/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowUpload(false)
      const r = await api.get(`/documents/?project=${selectedProject.id}`)
      setDocuments(r.data.results || r.data)
    } catch (err) {
      setUploadError(err.response?.data?.file?.[0] || 'Upload failed')
    } finally { setSaving(false) }
  }

  const STATUS_STYLE = {
    complete:    { bg:'#E1F5EE', color:'#0F6E56', label:'Complete' },
    in_review:   { bg:'#FAEEDA', color:'#BA7517', label:'In Review' },
    required:    { bg:'#FCEBEB', color:'#A32D2D', label:'Required' },
    not_started: { bg:'#F2F0EA', color:'#6B6860', label:'Not Started' },
  }

  const activecat = schema.categories.find(c => c.id === activeCategory)

  return (
    <div>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.pageTitle}>Credit Tracker</div>
          <div style={S.pageSub}>IGBC Green Interiors — Version 2.0</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select style={S.sel} value={selectedProject?.id || ''} onChange={e => setSelectedProject(projects.find(p => p.id == e.target.value))}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select style={S.sel} value={projectType} onChange={e => setProjectType(e.target.value)}>
            <option value="new">New Interiors</option>
            <option value="existing">Existing Interiors</option>
          </select>
        </div>
      </div>

      {/* Score summary */}
      <div style={S.scoreBanner}>
        <div style={S.scoreLeft}>
          <div style={S.scoreValue}>{earned} <span style={S.scoreOf}>/ {totalAvailable}</span></div>
          <div style={S.scoreLabel}>Credits Earned</div>
        </div>
        <div style={S.scoreBar}>
          <div style={S.scoreTrack}>
            <div style={{ ...S.scoreFill, width:`${pct}%` }} />
            {schema.certificationLevels.map(l => {
              const min = l[projectType][0]
              const pos = Math.round((min / totalAvailable) * 100)
              return (
                <div key={l.level} style={{ ...S.scoreMark, left:`${pos}%` }}>
                  <div style={S.scoreMarkLine} />
                  <div style={S.scoreMarkLabel}>{l.level}<br/>{min}</div>
                </div>
              )
            })}
          </div>
          <div style={S.scorePercent}>{pct}%</div>
        </div>
        <div style={S.scoreRight}>
          {certLevel ? (
            <>
              <div style={{ ...S.certBadge, background: certLevel.level === 'Platinum' ? '#1A1916' : certLevel.level === 'Gold' ? '#BA7517' : certLevel.level === 'Silver' ? '#888780' : '#1D9E75', color:'#fff' }}>
                {certLevel.level}
              </div>
              <div style={S.certRecog}>{certLevel.recognition}</div>
            </>
          ) : (
            <div style={S.certBadge2}>Below Certified</div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={S.catTabs}>
        {schema.categories.map(cat => {
          const catCredits = cat.credits
          const completed = catCredits.filter(c => getCreditStatus(c) === 'complete' && !c.mandatory).length
          const total = catCredits.filter(c => !c.mandatory).length
          return (
            <button key={cat.id} style={{ ...S.catTab, ...(activeCategory === cat.id ? { background: cat.bg, borderColor: cat.color, color: cat.color } : {}) }}
              onClick={() => { setActiveCategory(cat.id); setSelectedCredit(null) }}>
              <div style={S.catTabName}>{cat.name}</div>
              <div style={{ ...S.catTabPts, color: activeCategory === cat.id ? cat.color : '#A09E98' }}>{cat.points[projectType]} pts · {completed}/{total}</div>
            </button>
          )
        })}
      </div>

      {/* Credits list + detail panel */}
      <div style={S.body}>
        <div style={S.creditList}>
          {activecat.credits.map(credit => {
            const status = getCreditStatus(credit)
            const ss = STATUS_STYLE[status]
            const pts = credit.points[projectType]
            const docs = docsByCredit[credit.id] || []
            return (
              <div key={credit.id}
                style={{ ...S.creditRow, ...(selectedCredit?.id === credit.id ? { borderColor: activecat.color, background:'#FAFAF8' } : {}), ...(credit.mandatory ? { borderLeft:`3px solid ${activecat.color}` } : {}) }}
                onClick={() => setSelectedCredit(credit)}>
                <div style={S.creditLeft}>
                  <div style={S.creditCode}>{credit.code}</div>
                  <div style={S.creditName}>{credit.name}</div>
                  <div style={S.creditDocCount}>{docs.length} doc{docs.length !== 1 ? 's' : ''} uploaded</div>
                </div>
                <div style={S.creditRight}>
                  <span style={{ ...S.badge, background:ss.bg, color:ss.color }}>{ss.label}</span>
                  <div style={S.creditPts}>{credit.mandatory ? 'Required' : `${pts} pt${pts !== 1 ? 's' : ''}`}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selectedCredit ? (
          <div style={S.detailPanel}>
            <div style={{ ...S.detailHeader, borderBottom:`2px solid ${activecat.color}` }}>
              <div style={{ ...S.detailCode, color: activecat.color }}>{selectedCredit.code}</div>
              <div style={S.detailName}>{selectedCredit.name}</div>
              {!selectedCredit.mandatory && (
                <div style={{ ...S.detailPts, color: activecat.color }}>{selectedCredit.points[projectType]} point{selectedCredit.points[projectType] !== 1 ? 's' : ''}</div>
              )}
            </div>

            <div style={S.detailBody}>
              <div style={S.detailSection}>
                <div style={S.detailSectionTitle}>Intent</div>
                <div style={S.detailText}>{selectedCredit.intent}</div>
              </div>
              {selectedCredit.compliance && (
                <div style={S.detailSection}>
                  <div style={S.detailSectionTitle}>Compliance</div>
                  <div style={S.detailText}>{selectedCredit.compliance}</div>
                </div>
              )}
              <div style={S.detailSection}>
                <div style={S.detailSectionTitle}>Documents Required</div>
                {selectedCredit.documents.map((doc, i) => (
                  <div key={i} style={S.docRequired}>
                    <span style={{ ...S.docNum, background: activecat.bg, color: activecat.color }}>{i + 1}</span>
                    <span style={S.docRequiredText}>{doc}</span>
                  </div>
                ))}
              </div>

              <div style={S.detailSection}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={S.detailSectionTitle}>Uploaded Documents</div>
                  <button style={{ ...S.uploadBtn, background: activecat.color }} onClick={() => openUpload(selectedCredit)}>↑ Upload</button>
                </div>
                {(docsByCredit[selectedCredit.id] || []).length === 0 ? (
                  <div style={S.noDoc}>No documents uploaded yet for this credit</div>
                ) : (
                  (docsByCredit[selectedCredit.id] || []).map(doc => {
                    const ext = doc.file_extension || 'pdf'
                    const EXT_STYLE = { pdf:{bg:'#FCEBEB',color:'#A32D2D'}, docx:{bg:'#E6F1FB',color:'#185FA5'}, xlsx:{bg:'#EAF3DE',color:'#3B6D11'} }
                    const ec = EXT_STYLE[ext] || EXT_STYLE.pdf
                    const sc = { validated:{bg:'#E1F5EE',color:'#0F6E56'}, pending:{bg:'#FAEEDA',color:'#BA7517'}, rejected:{bg:'#FCEBEB',color:'#A32D2D'} }
                    return (
                      <div key={doc.id} style={S.uploadedDoc}>
                        <div style={{ ...S.fileIcon, background:ec.bg, color:ec.color }}>{ext.toUpperCase()}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={S.uploadedDocName}>{doc.name}</div>
                          <div style={S.uploadedDocMeta}>{new Date(doc.uploaded_at).toLocaleDateString('en-IN')} · {doc.file_size_display}</div>
                        </div>
                        <span style={{ ...S.badge, ...(sc[doc.validation_status] || sc.pending) }}>{doc.validation_status}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={S.detailEmpty}>
            <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:500, color:'#6B6860', marginBottom:4 }}>Select a credit</div>
            <div style={{ fontSize:12, color:'#A09E98' }}>Click any credit on the left to see details and upload documents</div>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && uploadCredit && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div>
                <div style={S.modalTitle}>Upload Document</div>
                <div style={{ fontSize:12, color:'#A09E98', marginTop:2 }}>{uploadCredit.code} — {uploadCredit.name}</div>
              </div>
              <button style={S.closeBtn} onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <form onSubmit={submitUpload} style={S.modalBody}>
              <div style={S.group}>
                <label style={S.label}>Select Document</label>
                <div style={S.uploadZone} onClick={() => fileRef.current.click()}>
                  <div style={{ fontSize:24, marginBottom:8 }}>↑</div>
                  <div style={{ fontSize:13, color:'#6B6860', marginBottom:4 }}>{file ? file.name : 'Click to browse or drag & drop'}</div>
                  <div style={{ fontSize:11, color:'#A09E98' }}>.pdf, .docx, .xlsx — max 25MB</div>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" style={{ display:'none' }} onChange={e => setFile(e.target.files[0])} />
                </div>
              </div>
              <div style={S.group}>
                <label style={S.label}>Notes (optional)</label>
                <textarea style={{ ...S.input, minHeight:60, resize:'vertical' }} value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="e.g. Revision 2, Final submission…" />
              </div>
              {uploadError && <div style={S.error}>{uploadError}</div>}
              <div style={S.modalFooter}>
                <button type="button" style={S.btnGhost} onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" style={{ ...S.btn, background: activecat?.color || '#1D9E75' }} disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  header:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 },
  pageTitle:{ fontSize:22, fontWeight:600, color:'#1A1916' },
  pageSub:{ fontSize:13, color:'#A09E98', marginTop:2 },
  sel:{ padding:'7px 12px', border:'1px solid #E5E3DC', borderRadius:8, fontSize:13, color:'#1A1916', outline:'none', background:'#fff' },
  scoreBanner:{ background:'#fff', border:'1px solid #E5E3DC', borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:24 },
  scoreLeft:{ flexShrink:0 },
  scoreValue:{ fontSize:32, fontWeight:700, color:'#1A1916', lineHeight:1 },
  scoreOf:{ fontSize:18, fontWeight:400, color:'#A09E98' },
  scoreLabel:{ fontSize:11, color:'#A09E98', marginTop:4, textTransform:'uppercase', letterSpacing:'0.5px' },
  scoreBar:{ flex:1, display:'flex', alignItems:'center', gap:12 },
  scoreTrack:{ flex:1, height:8, background:'#F2F0EA', borderRadius:4, position:'relative', overflow:'visible' },
  scoreFill:{ height:'100%', background:'#1D9E75', borderRadius:4, transition:'width 0.5s' },
  scoreMark:{ position:'absolute', top:0, transform:'translateX(-50%)' },
  scoreMarkLine:{ width:1, height:16, background:'#D0CEC7', margin:'0 auto' },
  scoreMarkLabel:{ fontSize:9, color:'#A09E98', textAlign:'center', lineHeight:1.3, marginTop:2, whiteSpace:'nowrap' },
  scorePercent:{ fontSize:13, fontWeight:500, color:'#6B6860', flexShrink:0 },
  scoreRight:{ flexShrink:0, textAlign:'center' },
  certBadge:{ padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, display:'inline-block' },
  certBadge2:{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, background:'#F2F0EA', color:'#6B6860', display:'inline-block' },
  certRecog:{ fontSize:11, color:'#A09E98', marginTop:4 },
  catTabs:{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' },
  catTab:{ padding:'8px 14px', border:'1px solid #E5E3DC', borderRadius:8, background:'#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s' },
  catTabName:{ fontSize:12, fontWeight:500, color:'#1A1916', marginBottom:2 },
  catTabPts:{ fontSize:11 },
  body:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, alignItems:'start' },
  creditList:{ background:'#fff', border:'1px solid #E5E3DC', borderRadius:12, overflow:'hidden' },
  creditRow:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid #F2F0EA', cursor:'pointer', transition:'all 0.15s', border:'1px solid transparent', borderBottom:'1px solid #F2F0EA' },
  creditLeft:{ flex:1, minWidth:0 },
  creditCode:{ fontSize:10, fontWeight:600, color:'#A09E98', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 },
  creditName:{ fontSize:13, fontWeight:500, color:'#1A1916', marginBottom:2 },
  creditDocCount:{ fontSize:11, color:'#A09E98' },
  creditRight:{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0, marginLeft:12 },
  creditPts:{ fontSize:11, color:'#A09E98' },
  badge:{ padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:'nowrap' },
  detailPanel:{ background:'#fff', border:'1px solid #E5E3DC', borderRadius:12, overflow:'hidden', position:'sticky', top:76 },
  detailEmpty:{ background:'#fff', border:'1px solid #E5E3DC', borderRadius:12, padding:'48px 24px', textAlign:'center', color:'#A09E98' },
  detailHeader:{ padding:'16px 18px 14px' },
  detailCode:{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 },
  detailName:{ fontSize:16, fontWeight:600, color:'#1A1916', marginBottom:4 },
  detailPts:{ fontSize:13, fontWeight:500 },
  detailBody:{ padding:'0 18px 18px', maxHeight:'calc(100vh - 320px)', overflowY:'auto' },
  detailSection:{ paddingTop:14, marginTop:14, borderTop:'1px solid #F2F0EA' },
  detailSectionTitle:{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', color:'#A09E98', marginBottom:8 },
  detailText:{ fontSize:13, color:'#1A1916', lineHeight:1.6 },
  docRequired:{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:6 },
  docNum:{ width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, flexShrink:0, marginTop:1 },
  docRequiredText:{ fontSize:12, color:'#6B6860', lineHeight:1.5 },
  uploadBtn:{ padding:'5px 12px', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer' },
  noDoc:{ padding:'16px', textAlign:'center', fontSize:12, color:'#A09E98', background:'#F7F5F0', borderRadius:8 },
  uploadedDoc:{ display:'flex', alignItems:'center', gap:10, padding:'8px', background:'#F7F5F0', borderRadius:8, marginBottom:6 },
  fileIcon:{ width:30, height:30, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:600, flexShrink:0 },
  uploadedDocName:{ fontSize:12, fontWeight:500, color:'#1A1916', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  uploadedDocMeta:{ fontSize:11, color:'#A09E98' },
  overlay:{ position:'fixed', inset:0, background:'rgba(26,25,22,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modal:{ background:'#fff', borderRadius:14, width:'100%', maxWidth:440, maxHeight:'90vh', overflowY:'auto' },
  modalHeader:{ padding:'18px 20px 14px', borderBottom:'1px solid #E5E3DC', display:'flex', alignItems:'flex-start', justifyContent:'space-between' },
  modalTitle:{ fontSize:16, fontWeight:600, color:'#1A1916' },
  closeBtn:{ background:'none', border:'none', cursor:'pointer', color:'#A09E98', fontSize:16, marginTop:2 },
  modalBody:{ padding:20 },
  modalFooter:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 },
  group:{ marginBottom:14 },
  label:{ display:'block', fontSize:11, fontWeight:500, color:'#6B6860', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' },
  input:{ width:'100%', padding:'8px 12px', border:'1px solid #D0CEC7', borderRadius:8, fontSize:13, color:'#1A1916', outline:'none', boxSizing:'border-box' },
  uploadZone:{ border:'2px dashed #D0CEC7', borderRadius:8, padding:'20px', textAlign:'center', cursor:'pointer' },
  btn:{ padding:'8px 16px', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer' },
  btnGhost:{ padding:'8px 16px', background:'none', color:'#6B6860', border:'1px solid #E5E3DC', borderRadius:8, fontSize:13, cursor:'pointer' },
  error:{ background:'#FCEBEB', color:'#A32D2D', padding:'8px 12px', borderRadius:8, fontSize:13, marginBottom:8 },
}
