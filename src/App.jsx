import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ESTUDIANTES } from './estudiantes.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

// Obtener grados (secciones reales) filtrados por nivel, con nombre legible
const SECCIONES_POR_NIVEL = (nivel) =>
  SECCIONES
    .filter(s => NIVEL_MAP[s.split(' - ')[0]] === nivel)
    .sort((a, b) => {
      const ia = GRADOS_ORDEN.indexOf(a.split(' - ')[0])
      const ib = GRADOS_ORDEN.indexOf(b.split(' - ')[0])
      return ia !== ib ? ia - ib : a.localeCompare(b)
    })

// Nombre legible de sección: "K3 Alef", "Cuarto Bet", etc.
const nombreSeccion = (sec) => {
  const grado = sec.split(' - ')[0]
  const div = sec.endsWith('Alef') ? 'Alef' : 'Bet'
  return `${grado} ${div}`
}

// Obtener la sección real de un estudiante dado grado y nombre
const seccionDeEstudiante = (grado, nombre) => {
  return SECCIONES.find(s => s.startsWith(grado + ' - ') && (ESTUDIANTES[s] || []).includes(nombre)) || grado
}

const emptyAuth = () => ({ nombre: '', cedula: '', placa: '', parentesco: '', celular: '' })
const emptyRecoge = () => ({ tipo: '', auth: emptyAuth() })

