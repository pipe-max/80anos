import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ESTUDIANTES } from './estudiantes.js'

// ─── Supabase ────────────────────────────────────────────────────────────────
const supabase = createClient(
  'https://xldsnyacwndbmbfcaywn.supabase.co',
  'sb_publishable__95xEW1VP2Bnra8LhfxEMg_C9Ynlf0-'
)

// ─── Constantes ──────────────────────────────────────────────────────────────
const SECCIONES = Object.keys(ESTUDIANTES).sort()
const PIN_DEFAULT = 'director80'

const shortName = (sec) =>
  `${sec.split(' - ')[0]} ${sec.endsWith('Alef') ? 'Alef' : 'Bet'}`

// Mapeo de grado (nombre antes del " - ") a nivel
const NIVEL_MAP = {
  'K3': 'Preescolar', 'K4': 'Preescolar', 'K5': 'Preescolar', 'Primero': 'Preescolar',
  'Segundo': 'Primaria', 'Tercero': 'Primaria', 'Cuarto': 'Primaria', 'Quinto': 'Primaria', 'Sexto': 'Primaria',
  'Séptimo': 'Bachillerato', 'Octavo': 'Bachillerato', 'Noveno': 'Bachillerato',
  'Décimo': 'Bachillerato', 'Once': 'Bachillerato', 'Doce': 'Bachillerato',
}
const NIVELES = ['Preescolar', 'Primaria', 'Bachillerato']

// Lista de grados únicos (sin Alef/Bet) ordenados
const GRADOS_ORDEN = ['K3','K4','K5','Primero','Segundo','Tercero','Cuarto','Quinto','Sexto','Séptimo','Octavo','Noveno','Décimo','Once','Doce']
const GRADOS_POR_NIVEL = (nivel) => GRADOS_ORDEN.filter(g => NIVEL_MAP[g] === nivel)

// Obtener estudiantes de un grado (combina Alef y Bet, sin duplicados)
const estudiantesPorGrado = (grado) => {
  const todos = SECCIONES
    .filter(s => s.startsWith(grado + ' - '))
    .flatMap(s => ESTUDIANTES[s] || [])
  return [...new Set(todos)].sort()
}

// Obtener la sección real de un estudiante dado grado y nombre
const seccionDeEstudiante = (grado, nombre) => {
  return SECCIONES.find(s => s.startsWith(grado + ' - ') && (ESTUDIANTES[s] || []).includes(nombre)) || grado
}

const emptyAuth = () => ({ nombre: '', cedula: '', placa: '', parentesco: '', celular: '' })
const emptyRecoge = () => ({ tipo: '', auth: emptyAuth() })

// ─── Colores ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#060b14', card: '#0c1728', cardB: '#163060',
  blue: '#1d6eed', blueL: '#4da6ff',
  text: '#d4e8ff', muted: '#527ea8',
  green: '#10b981', red: '#f43f5e', yellow: '#f59e0b',
}

// ─── Estilos utilitarios ──────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", padding: '0 0 60px' },
  header: { background: '#ffffff', borderBottom: `1px solid #d0dff0`, padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoText: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 1, color: '#1d3a6e', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#4a6a9a', marginTop: 2, textAlign: 'center' },
  container: { maxWidth: 720, margin: '0 auto', padding: '28px 16px' },
  card: { background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, padding: '24px 22px', marginBottom: 20 },
  label: { fontSize: 13, color: C.muted, marginBottom: 6, display: 'block', fontWeight: 500 },
  input: { width: '100%', background: '#0a1628', border: `1px solid ${C.cardB}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 15, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', background: '#0a1628', border: `1px solid ${C.cardB}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 15, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', cursor: 'pointer' },
  btn: (color = C.blue) => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }),
  btnSm: (color = C.blue) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }),
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  tag: (color) => ({ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }),
  sectionTitle: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: C.blueL, marginBottom: 16, letterSpacing: 0.5 },
}

// ─── Componente Campo ─────────────────────────────────────────────────────────
function Campo({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>
      <input
        type={type}
        style={S.input}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        required={required}
      />
    </div>
  )
}

