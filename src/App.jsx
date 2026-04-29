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
                    maxLength={4}
                    style={{ ...S.input, width: 90, textAlign: 'center', letterSpacing: 4, fontWeight: 700, fontSize: 16 }}
                    placeholder="_ _ _ _"
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
function FormularioPadres({ extra }) {
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
  const [duplicado, setDuplicado] = useState(null)  // registro duplicado detectado

  const gradosDisponibles = nivel ? SECCIONES_POR_NIVEL(nivel) : []
  const estudiantes = grado ? ESTUDIANTES[grado] || [] : []

  const resetForm = () => {
    setNivel(''); setGrado(''); setNombre('')
    setDay4(emptyRecoge()); setDay5(emptyRecoge())
    setEditId(null); setIsEditing(false); setSuccess(false); setError(''); setGeneratedPin(''); setDuplicado(null)
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
        // Verificar si ya existe un registro para este estudiante
        const { data: existing } = await supabase
          .from('submissions')
          .select('id, nombre, seccion, submitted_at')
          .eq('nombre', nombre)
          .eq('seccion', seccion)
          .limit(1)
        if (existing && existing.length > 0) {
          setDuplicado(existing[0])
          setLoading(false)
          return
        }
        // CREAR nuevo registro — generar PIN de 4 dígitos
        const pin = Math.floor(1000 + Math.random() * 9000).toString()
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
        <Header extra={extra} />
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
      <Header extra={extra} />
      <div style={S.container}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
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

          {/* ── Sección informativa ── */}
          <div style={{ ...S.card, marginTop: 20, marginBottom: 0, border: `1px solid #d0dce8` }}>
            <div style={{ ...S.sectionTitle, marginBottom: 18 }}>📌 Información importante</div>

            {/* Pico y placa */}
            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b88', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#92610a', fontSize: 14, marginBottom: 8 }}>🚗 Pico y Placa — Medellín</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', border: '1px solid #f59e0b55', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#92610a', fontWeight: 600, marginBottom: 4 }}>☀️ LUNES 4 DE MAYO</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2a3a', letterSpacing: 2 }}>1 · 2</div>
                  <div style={{ fontSize: 11, color: '#5a7a9a', marginTop: 2 }}>Últimos dígitos de placa</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #f59e0b55', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#92610a', fontWeight: 600, marginBottom: 4 }}>🌤️ MARTES 5 DE MAYO</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2a3a', letterSpacing: 2 }}>3 · 4</div>
                  <div style={{ fontSize: 11, color: '#5a7a9a', marginTop: 2 }}>Últimos dígitos de placa</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#92610a', marginTop: 10 }}>⏰ Restricción: 7:00–8:30 a.m. y 5:30–7:00 p.m. · Verifica en <strong>movilidadmedellin.gov.co</strong></div>
            </div>

            {/* Mapa y puntos de recogida */}
            <div style={{ background: '#f0f7ff', border: '1px solid #1d6eed44', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: C.blueL, fontSize: 14, marginBottom: 8 }}>📍 Ubicación y puntos de recogida</div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 10 }}>
                <strong>Teatro Metropolitano José Gutiérrez Gómez</strong><br />
                <span style={{ color: C.muted }}>Calle 41 #57-30, El Centro, Medellín</span>
              </div>
              <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <iframe
                  title="Ubicación Teatro Metropolitano"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.1!2d-75.5741!3d6.2476!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4428e3e9b9a1e7%3A0x6e1e1e1e1e1e1e1e!2sTeatro%20Metropolitano%20Jos%C3%A9%20Guti%C3%A9rrez%20G%C3%B3mez!5e0!3m2!1ses!2sco!4v1"
                  width="100%"
                  height="180"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                />
              </div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 6 }}>🚏 Puntos de recogida:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { emoji: '🟦', label: 'Preescolar', desc: 'Puerta principal — Calle 41' },
                  { emoji: '🟩', label: 'Primaria', desc: 'Costado norte — Carrera 57' },
                  { emoji: '🟧', label: 'Bachillerato', desc: 'Costado sur — Salida lateral' },
                ].map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 6, padding: '7px 10px', border: `1px solid ${C.cardB}` }}>
                    <span style={{ fontSize: 16 }}>{p.emoji}</span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}> — {p.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recomendaciones de seguridad */}
            <div style={{ background: '#f0fff8', border: '1px solid #10b98144', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, color: '#0a7a54', fontSize: 14, marginBottom: 10 }}>🛡️ Recomendaciones de seguridad</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🪪', text: 'La persona autorizada debe presentar su cédula al momento de recoger al estudiante.' },
                  { icon: '⏰', text: 'Llegue puntual al horario de recogida asignado para evitar congestión.' },
                  { icon: '📵', text: 'No envíe a personas no registradas en este formulario. No se entregará el estudiante sin autorización previa.' },
                  { icon: '📞', text: 'Mantenga su celular activo durante el evento por si el colegio necesita contactarle.' },
                  { icon: '🚗', text: 'Si llega en vehículo, respete las zonas señalizadas y las indicaciones del personal de seguridad.' },
                  { icon: '👮', text: 'El personal del colegio verificará la identidad de quien recoge. Este proceso es por la seguridad de su hijo.' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                    <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: C.red + '22', border: `1px solid ${C.red}55`, color: C.red, borderRadius: 8, padding: '12px 16px', marginTop: 16, fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {duplicado && (
            <div style={{ background: '#fff8e1', border: '2px solid #f59e0b', borderRadius: 12, padding: '16px 18px', marginTop: 16 }}>
              <div style={{ fontWeight: 700, color: '#92610a', fontSize: 15, marginBottom: 6 }}>⚠️ Ya existe un registro para este estudiante</div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
                <strong>{duplicado.nombre}</strong> ya fue registrado el {new Date(duplicado.submitted_at).toLocaleString('es-CO')}.
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
                Si quieres modificar ese registro, usa el botón <strong>"¿Ya registraste?"</strong> e ingresa tu PIN. Si de todas formas quieres crear un registro nuevo, confirma abajo.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={S.btn(C.red)}
                  onClick={async () => {
                    setDuplicado(null)
                    setLoading(true)
                    const seccion = grado
                    const pin = Math.floor(1000 + Math.random() * 9000).toString()
                    const newId = crypto.randomUUID()
                    const payload = {
                      nombre, seccion,
                      day4: day4.tipo === 'padres' ? { tipo: 'padres' } : { tipo: 'autorizado', ...day4.auth },
                      day5: day5.tipo === 'padres' ? { tipo: 'padres' } : { tipo: 'autorizado', ...day5.auth },
                    }
                    const { error: err } = await supabase.from('submissions').insert([{ id: newId, pin, ...payload }])
                    setLoading(false)
                    if (err) { setError('Error al enviar: ' + err.message); return }
                    setEditId(newId); setGeneratedPin(pin); setIsEditing(false); setSuccess(true)
                  }}
                >
                  Crear de todas formas
                </button>
                <button type="button" style={S.btn(C.muted)} onClick={() => setDuplicado(null)}>
                  Cancelar
                </button>
              </div>
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

// ─── DATOS LOGÍSTICA ──────────────────────────────────────────────────────────
const COMISIONES = [
  {
    nombre: 'Cubrimiento de ingreso y evacuación al teatro',
    funciones: [
      'Coordinar la apertura y control de accesos al teatro.',
      'Orientar a los estudiantes en puntos de ingreso y salida.',
      'Regular el flujo de personas para evitar congestiones en entradas, pasillos y accesos.',
      'Apoyar la ubicación ordenada de los estudiantes.',
      'Guiar los flujos de evacuación por rutas establecidas y salidas habilitadas.',
      'Evitar aglomeraciones en puertas, corredores y zonas externas.',
      'Orientar al público durante procedimientos de evacuación preventiva o de emergencia.',
      'Reportar novedades o incidentes a coordinación logística.',
    ],
    responsables: [
      'Escaleras 1: Carlos Giraldo', 'Escalera 2: Tomás González', 'Puerta ingreso 3: Sonia Franco',
      'Puerta 4: Diana Restrepo', 'Puerta 6: Mariza Velásquez', 'Puerta 7: Mora Stiberman',
      'Zona externa 8: Giovani Torres', 'Zona Externa 9: Ivón Valenzuela', 'Zona externa 10: Óscar Castañeda',
      'Zona externa 11: Carlos Velásquez', 'Puerta de evacuación 5: Nicolás Naranjo',
      'Escaleras 12: Laura Torres', 'Escaleras 13: Juan Carlos Cadavid', 'Escaleras 14: Darwin Mercado',
    ],
  },
  {
    nombre: 'Escenario laterales',
    funciones: [
      'Apoyar la organización y disposición de accesorios, utilería y elementos requeridos para cada presentación.',
      'Verificar que los materiales y apoyos escénicos estén listos y disponibles.',
      'Asistir en entradas y salidas de participantes hacia el escenario.',
      'Facilitar el movimiento seguro de estudiantes, evitando congestiones o interrupciones durante las presentaciones.',
      'Mantener comunicación constante con coordinación logística, dirección de escenario y responsables de cada presentación.',
      'Reportar novedades, imprevistos o requerimientos que puedan afectar el desarrollo del evento.',
    ],
    responsables: ['Astrid Betancur', 'Vanessa Vivares', 'Camilo Gómez', 'Marlon', 'Diana Ocampo', 'Adriana Cooper', 'Yorman', 'Área de música'],
  },
  {
    nombre: 'Patinadores',
    funciones: [
      'Apoyar en los requerimientos generales de utilería.',
      'Transportar y entregar oportunamente la utilería necesaria durante el evento.',
      'Atender necesidades imprevistas o urgentes que surjan en escenario.',
      'Apoyar montajes y desmontaje.',
      'Estar atentos a instrucciones de coordinación logística para cubrir necesidades emergentes.',
    ],
    responsables: ['William Vélez', 'Victor Vélez', 'Luis Felipe Tejada'],
  },
  {
    nombre: 'Busetas - Carros particulares en el teatro',
    funciones: [
      'Planificar la llegada y ubicación de vehículos.',
      'Organizar rutas y tiempos de transporte.',
      'Coordinar la evacuación ordenada al finalizar el evento.',
      'Garantizar seguridad en movilidad.',
    ],
    responsables: ['Tabares Londoño Santiago', 'Lopez Cardona Cristian Camilo', 'Ruiz Rhenals Nover Alonso', 'Lezer Hila Carolina'],
  },
  {
    nombre: 'Escenografía y elementos digitales',
    funciones: [
      'Diseñar y elaborar elementos de utilería y escenografía.',
      'Crear y gestionar apoyos visuales y digitales.',
      'Coordinar montaje y desmontaje escenográfico.',
      'Verificar funcionalidad técnica antes del evento.',
    ],
    responsables: ['Alvarez Hernandez Ricardo Alberto', 'Gomez Garavito Camilo', 'Velasquez Londoño Luz Mariza', 'Gonzalez Felipe'],
  },
  {
    nombre: 'Utilería / Mantenimiento',
    funciones: [
      'Organizar y distribuir la utilería necesaria.',
      'Apoyar montaje de instrumentos y mobiliario.',
      'Transportar materiales desde el colegio al teatro.',
      'Garantizar el orden y cuidado de los elementos.',
    ],
    responsables: ['Garcia Yorman Augusto', 'Betancur Alzate Andres Felipe', 'Velez Escudero Victor Manuel', 'Velez Escudero William Andres', 'TEJADA BOLIVAR LUIS FELIPE'],
    requerimientos: 'WALKIE TALKIE 12',
  },
  {
    nombre: 'Coordinación y Logística',
    funciones: [
      'Supervisar el desarrollo logístico dentro y fuera del teatro.',
      'Verificar que cada comisión cumpla sus funciones.',
      'Resolver imprevistos en tiempo real.',
      'Mantener comunicación constante entre equipos.',
      'Asegurar la coherencia y fluidez del evento.',
    ],
    responsables: ['Amar Ospina Olga Lucia', 'Zuluaga Gil Alexander', 'Cardona Paola Catalina', 'Nidia Londoño Echeverri', 'Andrea Toledo', 'Sandra Agudelo', 'Andrés Betancur'],
  },
  {
    nombre: 'Comunicaciones / Sistemas',
    funciones: [
      'Gestionar los canales de comunicación interna (radios, mensajes, etc.).',
      'Apoyar el funcionamiento de sistemas tecnológicos.',
      'Coordinar información entre comisiones.',
      'Responder ante fallas técnicas durante el evento.',
    ],
    responsables: ['Lince Gomez Laura', 'Ramirez Agudelo Juan Camilo', 'Giraldo Jaramillo Carlos Mario', 'Cañas Marin Valentina', 'González Tomás'],
  },
  {
    nombre: 'Seguridad',
    funciones: ['Se encarga de toda la seguridad en compañía de la Policía Nacional y autoridades locales.'],
    responsables: ['Hemes Cañaveral Walkie'],
  },
  {
    nombre: 'Coordinadores de sección artístico',
    funciones: [
      'Los coordinadores deben estar todo el tiempo en comunicación con el director general (Camilo Correa), apoyándose con el guión técnico y dando las instrucciones en el espacio que corresponda.',
      'Camerinos preescolar: Patricia Larralde',
      'Carpas primaria: Kelly Pulgarín',
      'Carpas bachillerato: Estefanía Ordóñez',
    ],
    responsables: ['Juán Camilo Correa (Director General)', 'Maria Fernanda Mesa', 'Kelly Pulgarín', 'Estefania Ordóñez'],
    requerimientos: 'Walkie Talkie',
  },
  {
    nombre: 'Carpas Bachillerato',
    funciones: [
      'Directores de grupo y maestros auxiliares/acompañantes.',
      'Coordinar la preparación de los estudiantes para la escena.',
      'Apoyar en logística de vestuario y utilería.',
      'Garantizar organización, puntualidad y flujo hacia el escenario.',
      'Supervisar el comportamiento y cumplimiento de tiempos.',
    ],
    responsables: [
      'Rodriguez España Mario Alberto', 'Torres Arango Giovanny Augusto', 'Marchena Corrales Katty',
      'Castrillon Restrepo Liliana', 'Lorenzo Correa Tahia', 'Rave Ortiz Ferney Osbaldo',
      'Castañeda Guevara Oscar Alexan', 'Naranjo Boza Nicolas', 'Acevedo Acosta Jorge Ohel',
      'Garces Garcia Dayron Fernando', 'Velez Miranda Juan Felipe', 'Salazar Correa Santiago',
      'Suarez Torres Yuliana', 'Gomez Jimenez Diana Marcela', 'Ortiz Moreno Hobbys Oswaldo',
      'Valenzuela Jarmillo Ivon Esther', 'Castaño Escalante Cristian', 'Abraham Mrejen',
    ],
  },
  {
    nombre: 'Dirección Espectáculo',
    funciones: [
      'Coordinar integralmente el desarrollo del espectáculo.',
      'Dirigir desde cabina y tarima.',
      'Asegurar el cumplimiento del guion, tiempos y transiciones.',
      'Tomar decisiones en tiempo real ante imprevistos.',
    ],
    responsables: ['Correa Jiménez Juan Camilo', 'Andres Cardona'],
    requerimientos: 'WALKIE TALKIE',
  },
  {
    nombre: 'Brigada y Protocolos de Bioseguridad',
    funciones: [
      'Diseñar y comunicar los protocolos del evento.',
      'Verificar la asignación y control de asistentes.',
      'Supervisar el cumplimiento de normas de seguridad durante el evento.',
      'Coordinar servicios médicos, ambulancia y atención de emergencias.',
      'Velar por la seguridad general de todos los participantes.',
    ],
    responsables: ['Montoya Tamayo Diana Marcela', 'Henao Escobar Sara', 'Hoyos Zuleta Veronica'],
  },
  {
    nombre: 'Refrigerios',
    funciones: [
      'Organizar la entrega de refrigerios por grupos.',
      'Coordinar la alimentación del personal y equipo logístico.',
      'Garantizar tiempos adecuados de distribución.',
      'Supervisar higiene y manejo adecuado de alimentos.',
    ],
    responsables: ['Vivares Figueroa Vanesa Isabel', 'Franco Correa Sonia Irene', 'Restrepo Gonzalez Diana Yorlen', 'Cristina Cres'],
  },
  {
    nombre: 'Carpas Primaria',
    funciones: [
      'Directores de grupo y maestros auxiliares/acompañantes.',
      'Organizar a los estudiantes antes y después de su presentación.',
      'Supervisar accesorios y vestuario.',
      'Mantener el orden en el espacio asignado.',
      'Acompañar y guiar a los estudiantes en tiempos de espera.',
    ],
    responsables: [
      'Laloum Yael', 'Cartagena Ramírez Edwin Alejandro', 'Lebrun Perez Diana Marcela',
      'Cooper Cooper Adriana Hannah', 'Montes Herrera Daniela', 'Pulgarin Gomez Kelly Andrea',
      'Gomez Agudelo Sirley Johana', 'Zapata Sanchez Valeria', 'Melo Acosta Andres Felipe',
      'Chica Henao Manuela', 'Dorrell Giraldo Jessica', 'Bedoya Marulanda Jennyfer',
      'Pelaez Alvarez Alejandra', 'Montes Zuñiga Sorsy Melina', 'Ortega Vanegas Mariana Lisbeth',
      'Alvarez Molina Diana Cecilia', 'Betancur Ortiz Marco Antonio', 'Gonzalez Suarez Laura',
      'Mazo Meneses Lina Marcela', 'Rosita Kertzman',
    ],
  },
  {
    nombre: 'Camerinos Preschool',
    funciones: [
      'Directores de grupo y maestros auxiliares.',
      'Organizar a los niños para su salida a escena.',
      'Apoyar con vestuario y accesorios.',
      'Mantener el orden, cuidado y acompañamiento permanente.',
      'Garantizar la seguridad y el bienestar de los niños.',
    ],
    responsables: [
      'Goldstein Elaine Cristina', 'Arboleda Morales Isabel Cristina', 'Arias Montoya Sara Maria',
      'Salinas Acosta Luisa Fernanda', 'Solano Guerra Sandra Patricia', 'Preciado Ortiz Nataly',
      'Daza Aristizabal Valentina', 'Arango Giraldo Luisa Maria', 'Lopez Cadavid Valentina',
      'Uran Ramirez Nathalie', 'Agudelo Restrepo Ana Maria', 'Gonzalez Fontalvo Catherine Liseth',
      'Lopez Lopez Liliana Patricia', 'Betancur Gómez Jeniffer', 'Lopez Mejia Carolina',
      'Durango Jaramillo Daniela', 'Monsalve Tobon Paula Andrea', 'Herrera Arenas Natalia',
      'Cano Rendon Manuela',
    ],
    requerimientos: 'Stiberman Mora / Carlos Velásquez',
  },
  {
    nombre: 'Presupuesto',
    funciones: [
      'Aprobar el presupuesto general de todas las comisiones.',
      'Revisar y validar cotizaciones.',
      'Ejecutar y hacer seguimiento a las compras requeridas.',
      'Gestionar la reserva del teatro para ambos días del evento.',
      'Llevar control de gastos y asegurar el cumplimiento del presupuesto asignado.',
    ],
    responsables: ['Nidia Londoño', 'Andrea Toledo', 'Juan Camilo Correa', 'Andrés Cardona'],
  },
  {
    nombre: 'Boletería',
    funciones: [
      'Diseñar e implementar el sistema de boletería digital.',
      'Gestionar la adquisición de boletas con anterioridad.',
      'Llevar registro de asistentes y aforo.',
    ],
    responsables: ['Andrea Toledo', 'Laura Lince', 'Juan Camilo Ramírez', 'Felipe González'],
  },
  {
    nombre: 'Puerta Principal',
    funciones: [
      'Recibir y dar la bienvenida a los asistentes.',
      'Orientar a los padres de familia sobre el ingreso al teatro.',
      'Informar sobre la logística interna (ubicación, tiempos, recomendaciones).',
      'Garantizar un flujo organizado de entrada.',
    ],
    responsables: [
      'Criollo Monsalve Luz Dary', 'Restrepo Granada Luz Elena', 'Nidia Londoño Eceverry',
      'Juan Camilo Ramírez', 'Mariana Tamayo', 'Vivares Figueroa Vanesa Isabel',
      'Franco Correa Sonia Irene', 'Restrepo Gonzalez Diana Yorlen',
    ],
  },
  {
    nombre: 'Camerinos / Escenario',
    funciones: [
      'Coordinar la preparación del elenco antes de salir a escena.',
      'Supervisar el orden y funcionamiento en camerinos.',
      'Asegurar la correcta transición de los estudiantes hacia el escenario.',
      'Apoyar la coordinación musical y técnica durante el espectáculo.',
    ],
    responsables: [
      'Diaz Arcia Edinson Javier', 'Palacio Zuluaga Eliana Marcela', 'Huffington Webster Georgie Bell',
      'Restrepo Vera Marlon', 'Ordóñez Arango Estefania', 'Giraldo Duque Christian David',
      'Toro Perez Lorena', 'Hurtado Rivera Said Enrique',
    ],
  },
]

const CRONOGRAMA = {
  '4 de mayo': [
    { hora: '7:00 – 10:00 am', desc: 'Montaje: Los encargados del montaje deben bajar todo el material para el evento.' },
    { hora: '9:00 am', desc: 'Recogida del personal del Colegio — Envigado' },
    { hora: '9:15 am', desc: 'Recogida del personal del Colegio — San Diego' },
    { hora: '10:00 am – 12:00 m', desc: 'Llegada Elenco: Recepción de estudiantes participantes del elenco teatro, música (solistas) y todo el personal del colegio.' },
    { hora: '11:50 am', desc: 'Inicia recorrido de rutas para primaria y bachillerato.' },
    { hora: '12:00 m – 12:30 pm', desc: 'Almuerzo: Habrá servicio del restaurante CRES para llevar los almuerzos al teatro.' },
    { hora: '1:00 pm', desc: 'Inicio recorrido de rutas para preescolar.' },
    { hora: '1:00 pm', desc: 'Llegada al teatro: Llegada de los estudiantes de primaria y bachillerato, rutas escolares y carros particulares. Todo el equipo logístico estará presente.' },
    { hora: '2:30 pm', desc: 'Llegada al teatro: Llegada de niños de preescolar, rutas escolares y carros particulares.' },
    { tipo: 'nota', desc: 'Todo el equipo logístico estará presente para el acompañamiento y orientación. Se brindarán indicaciones generales y ubicación de los estudiantes en los espacios asignados en los horarios de 1:00 p.m. y 2:30 p.m.' },
    { hora: '4:30 pm', desc: 'Refrigerio para todo el personal y estudiantes. Habrá unos puntos específicos con señalización para hacer entrega de los refrigerios.' },
    { hora: '5:00 pm', desc: '🎵 Calentamiento: Inicia el calentamiento de voces e instrumentos.' },
    { hora: '5:30 pm', desc: '🚪 Apertura de puertas: En ese momento, todas las personas en sus comisiones deben estar en los espacios designados.' },
    { hora: '6:00 pm', desc: '🎭 Inicio del espectáculo. Todas las comisiones deben estar pendientes por si se presenta algún imprevisto.' },
    { hora: '7:30 pm', desc: '🎂 Finalización del espectáculo: Cantar el cumpleaños del colegio. Desde el teatro se darán indicaciones claras para la salida.' },
    { hora: '7:35 pm', desc: '🎓 Entrega de estudiantes: Entrega organizada en la plazoleta del teatro.' },
    { tipo: 'nota', desc: 'Cada estudiante será entregado únicamente a su padre/madre o acudiente autorizado. Se recomienda mantener el orden y seguir indicaciones del equipo logístico.' },
  ],
  '5 de mayo': [
    { hora: '1:00 pm', desc: 'Recogida del personal del Colegio — Envigado' },
    { hora: '1:15 pm', desc: 'Recogida del personal del Colegio — San Diego' },
    { hora: '1:10 pm', desc: 'Inicia recorrido de rutas para primaria y bachillerato.' },
    { hora: '1:50 pm', desc: 'Inicio recorrido de rutas para preescolar.' },
    { hora: '2:00 pm', desc: 'Llegada Elenco: Recepción de estudiantes participantes del elenco teatro, música (solistas) y todo el personal del colegio.' },
    { hora: '2:30 pm', desc: 'Llegada al teatro: Llegada de los estudiantes de primaria y bachillerato, rutas escolares y carros particulares.' },
    { tipo: 'nota', desc: 'Todo el equipo logístico estará presente para el acompañamiento y orientación. Se brindarán indicaciones generales y ubicación de los estudiantes en los espacios asignados en los horarios de 2:30 p.m.' },
    { hora: '3:00 pm', desc: 'Llegada al teatro: Llegada de niños de preescolar, rutas escolares y carros particulares.' },
    { hora: '4:30 pm', desc: 'Refrigerio para todo el personal y estudiantes. Habrá unos puntos específicos con señalización para hacer entrega de los refrigerios.' },
    { hora: '5:00 pm', desc: '🎵 Calentamiento: Inicia el calentamiento de voces e instrumentos.' },
    { hora: '5:30 pm', desc: '🚪 Apertura de puertas — En ese momento todas las personas en sus comisiones deben estar en los espacios designados.' },
    { hora: '6:00 pm', desc: '🎭 Inicio del espectáculo. Todas las comisiones deben estar pendientes por si se presenta algún imprevisto.' },
    { hora: '7:30 pm', desc: '🎂 Finalización del espectáculo: Cantar el cumpleaños del colegio. Desde el teatro se darán indicaciones claras para la salida.' },
    { tipo: 'nota', desc: 'Todo el equipo logístico estará presente para el acompañamiento y orientación. Se brindarán indicaciones generales y ubicación de los estudiantes en los espacios asignados en los horarios de 3:00 p.m.' },
    { hora: '7:35 pm', desc: '🎓 Entrega de estudiantes: Entrega organizada en la plazoleta del teatro.' },
    { hora: '7:45 pm', desc: '🔧 Desmontaje: Todo el personal colaborará con el desmontaje y ayudará a subirlo al camión que llevará los instrumentos y silletería del colegio.' },
    { tipo: 'nota', desc: 'Cada estudiante será entregado únicamente a su padre/madre o acudiente autorizado al finalizar el evento. Se recomienda mantener el orden y seguir indicaciones del equipo logístico.' },
  ],
}

const LINEAMIENTOS = [
  'Todos los equipos deben asistir a los ensayos generales.',
  'Cada comisión debe conocer sus funciones y las de los demás.',
  'Se debe mantener comunicación permanente durante el evento.',
  'Ante cualquier situación, se debe informar a Coordinaciones y equipo logístico.',
  'Se debe priorizar siempre la seguridad de los estudiantes.',
]

// ─── VISTA LOGÍSTICA ──────────────────────────────────────────────────────────
function LogisticaView({ onBack }) {
  const [tab, setTab] = useState('buscar')
  const [busqueda, setBusqueda] = useState('')
  const [diaActivo, setDiaActivo] = useState('4 de mayo')

  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  // Coincidencia flexible: todas las palabras buscadas deben aparecer en el nombre (en cualquier orden)
  const matchNombre = (responsable, termino) => {
    const normedR = norm(responsable)
    const palabras = norm(termino).trim().split(/\s+/).filter(Boolean)
    return palabras.every(p => normedR.includes(p))
  }

  // Buscar persona en todas las comisiones
  const resultadosBusqueda = busqueda.trim().length >= 2
    ? COMISIONES.filter(c =>
        c.responsables.some(r => matchNombre(r, busqueda))
      ).map(c => ({
        ...c,
        coincidentes: c.responsables.filter(r => matchNombre(r, busqueda))
      }))
    : []

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: '10px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        background: tab === id ? C.blue : 'transparent',
        color: tab === id ? '#fff' : C.muted,
        border: 'none', borderBottom: tab === id ? `3px solid ${C.blueL}` : '3px solid transparent',
        fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={S.page}>
      <Header extra={
        <button onClick={onBack} style={{ background: '#1d3a6e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          ← Volver
        </button>
      } />
      <div style={{ ...S.container, maxWidth: 760 }}>
        {/* Cabecera */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#1d3a6e', letterSpacing: 1 }}>
            📋 Logística — Espectáculo 80 Años
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Teatro Metropolitano · 4 y 5 de mayo de 2026</div>
        </div>

        {/* Lineamientos */}
        <div style={{ ...S.card, background: '#f0f7ff', border: `1px solid ${C.blue}44`, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: C.blueL, fontSize: 14, marginBottom: 10 }}>🎯 Objetivo y lineamientos generales</div>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 10, fontStyle: 'italic' }}>
            Organizar, orientar y garantizar el adecuado desarrollo del espectáculo de los 80 años del colegio, asegurando una ejecución coordinada, segura y exitosa del evento.
          </div>
          {LINEAMIENTOS.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ color: C.blue, fontWeight: 800, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Fases de la operación logística */}
        <div style={{ ...S.card, marginBottom: 20, background: '#fafbff', border: `1px solid ${C.cardB}` }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, color: '#1d3a6e', marginBottom: 20, letterSpacing: 0.5, borderLeft: '4px solid #b8972e', paddingLeft: 12 }}>
            FASES DE LA OPERACIÓN LOGÍSTICA
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              {
                emoji: '✅',
                label: 'Antes',
                desc: 'Verificación de espacios y materiales. Ensayo general y preparación de comisiones.',
                color: '#10b981',
              },
              {
                emoji: '▶️',
                label: 'Durante',
                desc: 'Sincronía total con el espectáculo. Información inmediata a coordinaciones ante cualquier novedad.',
                color: '#1d6eed',
              },
              {
                emoji: '📦',
                label: 'Después',
                desc: 'Salida organizada. Entrega ordenada de estudiantes y colaboración en desmontaje.',
                color: '#b8972e',
              },
            ].map((fase) => (
              <div key={fase.label} style={{ background: '#fff', border: `1px solid ${C.cardB}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 36 }}>{fase.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 15, fontStyle: 'italic', color: '#1d3a6e' }}>{fase.label}</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{fase.desc}</div>
                <div style={{ width: '60%', height: 3, background: fase.color, borderRadius: 4, marginTop: 6 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: '12px 12px 0 0', border: `1px solid ${C.cardB}`, borderBottom: 'none', overflow: 'hidden', marginBottom: 0 }}>
          <TabBtn id="buscar" label="🔍 Mi comisión" />
          <TabBtn id="comisiones" label="📋 Todas las comisiones" />
          <TabBtn id="cronograma" label="🕐 Cronograma" />
          <TabBtn id="mapa" label="🗺️ Mapa" />
        </div>
        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', border: `1px solid ${C.cardB}`, padding: '20px 18px', marginBottom: 20 }}>

          {/* Tab: Buscar mi comisión */}
          {tab === 'buscar' && (
            <div>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>Escribe tu nombre para ver a qué comisión perteneces y cuáles son tus funciones.</div>
              <input
                style={{ ...S.input, marginBottom: 16, fontSize: 15 }}
                placeholder="Ej: Sonia Franco, Carlos Giraldo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
              {busqueda.trim().length >= 2 && resultadosBusqueda.length === 0 && (
                <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                  No se encontró ninguna coincidencia para "<strong>{busqueda}</strong>".
                </div>
              )}
              {resultadosBusqueda.map((c, i) => (
                <div key={i} style={{ border: `2px solid ${C.blue}55`, borderRadius: 12, padding: '16px 18px', marginBottom: 14, background: '#f8fbff' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, fontWeight: 800, color: C.blueL, marginBottom: 4 }}>{c.nombre}</div>
                  {c.requerimientos && (
                    <div style={{ ...S.tag('#f59e0b'), marginBottom: 10, display: 'inline-block' }}>🔧 {c.requerimientos}</div>
                  )}
                  <div style={{ marginBottom: 10 }}>
                    {c.coincidentes.map((r, j) => (
                      <div key={j} style={{ display: 'inline-block', background: C.green + '22', color: C.green, border: `1px solid ${C.green}55`, borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700, marginRight: 6, marginBottom: 4 }}>
                        ✅ {r}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, marginBottom: 6 }}>Funciones:</div>
                  {c.funciones.map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                      <span style={{ color: C.blue, flexShrink: 0 }}>›</span>
                      <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              ))}
              {busqueda.trim().length < 2 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 13 }}>
                  Escribe al menos 2 caracteres para buscar.
                </div>
              )}
            </div>
          )}

          {/* Tab: Todas las comisiones */}
          {tab === 'comisiones' && (
            <div>
              {COMISIONES.map((c, i) => (
                <details key={i} style={{ marginBottom: 10, border: `1px solid ${C.cardB}`, borderRadius: 10, overflow: 'hidden' }}>
                  <summary style={{ padding: '13px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#f5f8fc', color: C.blueL, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{c.nombre}</span>
                    {c.requerimientos && <span style={{ ...S.tag('#f59e0b'), fontSize: 11 }}>🔧 {c.requerimientos}</span>}
                  </summary>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Responsables</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {c.responsables.map((r, j) => (
                          <span key={j} style={{ background: '#e8f0fb', color: '#1d3a6e', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{r}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Funciones</div>
                    {c.funciones.map((f, j) => (
                      <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                        <span style={{ color: C.blue, flexShrink: 0 }}>›</span>
                        <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}

          {/* Tab: Cronograma */}
          {tab === 'cronograma' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                {['4 de mayo', '5 de mayo'].map(d => (
                  <button key={d} onClick={() => setDiaActivo(d)} style={{
                    flex: 1, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 8,
                    background: diaActivo === d ? C.blue : '#f5f8fc',
                    color: diaActivo === d ? '#fff' : C.muted,
                    border: `1px solid ${diaActivo === d ? C.blueL : C.cardB}`,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {d === '4 de mayo' ? '☀️ Lunes 4 de mayo' : '🌤️ Martes 5 de mayo'}
                  </button>
                ))}
              </div>
              {CRONOGRAMA[diaActivo].map((item, i) => (
                item.tipo === 'nota'
                  ? (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 110, flexShrink: 0 }} />
                      <div style={{ flex: 1, background: '#fffbea', border: '1px solid #f59e0b88', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#7c5a00', lineHeight: 1.5 }}>
                        <strong>📌 Nota:</strong> {item.desc}
                      </div>
                    </div>
                  ) : (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 110, fontSize: 12, fontWeight: 800, color: C.blue, textAlign: 'right', paddingTop: 2, flexShrink: 0 }}>{item.hora}</div>
                      <div style={{ width: 3, background: C.cardB, borderRadius: 4, alignSelf: 'stretch', flexShrink: 0 }} />
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  )
              ))}
            </div>
          )}

          {/* Tab: Mapa */}
          {tab === 'mapa' && (
            <div>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>Plano del evento. Pellizca o usa el scroll para hacer zoom.</div>
              <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.cardB}` }}>
                <img
                  src="/mapadeleevnto.jpg"
                  alt="Mapa del evento"
                  style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
                  onClick={e => {
                    if (e.target.style.width === '100%') {
                      e.target.style.width = '200%'
                      e.target.style.cursor = 'zoom-out'
                    } else {
                      e.target.style.width = '100%'
                      e.target.style.cursor = 'zoom-in'
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Frase motivacional */}
        <div style={{ textAlign: 'center', fontSize: 13, color: C.muted, fontStyle: 'italic', marginTop: 10 }}>
          "Este evento es el reflejo del trabajo, la dedicación y el amor por nuestra comunidad educativa.<br />Cada rol es fundamental para que este espectáculo sea una experiencia inolvidable."
        </div>
      </div>
    </div>
  )
}

// ─── LOGIN LOGÍSTICA ──────────────────────────────────────────────────────────
function LoginLogistica({ onLogin, onBack }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const PIN_LOG = 'herzl80'

  const handleLogin = (e) => {
    e.preventDefault()
    if (pin === PIN_LOG) { onLogin() }
    else { setError('PIN incorrecto'); setPin('') }
  }

  return (
    <div style={S.page}>
      <Header extra={
        <button onClick={onBack} style={{ background: '#1d3a6e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          ← Volver
        </button>
      } />
      <div style={{ ...S.container, maxWidth: 380, paddingTop: 60 }}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Logística — Personal Colegio</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Esta sección es solo para docentes, directivos y personal de servicio.</div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              style={{ ...S.input, textAlign: 'center', fontSize: 20, letterSpacing: 6, marginBottom: 14 }}
              placeholder="••••••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
            />
            {error && <div style={{ color: C.red, marginBottom: 10, fontSize: 13 }}>{error}</div>}
            <button type="submit" style={{ ...S.btn(C.blue), width: '100%' }}>Ingresar</button>
          </form>
        </div>
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
        <button
          style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3 }}
          onClick={onLogout}
        >
          🚪 Cerrar
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
    <div style={{ ...S.header, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px' }}>
      <div style={{ width: 120 }} />
      <img src="/logo80.png" alt="Logo 80 años" style={{ height: 120, width: 'auto', objectFit: 'contain' }} />
      <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end' }}>{extra}</div>
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
              <button type="submit" style={{ ...S.btn(C.blue), width: '100%' }}>Entrar</button>
            </form>
          ) : null}
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
  const [logAuthed, setLogAuthed] = useState(false)

  const extraBtns = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button
        style={{ background: '#1d6e3a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3 }}
        onClick={() => setView(logAuthed ? 'logistica' : 'loginLogistica')}
      >
        📋 Logística
      </button>
      <button
        style={{ background: '#1d3a6e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3 }}
        onClick={() => setView('login')}
      >
        🔐 Directores
      </button>
    </div>
  )

  return (
    <div>
      {view === 'form' && <FormularioPadres extra={extraBtns} />}
      {view === 'login' && !authed && (
        <LoginDirectores onLogin={() => { setAuthed(true); setView('panel') }} />
      )}
      {view === 'panel' && authed && (
        <PanelDirectores onLogout={() => { setAuthed(false); setView('form') }} />
      )}
      {view === 'loginLogistica' && (
        <LoginLogistica
          onLogin={() => { setLogAuthed(true); setView('logistica') }}
          onBack={() => setView('form')}
        />
      )}
      {view === 'logistica' && logAuthed && (
        <LogisticaView onBack={() => setView('form')} />
      )}
    </div>
  )
}