// ─── Colores ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#f0f4f9', card: '#ffffff', cardB: '#d0dce8',
  blue: '#1d6eed', blueL: '#1a5abf',
  text: '#1a2a3a', muted: '#5a7a9a',
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
  input: { width: '100%', background: '#f5f8fc', border: `1px solid ${C.cardB}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', background: '#f5f8fc', border: `1px solid ${C.cardB}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', cursor: 'pointer' },
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
          <option value="padres">Padres</option>
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
              <Campo label="Placa del vehículo" value={value.auth.placa} onChange={v => onChange({ ...value, auth: { ...value.auth, placa: v } })} placeholder="Ej. ABC123" required />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Buscar y editar registro existente ──────────────────────────────────────
function BuscarRegistro({ onEditar, onOpenChange }) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [sinResultados, setSinResultados] = useState(false)
  const [pinCheck, setPinCheck] = useState({})     // { [id]: { input, error, visible } }

  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

  const buscar = async () => {
    if (!busqueda.trim()) return
    setBuscando(true); setSinResultados(false); setResultados([])
    // Traer todos y filtrar localmente para tolerar tildes y mayúsculas
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    setBuscando(false)
    if (error) { setSinResultados(true); return }
    const termino = norm(busqueda.trim())
    const filtrados = (data || []).filter(r => norm(r.nombre || '').includes(termino)).slice(0, 10)
    if (filtrados.length === 0) { setSinResultados(true); return }
    setResultados(filtrados)
  }

  if (!open) return (
    <div style={{ marginBottom: 20, textAlign: 'center' }}>
      <button type="button" style={{ ...S.btn(C.muted), fontSize: 13, padding: '8px 18px' }} onClick={() => { setOpen(true); onOpenChange?.(true) }}>
        🔍 ¿Ya registraste? Busca y edita tu registro
      </button>
    </div>
  )

  return (
    <div style={{ ...S.card, marginBottom: 20, border: `1px solid ${C.yellow}66` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ ...S.sectionTitle, marginBottom: 0 }}>🔍 Buscar registro existente</div>
        <button type="button" onClick={() => { setOpen(false); setBusqueda(''); setResultados([]); onOpenChange?.(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          style={{ ...S.input, flex: 1 }}
          placeholder="Escribe el nombre del estudiante..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setSinResultados(false) }}
          onKeyDown={e => e.key === 'Enter' && buscar()}
        />
        <button type="button" style={S.btn(C.blue)} onClick={buscar} disabled={buscando}>
          {buscando ? '...' : 'Buscar'}
        </button>
      </div>
      {sinResultados && <div style={{ color: C.muted, fontSize: 14 }}>No se encontró ningún registro con ese nombre.</div>}
      {resultados.map(reg => (
        <div key={reg.id} style={{ background: '#f8fbff', border: `1px solid ${C.cardB}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{reg.nombre}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{nombreSeccion(reg.seccion)} · Lunes: {reg.day4?.tipo === 'padres' ? 'Papá/Mamá' : reg.day4?.nombre || '—'} · Martes: {reg.day5?.tipo === 'padres' ? 'Papá/Mamá' : reg.day5?.nombre || '—'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 180 }}>
            {!pinCheck[reg.id]?.visible ? (
              <button
                type="button"
                style={S.btn(C.yellow)}
                onClick={() => setPinCheck(p => ({ ...p, [reg.id]: { input: '', error: '', visible: true } }))}
              >
                ✏️ Editar
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>🔐 Ingresa tu PIN:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    style={{ ...S.input, width: 110, textAlign: 'center', letterSpacing: 4, fontWeight: 700, fontSize: 16 }}
                    placeholder="_ _ _ _ _ _"
                    value={pinCheck[reg.id]?.input || ''}
                    onChange={e => setPinCheck(p => ({ ...p, [reg.id]: { ...p[reg.id], input: e.target.value, error: '' } }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (pinCheck[reg.id]?.input === reg.pin) { onEditar(reg); setOpen(false); onOpenChange?.(false) }
                        else setPinCheck(p => ({ ...p, [reg.id]: { ...p[reg.id], error: 'PIN incorrecto' } }))
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    style={S.btn(C.green)}
                    onClick={() => {
                      if (pinCheck[reg.id]?.input === reg.pin) { onEditar(reg); setOpen(false); onOpenChange?.(false) }
                      else setPinCheck(p => ({ ...p, [reg.id]: { ...p[reg.id], error: 'PIN incorrecto' } }))
                    }}
                  >✓</button>
                  <button
                    type="button"
                    style={S.btn(C.muted)}
                    onClick={() => setPinCheck(p => ({ ...p, [reg.id]: { input: '', error: '', visible: false } }))}
                  >✕</button>
                </div>
                {pinCheck[reg.id]?.error && (
                  <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>⚠️ {pinCheck[reg.id].error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
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
  const [editId, setEditId] = useState(null)   // id del registro guardado
  const [isEditing, setIsEditing] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [generatedPin, setGeneratedPin] = useState('')

  const gradosDisponibles = nivel ? SECCIONES_POR_NIVEL(nivel) : []
  const estudiantes = grado ? ESTUDIANTES[grado] || [] : []

  const resetForm = () => {
    setNivel(''); setGrado(''); setNombre('')
    setDay4(emptyRecoge()); setDay5(emptyRecoge())
    setEditId(null); setIsEditing(false); setSuccess(false); setError(''); setGeneratedPin('')
  }

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
    const seccion = grado
    const payload = {
      nombre, seccion,
      day4: day4.tipo === 'padres' ? { tipo: 'padres' } : { tipo: 'autorizado', ...day4.auth },
      day5: day5.tipo === 'padres' ? { tipo: 'padres' } : { tipo: 'autorizado', ...day5.auth },
    }
    try {
      if (isEditing && editId) {
        // ACTUALIZAR registro existente
        const { error: err } = await supabase.from('submissions').update(payload).eq('id', editId)
        if (err) throw err
      } else {
        // CREAR nuevo registro — generar PIN de 6 dígitos
        const pin = Math.floor(100000 + Math.random() * 900000).toString()
        const newId = crypto.randomUUID()
        const { error: err } = await supabase.from('submissions').insert([{ id: newId, pin, ...payload }])
        if (err) throw err
        setEditId(newId)
        setGeneratedPin(pin)
      }
      setIsEditing(false)
      setSuccess(true)
    } catch (e) {
      setError('Error al enviar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const ResumenDia = ({ label, recoge }) => (
      <div style={{ background: '#f8fbff', border: `1px solid ${C.cardB}`, borderRadius: 10, padding: '14px 16px', textAlign: 'left', flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 700, color: C.blueL, fontSize: 14, marginBottom: 8 }}>{label}</div>
        {recoge.tipo === 'padres' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.green, fontWeight: 600, fontSize: 14 }}>
            👨‍👩‍👧 Papá / Mamá
          </div>
        ) : recoge.tipo === 'autorizado' ? (
          <div style={{ fontSize: 13, color: C.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>👤 <strong>{recoge.auth.nombre}</strong></div>
            <div style={{ color: C.muted }}>🪪 Cédula: {recoge.auth.cedula}</div>
            <div style={{ color: C.muted }}>🤝 Parentesco: {recoge.auth.parentesco}</div>
            <div style={{ color: C.muted }}>📱 Celular: {recoge.auth.celular}</div>
            {recoge.auth.placa && <div style={{ color: C.muted }}>🚗 Placa: {recoge.auth.placa}</div>}
          </div>
        ) : <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
      </div>
    )

    return (
      <div style={S.page}>
        <Header />
        <div style={{ ...S.container, paddingTop: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: C.green, marginBottom: 8 }}>
              ¡Formulario enviado!
            </div>
            <div style={{ color: C.muted, fontSize: 14 }}>
              Información registrada para <strong style={{ color: C.text }}>{nombre}</strong> · {nombreSeccion(grado)}
            </div>

            {generatedPin && (
              <div style={{ marginTop: 22, background: '#fff8e1', border: '2px solid #f59e0b', borderRadius: 14, padding: '18px 24px', display: 'inline-block', minWidth: 260 }}>
                <div style={{ fontSize: 13, color: '#92610a', fontWeight: 600, marginBottom: 6 }}>🔐 Tu PIN de edición</div>
                <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 8, color: '#1a2a3a', fontFamily: 'monospace' }}>{generatedPin}</div>
                <div style={{ fontSize: 12, color: '#92610a', marginTop: 8, lineHeight: 1.5 }}>
                  ⚠️ <strong>Guarda este PIN.</strong> Lo necesitarás si en el futuro<br/>quieres modificar la información de este registro.
                </div>
              </div>
            )}
          </div>

          {/* Resumen */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ ...S.sectionTitle, marginBottom: 16 }}>📋 Resumen del registro</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <ResumenDia label="☀️ Lunes 4 de mayo" recoge={day4} />
              <ResumenDia label="🌤️ Martes 5 de mayo" recoge={day5} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={S.btn(C.yellow)} onClick={() => { setSuccess(false); setIsEditing(true); setError('') }}>
              ✏️ Corregir información
            </button>
            <button style={S.btn(C.blue)} onClick={resetForm}>
              Registrar otro estudiante
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <Header />
      <div style={S.container}>
        <div style={{ marginBottom: 24 }}>
          {isEditing && (
            <div style={{ background: C.yellow + '22', border: `1px solid ${C.yellow}88`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: C.yellow, fontWeight: 600 }}>
              ✏️ Modo edición — Corrige los datos y vuelve a enviar el formulario.
            </div>
          )}
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
            Formulario de Recogida
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>
            Teatro Metropolitano de Medellín · Lunes 4 y Martes 5 de mayo
          </div>
        </div>

        {/* ── Buscar registro existente ── */}
        {!isEditing && <BuscarRegistro
          onOpenChange={setBuscadorAbierto}
          onEditar={(reg) => {
          // Detectar nivel y grado a partir de la sección guardada
          const sec = reg.seccion
          const gradoKey = sec ? sec.split(' - ')[0] : ''
          const nivelDetectado = NIVEL_MAP[gradoKey] || ''
          setNivel(nivelDetectado)
          setGrado(sec)
          setNombre(reg.nombre)
          // Reconstruir day4 y day5
          const toRecoge = (d) => d.tipo === 'padres'
            ? { tipo: 'padres', auth: emptyAuth() }
            : { tipo: 'autorizado', auth: { nombre: d.nombre||'', cedula: d.cedula||'', placa: d.placa||'', parentesco: d.parentesco||'', celular: d.celular||'' } }
          setDay4(toRecoge(reg.day4 || {}))
          setDay5(toRecoge(reg.day5 || {}))
          setEditId(reg.id)
          setIsEditing(true)
          setError('')
        }} />}
        {!buscadorAbierto && <form onSubmit={handleSubmit}>
          {/* Sección y nombre */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Datos del Estudiante</div>
            {isEditing ? (
              /* En edición: mostrar solo texto, no se puede cambiar el estudiante */
              <div style={{ background: '#f0f4f9', border: `1px solid ${C.cardB}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 500 }}>Estudiante</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{nombre}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{grado ? nombreSeccion(grado) : ''}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>🔒 El estudiante no se puede cambiar en modo edición.</div>
              </div>
            ) : (
              <>
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
                    {gradosDisponibles.map(g => <option key={g} value={g}>{nombreSeccion(g)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Nombre del estudiante <span style={{ color: C.red }}>*</span></label>
                  <select style={S.select} value={nombre} onChange={e => setNombre(e.target.value)} required disabled={!grado}>
                    <option value="">— Selecciona el nombre —</option>
                    {estudiantes.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </>
            )}
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
            {loading ? 'Enviando...' : isEditing ? '💾 Guardar cambios' : '📨 Enviar formulario'}
          </button>
        </form>}
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

  // ─── Tiempo real: escuchar cambios en submissions ─────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('submissions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSubmissions(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setSubmissions(prev => prev.map(r => r.id === payload.new.id ? payload.new : r))
        } else if (payload.eventType === 'DELETE') {
          setSubmissions(prev => prev.filter(r => r.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

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
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const matchBus = !busqueda || norm(r.nombre).includes(norm(busqueda))
    if (!matchSec || !matchBus) return false
    if (filtroDia === 'd4_pendiente') return !r.d4_checked
    if (filtroDia === 'd5_pendiente') return !r.d5_checked
    return true
  })

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const secLabel = filtroSec ? nombreSeccion(filtroSec) : 'Todos los grupos'
    const diaLabel = filtroDia === 'todos' ? 'Ambos días' : filtroDia === 'lunes' ? 'Lunes 4 de mayo' : 'Martes 5 de mayo'

    // Encabezado
    doc.setFontSize(16)
    doc.setTextColor(29, 110, 237)
    doc.text('CTH · 80 Años Creando Memorias', 14, 14)
    doc.setFontSize(10)
    doc.setTextColor(90, 122, 154)
    doc.text(`Listado de Recogida · ${secLabel} · ${diaLabel}`, 14, 21)
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 27)

    const head = [['Estudiante', 'Grado', 'Lunes 4 - Quien recoge', 'Recogido Lunes', 'Martes 5 - Quien recoge', 'Recogido Martes']]
    const body = filtered.map(r => {
      const d4 = r.day4 || {}
      const d5 = r.day5 || {}
      const fmt = (d) => d.tipo === 'padres'
        ? 'Papa / Mama'
        : d.tipo === 'autorizado'
          ? `${d.nombre || ''}\nCC: ${d.cedula || ''} - ${d.parentesco || ''}\nCel: ${d.celular || ''}${d.placa ? ' - Placa: ' + d.placa : ''}`
          : '-'
      return [
        r.nombre,
        nombreSeccion(r.seccion),
        fmt(d4),
        r.d4_checked ? 'Si' : '-',
        fmt(d5),
        r.d5_checked ? 'Si' : '-',
      ]
    })

    autoTable(doc, {
      startY: 32,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [29, 110, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 249] },
      columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 26 }, 2: { cellWidth: 62 }, 3: { cellWidth: 26 }, 4: { cellWidth: 62 }, 5: { cellWidth: 26 } },
      didParseCell: (data) => {
        // Columnas 2 y 3 = Lunes (azul claro)
        if (data.column.index === 2 || data.column.index === 3) {
          if (data.section === 'head') data.cell.styles.fillColor = [30, 90, 180]
          else data.cell.styles.fillColor = [220, 234, 255]
        }
        // Columnas 4 y 5 = Martes (verde claro)
        if (data.column.index === 4 || data.column.index === 5) {
          if (data.section === 'head') data.cell.styles.fillColor = [14, 130, 100]
          else data.cell.styles.fillColor = [210, 245, 230]
        }
      },
    })

    const secFile = filtroSec ? nombreSeccion(filtroSec).replace(/\s+/g, '_') : 'todas'
    doc.save(`recogida_cth80_${secFile}_${filtroDia}.pdf`)
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
              <label style={S.label}>📚 Filtrar por grupo</label>
              <select style={S.select} value={filtroSec} onChange={e => setFiltroSec(e.target.value)}>
                <option value="">Todos los grupos</option>
                {[...SECCIONES].sort((a, b) => {
                  const ia = GRADOS_ORDEN.indexOf(a.split(' - ')[0])
                  const ib = GRADOS_ORDEN.indexOf(b.split(' - ')[0])
                  return ia !== ib ? ia - ib : a.localeCompare(b)
                }).map(s => <option key={s} value={s}>{shortName(s)}</option>)}
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
              <button style={S.btnSm(C.green)} onClick={exportPDF} title="Exportar vista actual a PDF">
                ⬇️ Exportar PDF
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
          {r.pin && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, background: '#fff8e1', border: '1px solid #f59e0b99', borderRadius: 6, padding: '2px 8px' }}>
              <span style={{ fontSize: 11, color: '#92610a', fontWeight: 600 }}>🔑 PIN:</span>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: '#1a2a3a', fontFamily: 'monospace' }}>{r.pin}</span>
            </div>
          )}
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
    <div style={{ background: '#f5f8fc', borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.cardB}` }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 8, color: C.blueL }}>{label}</div>
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