// ─── Sección de "¿Quién recoge?" ──────────────────────────────────────────────
function RecogeCard({ dia, value, onChange }) {
  return (
    <div style={{ ...S.card, marginBottom: 0 }}>
      <div style={S.sectionTitle}>{dia}</div>
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>¿Quién recoge? <span style={{ color: C.red }}>*</span></label>
        <select
          style={S.select}
          value={value.tipo}
          onChange={e => onChange({ ...value, tipo: e.target.value, auth: emptyAuth() })}
          required
        >
          <option value="">— Selecciona —</option>
          <option value="padres">Papá / Mamá</option>
          <option value="autorizado">Persona autorizada</option>
        </select>
      </div>

      {value.tipo === 'autorizado' && (
        <div style={{ borderTop: `1px solid ${C.cardB}`, paddingTop: 16 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Datos de la persona autorizada</div>
          <Campo label="Nombre completo" value={value.auth.nombre} onChange={v => onChange({ ...value, auth: { ...value.auth, nombre: v } })} placeholder="Ej. Carlos Pérez" required />
          <div style={S.row}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Cédula" value={value.auth.cedula} onChange={v => onChange({ ...value, auth: { ...value.auth, cedula: v } })} placeholder="Ej. 12345678" required />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Parentesco" value={value.auth.parentesco} onChange={v => onChange({ ...value, auth: { ...value.auth, parentesco: v } })} placeholder="Ej. Tío, abuelo..." required />
            </div>
          </div>
          <div style={S.row}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Celular" value={value.auth.celular} onChange={v => onChange({ ...value, auth: { ...value.auth, celular: v } })} placeholder="Ej. 3001234567" type="tel" required />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Placa del vehículo (opcional)" value={value.auth.placa} onChange={v => onChange({ ...value, auth: { ...value.auth, placa: v } })} placeholder="Ej. ABC123" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FORMULARIO PADRES ────────────────────────────────────────────────────────
function FormularioPadres() {
  const [nivel, setNivel] = useState('')
  const [grado, setGrado] = useState('')
  const [nombre, setNombre] = useState('')
  const [day4, setDay4] = useState(emptyRecoge())
  const [day5, setDay5] = useState(emptyRecoge())
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const gradosDisponibles = nivel ? GRADOS_POR_NIVEL(nivel) : []
  const estudiantes = grado ? estudiantesPorGrado(grado) : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nivel || !grado || !nombre) return setError('Por favor completa el nivel, grado y nombre del estudiante.')
    if (!day4.tipo || !day5.tipo) return setError('Indica quién recoge en cada día.')
    if (day4.tipo === 'autorizado' && (!day4.auth.nombre || !day4.auth.cedula || !day4.auth.parentesco || !day4.auth.celular))
      return setError('Completa todos los datos de la persona autorizada para el lunes 4.')
    if (day5.tipo === 'autorizado' && (!day5.auth.nombre || !day5.auth.cedula || !day5.auth.parentesco || !day5.auth.celular))
      return setError('Completa todos los datos de la persona autorizada para el martes 5.')

    setError('')
    setLoading(true)
    const seccion = seccionDeEstudiante(grado, nombre)
    try {
      const { error: err } = await supabase.from('submissions').insert([{
        nombre, seccion,
        day4: day4.tipo === 'padres' ? { tipo: 'padres' } : { tipo: 'autorizado', ...day4.auth },
        day5: day5.tipo === 'padres' ? { tipo: 'padres' } : { tipo: 'autorizado', ...day5.auth },
      }])
      if (err) throw err
      setSuccess(true)
    } catch (e) {
      setError('Error al enviar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={S.page}>
        <Header />
        <div style={{ ...S.container, textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: C.green, marginBottom: 10 }}>
            ¡Formulario enviado!
          </div>
          <div style={{ color: C.muted, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
            La información de recogida para <strong style={{ color: C.text }}>{nombre}</strong> fue registrada exitosamente.
          </div>
          <button style={S.btn(C.blue)} onClick={() => { setSuccess(false); setNivel(''); setGrado(''); setNombre(''); setDay4(emptyRecoge()); setDay5(emptyRecoge()) }}>
            Registrar otro estudiante
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <Header />
      <div style={S.container}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
            Formulario de Recogida
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>
            Teatro Metropolitano de Medellín · Lunes 4 y Martes 5 de mayo
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Sección y nombre */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Datos del Estudiante</div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Sección <span style={{ color: C.red }}>*</span></label>
              <select style={S.select} value={nivel} onChange={e => { setNivel(e.target.value); setGrado(''); setNombre('') }} required>
                <option value="">— Selecciona la sección —</option>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Grado <span style={{ color: C.red }}>*</span></label>
              <select style={S.select} value={grado} onChange={e => { setGrado(e.target.value); setNombre('') }} required disabled={!nivel}>
                <option value="">— Selecciona el grado —</option>
                {gradosDisponibles.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Nombre del estudiante <span style={{ color: C.red }}>*</span></label>
              <select style={S.select} value={nombre} onChange={e => setNombre(e.target.value)} required disabled={!grado}>
                <option value="">— Selecciona el nombre —</option>
                {estudiantes.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Días */}
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <RecogeCard dia="☀️ Lunes 4 de mayo" value={day4} onChange={setDay4} />
            <RecogeCard dia="🌤️ Martes 5 de mayo" value={day5} onChange={setDay5} />
          </div>

          {error && (
            <div style={{ background: C.red + '22', border: `1px solid ${C.red}55`, color: C.red, borderRadius: 8, padding: '12px 16px', marginTop: 16, fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" style={{ ...S.btn(C.blue), marginTop: 20, width: '100%', padding: '14px', fontSize: 16 }} disabled={loading}>
            {loading ? 'Enviando...' : '📨 Enviar formulario'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── PANEL DIRECTORES ─────────────────────────────────────────────────────────
function PanelDirectores({ onLogout }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroSec, setFiltroSec] = useState('')
  const [filtroDia, setFiltroDia] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [saving, setSaving] = useState({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (!error) setSubmissions(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggle = async (id, field, currentVal) => {
    setSaving(s => ({ ...s, [id + field]: true }))
    await supabase.from('submissions').update({ [field]: !currentVal }).eq('id', id)
    setSubmissions(prev => prev.map(r => r.id === id ? { ...r, [field]: !currentVal } : r))
    setSaving(s => ({ ...s, [id + field]: false }))
  }

  const saveObs = async (id, field, value) => {
    await supabase.from('submissions').update({ [field]: value }).eq('id', id)
    setSubmissions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  // Filtrar
  const filtered = submissions.filter(r => {
    const matchSec = !filtroSec || r.seccion === filtroSec
    const matchBus = !busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase())
    if (!matchSec || !matchBus) return false
    if (filtroDia === 'd4_pendiente') return !r.d4_checked
    if (filtroDia === 'd5_pendiente') return !r.d5_checked
    return true
  })

  // ─── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Nombre', 'Sección', 'Lunes 4 - Tipo', 'Lunes 4 - Autorizado', 'Lunes 4 - Cédula', 'Lunes 4 - Parentesco', 'Lunes 4 - Celular', 'Lunes 4 - Placa', 'Lunes 4 - Recogido', 'Lunes 4 - Observación',
        'Martes 5 - Tipo', 'Martes 5 - Autorizado', 'Martes 5 - Cédula', 'Martes 5 - Parentesco', 'Martes 5 - Celular', 'Martes 5 - Placa', 'Martes 5 - Recogido', 'Martes 5 - Observación',
        'Enviado el'],
      ...filtered.map(r => {
        const d4 = r.day4 || {}
        const d5 = r.day5 || {}
        const fmt = (d) => d.tipo === 'padres' ? 'Padres' : 'Autorizado'
        const fecha = r.submitted_at ? new Date(r.submitted_at).toLocaleString('es-CO') : ''
        return [
          r.nombre, shortName(r.seccion),
          fmt(d4), d4.nombre || '', d4.cedula || '', d4.parentesco || '', d4.celular || '', d4.placa || '',
          r.d4_checked ? 'Sí' : 'No', r.d4_obs || '',
          fmt(d5), d5.nombre || '', d5.cedula || '', d5.parentesco || '', d5.celular || '', d5.placa || '',
          r.d5_checked ? 'Sí' : 'No', r.d5_obs || '',
          fecha,
        ]
      })
    ]

    const csv = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const secLabel = filtroSec ? shortName(filtroSec).replace(/\s+/g, '_') : 'todas_secciones'
    const diaLabel = filtroDia === 'todos' ? 'ambos_dias' : filtroDia
    a.download = `recogida_cth80_${secLabel}_${diaLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const countD4 = filtered.filter(r => r.d4_checked).length
  const countD5 = filtered.filter(r => r.d5_checked).length

  return (
    <div style={S.page}>
      <Header extra={
        <button style={{ ...S.btnSm('#334'), marginLeft: 'auto' }} onClick={onLogout}>
          Cerrar sesión
        </button>
      } />
      <div style={S.container}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 20 }}>
          Panel de Directores
        </div>

        {/* Filtros */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div>
              <label style={S.label}>🔍 Buscar estudiante</label>
              <input style={S.input} placeholder="Nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>📚 Filtrar por sección</label>
              <select style={S.select} value={filtroSec} onChange={e => setFiltroSec(e.target.value)}>
                <option value="">Todas las secciones</option>
                {SECCIONES.map(s => <option key={s} value={s}>{shortName(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>📅 Filtrar por día</label>
              <select style={S.select} value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="d4_pendiente">Lunes 4 — Pendientes</option>
                <option value="d5_pendiente">Martes 5 — Pendientes</option>
              </select>
            </div>
          </div>

          {/* Stats + acciones */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={S.tag(C.blue)}>{filtered.length} registros</span>
            <span style={S.tag(C.green)}>L4: {countD4}/{filtered.length} recogidos</span>
            <span style={S.tag(C.yellow)}>M5: {countD5}/{filtered.length} recogidos</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button style={S.btnSm(C.green)} onClick={exportCSV} title="Exportar vista actual a CSV">
                ⬇️ Exportar CSV
              </button>
              <button style={S.btnSm(C.cardB)} onClick={fetchData} title="Refrescar datos">
                🔄 Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>No hay registros para este filtro.</div>
        ) : (
          filtered.map(r => (
            <RowSubmission key={r.id} r={r} onToggle={toggle} onSaveObs={saveObs} saving={saving} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Fila de submission ───────────────────────────────────────────────────────
function RowSubmission({ r, onToggle, onSaveObs, saving }) {
  const [obs4, setObs4] = useState(r.d4_obs || '')
  const [obs5, setObs5] = useState(r.d5_obs || '')

  const d4 = r.day4 || {}
  const d5 = r.day5 || {}

  const recogeLabel = (d) => d.tipo === 'padres'
    ? <span style={S.tag(C.blue)}>Papá/Mamá</span>
    : <span style={S.tag(C.yellow)}>Autorizado: {d.nombre}</span>

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{r.nombre}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{shortName(r.seccion)}</div>
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleString('es-CO') : ''}</div>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {/* Día 4 */}
        <DiaPanel
          label="☀️ Lunes 4 de mayo"
          recoge={recogeLabel(d4)}
          auth={d4}
          checked={r.d4_checked}
          obs={obs4}
          onObs={setObs4}
          onToggle={() => onToggle(r.id, 'd4_checked', r.d4_checked)}
          onSaveObs={() => onSaveObs(r.id, 'd4_obs', obs4)}
          isSaving={saving[r.id + 'd4_checked']}
        />
        {/* Día 5 */}
        <DiaPanel
          label="🌤️ Martes 5 de mayo"
          recoge={recogeLabel(d5)}
          auth={d5}
          checked={r.d5_checked}
          obs={obs5}
          onObs={setObs5}
          onToggle={() => onToggle(r.id, 'd5_checked', r.d5_checked)}
          onSaveObs={() => onSaveObs(r.id, 'd5_obs', obs5)}
          isSaving={saving[r.id + 'd5_checked']}
        />
      </div>
    </div>
  )
}

function DiaPanel({ label, recoge, auth, checked, obs, onObs, onToggle, onSaveObs, isSaving }) {
  return (
    <div style={{ background: '#060e1e', borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.cardB}` }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 8, color: C.muted }}>{label}</div>
      <div style={{ marginBottom: 8 }}>{recoge}</div>
      {auth.tipo === 'autorizado' && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.6 }}>
          {auth.cedula && <div>CC: {auth.cedula}</div>}
          {auth.parentesco && <div>Parentesco: {auth.parentesco}</div>}
          {auth.celular && <div>Cel: {auth.celular}</div>}
          {auth.placa && <div>Placa: {auth.placa}</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button
          onClick={onToggle}
          disabled={isSaving}
          style={{
            ...S.btnSm(checked ? C.green : '#1a2a1a'),
            border: `1px solid ${checked ? C.green : '#2a4a2a'}`,
            flex: 1,
          }}
        >
          {isSaving ? '...' : checked ? '✅ Recogido' : '⬜ Marcar recogido'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          style={{ ...S.input, fontSize: 12, padding: '6px 10px', flex: 1 }}
          placeholder="Observación..."
          value={obs}
          onChange={e => onObs(e.target.value)}
        />
        <button style={S.btnSm(C.cardB)} onClick={onSaveObs} title="Guardar observación">💾</button>
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ extra }) {
  return (
    <div style={S.header}>
      <img src="/logo80.png" alt="Logo 80 años" style={{ height: 90, width: 'auto', objectFit: 'contain' }} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={S.logoText}>CTH · 80 Años Creando Memorias</div>
        <div style={S.subtitle}>Teatro Metropolitano · 4 y 5 de mayo</div>
      </div>
      {extra}
    </div>
  )
}

// ─── Login directores ─────────────────────────────────────────────────────────
function LoginDirectores({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showChangePin, setShowChangePin] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const storedPin = () => localStorage.getItem('director_pin') || PIN_DEFAULT

  const handleLogin = (e) => {
    e.preventDefault()
    if (pin === storedPin()) {
      onLogin()
    } else {
      setError('PIN incorrecto')
      setTimeout(() => setError(''), 2000)
    }
  }

  const handleChangePin = () => {
    if (newPin.length < 4) return setError('El PIN debe tener al menos 4 caracteres')
    if (newPin !== confirmPin) return setError('Los PINs no coinciden')
    localStorage.setItem('director_pin', newPin)
    setShowChangePin(false)
    setNewPin('')
    setConfirmPin('')
    setError('')
  }

  return (
    <div style={S.page}>
      <Header />
      <div style={{ ...S.container, maxWidth: 400, paddingTop: 60 }}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Acceso Directores</div>

          {!showChangePin ? (
            <form onSubmit={handleLogin}>
              <input
                type="password"
                style={{ ...S.input, textAlign: 'center', fontSize: 20, letterSpacing: 6, marginBottom: 14 }}
                placeholder="••••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
              />
              {error && <div style={{ color: C.red, marginBottom: 10, fontSize: 13 }}>{error}</div>}
              <button type="submit" style={{ ...S.btn(C.blue), width: '100%', marginBottom: 10 }}>Entrar</button>
              <button type="button" style={{ ...S.btnSm('#1a2a3a'), marginTop: 4 }} onClick={() => setShowChangePin(true)}>
                🔑 Cambiar PIN
              </button>
            </form>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Ingresa el PIN actual para confirmar el cambio</div>
              <input type="password" style={{ ...S.input, marginBottom: 10 }} placeholder="PIN actual" value={pin} onChange={e => setPin(e.target.value)} />
              <input type="password" style={{ ...S.input, marginBottom: 10 }} placeholder="Nuevo PIN" value={newPin} onChange={e => setNewPin(e.target.value)} />
              <input type="password" style={{ ...S.input, marginBottom: 14 }} placeholder="Confirmar nuevo PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} />
              {error && <div style={{ color: C.red, marginBottom: 10, fontSize: 13 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...S.btn(C.green), flex: 1 }} onClick={() => {
                  if (pin !== storedPin()) return setError('PIN actual incorrecto')
                  handleChangePin()
                }}>Guardar</button>
                <button style={{ ...S.btn('#334'), flex: 1 }} onClick={() => { setShowChangePin(false); setError('') }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  // URL routing simple: si hay ?panel en la URL → panel
  const isPanel = window.location.search.includes('panel') || window.location.pathname.includes('panel')
  const [view, setView] = useState(isPanel ? 'login' : 'form')
  const [authed, setAuthed] = useState(false)

  // Botón flotante para ir al panel (discreto)
  return (
    <div>
      {view === 'form' && (
        <>
          <FormularioPadres />
          <div style={{ position: 'fixed', bottom: 18, right: 18 }}>
            <button
              style={{ ...S.btnSm('#0c1728'), border: `1px solid ${C.cardB}`, opacity: 0.6, fontSize: 11 }}
              onClick={() => setView('login')}
            >
              Directores
            </button>
          </div>
        </>
      )}
      {view === 'login' && !authed && (
        <LoginDirectores onLogin={() => { setAuthed(true); setView('panel') }} />
      )}
      {view === 'panel' && authed && (
        <PanelDirectores onLogout={() => { setAuthed(false); setView('form') }} />
      )}
    </div>
  )
}
