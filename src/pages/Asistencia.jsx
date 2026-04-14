import { useState, useMemo } from 'react'
import {
  PlusIcon, TrashIcon, XIcon, FloppyDiskIcon, CalendarCheckIcon,
  TrophyIcon, ChartBarIcon, ClipboardTextIcon, CheckCircleIcon,
  PencilSimpleIcon, MapPinIcon,
} from '@phosphor-icons/react'
import { useAsistencia, TIPOS_ENSAYO, ESTADOS } from '../contexts/AsistenciaContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useAuth } from '../contexts/AuthContext'
import { useNotificaciones } from '../contexts/NotificacionesContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/** Normaliza cualquier formato de fecha a YYYY-MM-DD */
function normFecha(f) {
  if (!f) return ''
  const s = String(f)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s      // ya es YYYY-MM-DD
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

/** Parsea fecha a Date evitando el problema del timezone al concatenar */
function parseDate(fecha) {
  if (!fecha) return new Date(NaN)
  const s = String(fecha)
  return s.includes('T') ? new Date(s) : new Date(s + 'T12:00:00')
}

function fmtFecha(fecha) {
  const d = parseDate(fecha)
  if (isNaN(d.getTime())) return fecha || ''
  return d.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const ESTADO_CLASES = {
  presente:    'bg-green-100  text-green-700  border-green-300  ring-green-400',
  tardanza:    'bg-yellow-100 text-yellow-700 border-yellow-300 ring-yellow-400',
  ausente:     'bg-red-100    text-red-700    border-red-300    ring-red-400',
  justificado: 'bg-blue-100   text-blue-700   border-blue-300   ring-blue-400',
}

const MEDAL_ICON = ['🥇','🥈','🥉']

// ── Modal Ensayo ──────────────────────────────────────────────────────────────

function ModalEnsayo({ ensayo = null, onClose, onSave }) {
  const { ensayos } = useAsistencia()
  const hoy = new Date().toISOString().slice(0, 10)

  // Ubicaciones únicas de ensayos anteriores que tengan lat/lng
  const ubicacionesPrevias = useMemo(() => {
    const vistas = new Set()
    return ensayos
      .filter(e => e.lat && e.lng && e.id !== ensayo?.id)
      .filter(e => {
        const key = `${parseFloat(e.lat).toFixed(3)},${parseFloat(e.lng).toFixed(3)}`
        if (vistas.has(key)) return false
        vistas.add(key)
        return true
      })
      .slice(0, 5)
  }, [ensayos, ensayo?.id])

  const [form, setForm] = useState({
    titulo:      ensayo?.titulo      || '',
    tipo:        ensayo?.tipo        || 'ensayo',
    fecha:       normFecha(ensayo?.fecha) || hoy,
    hora:        ensayo?.hora        || '18:00',
    descripcion: ensayo?.descripcion || '',
    lat:         ensayo?.lat         || '',
    lng:         ensayo?.lng         || '',
  })
  const [gpsLoading, setGpsLoading] = useState(false)

  const capturarUbicacion = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }))
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true }
    )
  }
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fecha) return
    setLoading(true)
    const titulo = form.titulo.trim() || TIPOS_ENSAYO[form.tipo]?.label || 'Ensayo'
    await onSave({ ...form, titulo })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {ensayo ? 'Editar Ensayo' : 'Nuevo Ensayo'}
          </h2>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                {Object.entries(TIPOS_ENSAYO).map(([k, v]) =>
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">Título (opcional)</label>
              <input className="input" value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder={TIPOS_ENSAYO[form.tipo]?.label} />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input className="input" type="date" value={form.fecha}
                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Hora</label>
              <input className="input" type="time" value={form.hora}
                onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción (opcional)</label>
              <textarea className="input resize-none" rows={2} value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Notas adicionales..." />
            </div>
            <div className="col-span-2">
              <label className="label">Ubicación del ensayo (para auto-marcarse)</label>
              {/* Ubicaciones anteriores */}
              {ubicacionesPrevias.length > 0 && !form.lat && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ubicacionesPrevias.map(e => (
                    <button key={e.id} type="button"
                      onClick={() => setForm(p => ({ ...p, lat: e.lat, lng: e.lng }))}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-all">
                      <MapPinIcon size={11} />
                      {e.titulo || fmtFecha(e.fecha)}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <button type="button" onClick={capturarUbicacion} disabled={gpsLoading}
                  className="btn-secondary btn-sm flex-shrink-0 flex items-center gap-1">
                  <MapPinIcon size={14} />
                  {gpsLoading ? 'Obteniendo...' : form.lat ? 'Actualizar GPS' : 'Capturar mi ubicación'}
                </button>
                {form.lat && form.lng && (
                  <span className="text-xs text-gray-500 truncate">
                    {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                  </span>
                )}
                {form.lat && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, lat: '', lng: '' }))}
                    className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">
                    <XIcon size={13} />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Los músicos podrán marcarse automáticamente al estar dentro de 300m</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              <FloppyDiskIcon size={16} />
              {loading ? 'Guardando...' : (ensayo ? 'Guardar cambios' : 'Crear ensayo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Panel de asistencia para un ensayo ───────────────────────────────────────

function PanelAsistencia({ ensayo }) {
  const { registrarAsistencia, marcarTodosPresente, getRegistro, registrosDe } = useAsistencia()
  const { musicos } = useMusicos()
  const { esDirector, sesion } = useAuth()
  const [loading, setLoading] = useState(null)
  const [editMinutos, setEditMinutos] = useState({}) // { musicoId: valor }
  const [gpsEstado, setGpsEstado] = useState('')     // 'buscando' | 'ok' | 'lejos' | 'error'

  const regsDe = registrosDe(ensayo.id)

  const calcMinutosTarde = (horaEnsayo) => {
    if (!horaEnsayo) return 0
    const [hh, mm] = horaEnsayo.split(':').map(Number)
    const ahora = new Date()
    const inicioMin = hh * 60 + mm
    const ahoraMin  = ahora.getHours() * 60 + ahora.getMinutes()
    const diff = ahoraMin - inicioMin
    return diff > 0 ? diff : 0
  }

  const distanciaMetros = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const handleMarca = async (musicoId, estado) => {
    setLoading(musicoId + estado)
    const minutosTarde = estado === 'tardanza' ? calcMinutosTarde(ensayo.hora) : 0
    await registrarAsistencia(ensayo.id, musicoId, estado, minutosTarde)
    setLoading(null)
  }

  const handleEditarMinutos = async (musicoId, valor) => {
    const mins = Math.max(0, parseInt(valor) || 0)
    setEditMinutos(p => ({ ...p, [musicoId]: undefined }))
    await registrarAsistencia(ensayo.id, musicoId, 'tardanza', mins)
  }

  const handleAutoMarcar = () => {
    if (!navigator.geolocation) { setGpsEstado('error'); return }
    setGpsEstado('buscando')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const dist = distanciaMetros(pos.coords.latitude, pos.coords.longitude, parseFloat(ensayo.lat), parseFloat(ensayo.lng))
        if (dist <= 300) {
          const mins = calcMinutosTarde(ensayo.hora)
          const estado = mins > 0 ? 'tardanza' : 'presente'
          registrarAsistencia(ensayo.id, sesion.id, estado, mins)
          setGpsEstado('ok')
        } else {
          setGpsEstado('lejos')
        }
        setTimeout(() => setGpsEstado(''), 4000)
      },
      () => { setGpsEstado('error'); setTimeout(() => setGpsEstado(''), 4000) },
      { enableHighAccuracy: true }
    )
  }

  const handleTodosPresentes = async () => {
    setLoading('all')
    await marcarTodosPresente(ensayo.id, musicos)
    setLoading(null)
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      {/* Resumen */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="text-green-600 font-semibold">{regsDe.filter(r => r.estado === 'presente').length}</span> presentes</span>
          <span className="flex items-center gap-1"><span className="text-yellow-600 font-semibold">{regsDe.filter(r => r.estado === 'tardanza').length}</span> tardanzas</span>
          <span className="flex items-center gap-1"><span className="text-red-600 font-semibold">{regsDe.filter(r => r.estado === 'ausente').length}</span> ausentes</span>
          <span className="flex items-center gap-1"><span className="text-blue-600 font-semibold">{regsDe.filter(r => r.estado === 'justificado').length}</span> justificados</span>
        </div>
        {esDirector && (
          <button
            onClick={handleTodosPresentes}
            disabled={loading === 'all'}
            className="btn-secondary btn-sm text-xs"
          >
            <CheckCircleIcon size={13} /> Todos presentes
          </button>
        )}
      </div>

      {/* Botón GPS para músico logueado */}
      {!esDirector && ensayo.lat && ensayo.lng && (
        <div className="mb-3">
          <button onClick={handleAutoMarcar} disabled={gpsEstado === 'buscando'}
            className="btn-primary btn-sm w-full flex items-center justify-center gap-2">
            <MapPinIcon size={15} />
            {gpsEstado === 'buscando' ? 'Obteniendo ubicación...' : 'Marcarme con GPS'}
          </button>
          {gpsEstado === 'ok'    && <p className="text-xs text-green-600 text-center mt-1">✅ Marcado correctamente</p>}
          {gpsEstado === 'lejos' && <p className="text-xs text-red-500  text-center mt-1">📍 Estás lejos del ensayo (+300m)</p>}
          {gpsEstado === 'error' && <p className="text-xs text-red-500  text-center mt-1">⚠️ No se pudo obtener tu ubicación</p>}
        </div>
      )}

      {/* Grid de músicos */}
      <div className="space-y-2">
        {musicos.map(m => {
          const reg = getRegistro(ensayo.id, m.id)
          const estadoActual = reg?.estado || null
          const editandoMins = editMinutos[m.id] !== undefined

          return (
            <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {m.foto_url ? (
                  <img src={m.foto_url} alt={m.nombre}
                    className="h-9 w-9 rounded-full object-cover border"
                    onError={e => e.target.style.display='none'} />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {m.nombre?.charAt(0)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{m.nombre}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">{m.instrumento}</p>
                  {/* Minutos tarde editables */}
                  {estadoActual === 'tardanza' && esDirector && (
                    editandoMins ? (
                      <input
                        type="number" min="0" max="120" autoFocus
                        defaultValue={reg?.minutos_tarde || 0}
                        className="w-16 text-xs px-1.5 py-0.5 border border-yellow-400 rounded-md"
                        onBlur={e => handleEditarMinutos(m.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleEditarMinutos(m.id, e.target.value)}
                      />
                    ) : (
                      <button onClick={() => setEditMinutos(p => ({ ...p, [m.id]: reg?.minutos_tarde || 0 }))}
                        className="text-xs text-yellow-600 hover:text-yellow-800 flex items-center gap-0.5">
                        <PencilSimpleIcon size={10} />
                        {reg?.minutos_tarde || 0} min tarde
                      </button>
                    )
                  )}
                  {estadoActual === 'tardanza' && !esDirector && reg?.minutos_tarde > 0 && (
                    <span className="text-xs text-yellow-600">{reg.minutos_tarde} min tarde</span>
                  )}
                </div>
              </div>

              {/* Botones de estado */}
              {esDirector ? (
                <div className="flex gap-1 flex-shrink-0">
                  {Object.entries(ESTADOS).map(([estado, info]) => {
                    const activo = estadoActual === estado
                    return (
                      <button
                        key={estado}
                        onClick={() => handleMarca(m.id, estado)}
                        disabled={loading === m.id + estado}
                        title={info.label}
                        className={`w-8 h-8 rounded-lg border text-sm transition-all flex items-center justify-center
                          ${activo
                            ? `${ESTADO_CLASES[estado]} border ring-1 scale-110 shadow-sm`
                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100'
                          }`}
                      >
                        {info.emoji}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border
                  ${estadoActual ? ESTADO_CLASES[estadoActual] : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                  {estadoActual ? ESTADOS[estadoActual].emoji + ' ' + ESTADOS[estadoActual].label : '—'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {musicos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No hay músicos registrados</p>
      )}
    </div>
  )
}

// ── Tab 1: Lista de Ensayos ───────────────────────────────────────────────────

function TabEnsayos({ onNuevo }) {
  const { ensayos, registrosDe, eliminarEnsayo, editarEnsayo } = useAsistencia()
  const { musicos } = useMusicos()
  const { esDirector } = useAuth()
  const [expandido, setExpandido] = useState(null)
  const [editando, setEditando] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const handleDelete = async (id) => {
    await eliminarEnsayo(id)
    setConfirmDel(null)
    if (expandido === id) setExpandido(null)
  }

  if (ensayos.length === 0) {
    return (
      <div className="card text-center py-16">
        <CalendarCheckIcon size={48} className="mx-auto mb-3 text-primary-300" />
        <p className="text-gray-500 mb-1">No hay ensayos registrados</p>
        <p className="text-sm text-gray-400">Crea el primer ensayo para empezar a marcar asistencia</p>
        {esDirector && (
          <button className="btn-primary mt-4" onClick={onNuevo}>
            <PlusIcon size={16} /> Crear primer ensayo
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {ensayos.map(ensayo => {
        const tipo   = TIPOS_ENSAYO[ensayo.tipo] || TIPOS_ENSAYO.ensayo
        const regs      = registrosDe(ensayo.id)
        const total     = musicos.length
        const presentes = regs.filter(r => r.estado === 'presente').length
        const abierto   = expandido === ensayo.id

        return (
          <div key={ensayo.id} className="card overflow-hidden">
            {/* Cabecera del ensayo */}
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setExpandido(abierto ? null : ensayo.id)}
            >
              {/* Emoji tipo */}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                ${tipo.color === 'blue'   ? 'bg-blue-50'   :
                  tipo.color === 'purple' ? 'bg-purple-50' : 'bg-green-50'}`}>
                {tipo.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{ensayo.titulo || tipo.label}</p>
                  <span className={`badge text-xs
                    ${tipo.color === 'blue'   ? 'badge-blue'   :
                      tipo.color === 'purple' ? 'badge-purple' : 'badge-green'}`}>
                    {tipo.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {fmtFecha(ensayo.fecha)}
                  {ensayo.hora && ` · ${ensayo.hora}`}
                  {ensayo.descripcion && ` · ${ensayo.descripcion}`}
                </p>
              </div>

              {/* Asistencia resumen */}
              <div className="text-right flex-shrink-0 mr-1">
                <p className="text-sm font-semibold text-gray-700">{presentes}/{total}</p>
                <p className="text-xs text-gray-400">
                  {total > 0 ? Math.round((presentes / total) * 100) : 0}% presentes
                </p>
              </div>

              {/* Acciones director */}
              {esDirector && (
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditando(ensayo)}
                    className="btn-icon btn-ghost btn-sm text-gray-400 hover:text-primary-600">
                    <PencilSimpleIcon size={14} />
                  </button>
                  <button onClick={() => setConfirmDel(ensayo)}
                    className="btn-icon btn-ghost btn-sm text-gray-400 hover:text-red-500">
                    <TrashIcon size={14} />
                  </button>
                </div>
              )}

              {/* Toggle */}
              <span className={`text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`}>▼</span>
            </div>

            {/* Panel asistencia */}
            {abierto && (
              <PanelAsistencia ensayo={ensayo} onClose={() => setExpandido(null)} />
            )}
          </div>
        )
      })}

      {/* Modal editar */}
      {editando && (
        <ModalEnsayo
          ensayo={editando}
          onClose={() => setEditando(null)}
          onSave={(data) => editarEnsayo(editando.id, data).then(() => setEditando(null))}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in">
            <h3 className="font-semibold text-gray-900 mb-2">¿Eliminar ensayo?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Se eliminará <strong>{confirmDel.titulo}</strong> y todos sus registros de asistencia.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn-danger flex-1" onClick={() => handleDelete(confirmDel.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 2: Estadísticas ───────────────────────────────────────────────────────

function TabEstadisticas() {
  const { statsDe, ensayos } = useAsistencia()
  const { musicos } = useMusicos()

  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth()

  const [modo,  setModo]  = useState('mes')    // 'mes' | 'anio'
  const [mes,   setMes]   = useState(mesActual)
  const [anio,  setAnio]  = useState(anioActual)

  const anios = useMemo(() => {
    const set = new Set(ensayos.map(e => parseDate(e.fecha).getFullYear()).filter(a => !isNaN(a)))
    set.add(anioActual)
    return [...set].sort((a, b) => b - a)
  }, [ensayos, anioActual])

  const datos = useMemo(() =>
    musicos
      .map(m => ({
        ...m,
        stats: statsDe(m.id, modo === 'mes' ? mes : null, anio),
      }))
      .filter(m => m.stats.total > 0)
      .sort((a, b) => b.stats.pctPuntual - a.stats.pctPuntual)
  , [musicos, statsDe, modo, mes, anio])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setModo('mes')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${modo === 'mes' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >Por mes</button>
            <button
              onClick={() => setModo('anio')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${modo === 'anio' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >Por año</button>
          </div>
          {modo === 'mes' && (
            <select className="input max-w-[130px]" value={mes} onChange={e => setMes(+e.target.value)}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}
          <select className="input max-w-[90px]" value={anio} onChange={e => setAnio(+e.target.value)}>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {datos.length === 0 ? (
        <div className="card text-center py-12">
          <ChartBarIcon size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-gray-400 text-sm">Sin datos para el período seleccionado</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          {/* Cabecera tabla */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Músico</span>
            <span className="text-center text-green-600">Pres.</span>
            <span className="text-center text-yellow-600">Tard.</span>
            <span className="text-center text-red-500">Aus.</span>
            <span className="text-center text-primary-600">Puntual.</span>
          </div>

          {/* Filas */}
          <div className="divide-y divide-gray-50">
            {datos.map((m, i) => (
              <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                {/* Músico */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base flex-shrink-0 font-mono w-6 text-center text-gray-400">
                    {i < 3 ? MEDAL_ICON[i] : `${i+1}.`}
                  </span>
                  {m.foto_url ? (
                    <img src={m.foto_url} alt={m.nombre}
                      className="h-8 w-8 rounded-full object-cover border flex-shrink-0"
                      onError={e => e.target.style.display='none'} />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {m.nombre?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.nombre}</p>
                    <p className="text-xs text-gray-400">{m.instrumento}</p>
                  </div>
                </div>

                {/* Counters */}
                <span className="text-sm font-semibold text-green-600 text-center w-10">{m.stats.presente}</span>
                <span className="text-sm font-semibold text-yellow-600 text-center w-10">{m.stats.tardanza}</span>
                <span className="text-sm font-semibold text-red-500 text-center w-10">{m.stats.ausente}</span>

                {/* Puntualidad barra */}
                <div className="w-24">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-semibold text-primary-700">{m.stats.pctPuntual}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all
                        ${m.stats.pctPuntual >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          m.stats.pctPuntual >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                          'bg-gradient-to-r from-red-400 to-rose-400'}`}
                      style={{ width: `${m.stats.pctPuntual}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Premios ────────────────────────────────────────────────────────────

function PodiumCard({ titulo, icono, color, datos, tipo }) {
  if (datos.length === 0) return null

  const pct = (m) => tipo === 'puntualidad' ? m.stats.pctPuntual : m.stats.pctAsiste

  const colorClase = {
    gold:   'from-yellow-400  to-amber-500',
    green:  'from-green-500   to-emerald-600',
    red:    'from-red-400     to-rose-500',
    purple: 'from-primary-500 to-violet-600',
  }[color] || 'from-gray-400 to-gray-500'

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${colorClase} flex items-center justify-center text-lg`}>
          {icono}
        </div>
        <h3 className="font-semibold text-gray-800 text-sm">{titulo}</h3>
      </div>

      <div className="space-y-3">
        {datos.slice(0, 3).map((m, i) => (
          <div key={m.id} className={`flex items-center gap-3 p-2.5 rounded-xl
            ${i === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-100' :
              i === 1 ? 'bg-gray-50' : 'bg-gray-50 opacity-80'}`}>
            <span className="text-xl w-8 text-center flex-shrink-0">{MEDAL_ICON[i] || `${i+1}.`}</span>
            {m.foto_url ? (
              <img src={m.foto_url} alt={m.nombre}
                className="h-9 w-9 rounded-full object-cover border flex-shrink-0"
                onError={e => e.target.style.display='none'} />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {m.nombre?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{m.nombre}</p>
              <p className="text-xs text-gray-500">{m.instrumento}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-lg font-bold
                ${i === 0
                  ? (color === 'red' ? 'text-red-500' : 'text-amber-600')
                  : 'text-gray-700'}`}>
                {pct(m)}%
              </p>
              <p className="text-xs text-gray-400">
                {tipo === 'puntualidad' ? `${m.stats.presente} presentes` : `${m.stats.presente + m.stats.tardanza + m.stats.justificado} asistencias`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabPremios() {
  const { rankingPuntualidad, rankingAsistencia, ensayos } = useAsistencia()
  const { musicos } = useMusicos()

  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth()

  const [modo,  setModo]  = useState('mes')
  const [mes,   setMes]   = useState(mesActual)
  const [anio,  setAnio]  = useState(anioActual)

  const anios = useMemo(() => {
    const set = new Set(ensayos.map(e => parseDate(e.fecha).getFullYear()).filter(a => !isNaN(a)))
    set.add(anioActual)
    return [...set].sort((a, b) => b - a)
  }, [ensayos, anioActual])

  const rMes  = modo === 'mes' ? mes  : null
  const rAnio = anio

  const rPuntual = rankingPuntualidad(musicos, rMes, rAnio)
  const rAsiste  = rankingAsistencia(musicos, rMes, rAnio)
  const rMenos   = [...rAsiste].reverse()

  const periodo = modo === 'mes' ? `${MESES[mes]} ${anio}` : `Año ${anio}`

  const hayDatos = rPuntual.length > 0

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setModo('mes')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${modo === 'mes' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >Por mes</button>
            <button
              onClick={() => setModo('anio')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${modo === 'anio' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >Por año</button>
          </div>
          {modo === 'mes' && (
            <select className="input max-w-[130px]" value={mes} onChange={e => setMes(+e.target.value)}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}
          <select className="input max-w-[90px]" value={anio} onChange={e => setAnio(+e.target.value)}>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-2">Mostrando premios de: <strong>{periodo}</strong></p>
      </div>

      {!hayDatos ? (
        <div className="card text-center py-12">
          <TrophyIcon size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-gray-400 text-sm">Sin datos de asistencia para este período</p>
          <p className="text-xs text-gray-300 mt-1">Registra ensayos y marca asistencia para ver los premios</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Banner periodo */}
          <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-violet-700 p-4 text-white">
            <div className="flex items-center gap-3">
              <TrophyIcon size={28} className="opacity-90" />
              <div>
                <p className="font-bold text-lg">Premios — {periodo}</p>
                <p className="text-sm opacity-80">
                  {rPuntual.length} músico{rPuntual.length !== 1 ? 's' : ''} con registros · {ensayos.filter(e => {
                    const f = parseDate(e.fecha)
                    return modo === 'mes'
                      ? f.getMonth() === mes && f.getFullYear() === anio
                      : f.getFullYear() === anio
                  }).length} ensayo{ensayos.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PodiumCard
              titulo={`Más Puntual ${modo === 'mes' ? 'del Mes' : 'del Año'}`}
              icono="⭐"
              color="gold"
              datos={rPuntual}
              tipo="puntualidad"
            />
            <PodiumCard
              titulo={`Más Asistente ${modo === 'mes' ? 'del Mes' : 'del Año'}`}
              icono="🏆"
              color="green"
              datos={rAsiste}
              tipo="asistencia"
            />
          </div>

          <PodiumCard
            titulo={`Menos Asistente ${modo === 'mes' ? 'del Mes' : 'del Año'}`}
            icono="📉"
            color="red"
            datos={rMenos}
            tipo="asistencia"
          />
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Asistencia() {
  const { ensayos, agregarEnsayo } = useAsistencia()
  const { esDirector } = useAuth()
  const { agregarNotificacion } = useNotificaciones()
  const [tab, setTab] = useState('ensayos')
  const [modalNuevo, setModalNuevo] = useState(false)

  const handleNuevoEnsayo = async (data) => {
    const result = await agregarEnsayo(data)
    const tipo = TIPOS_ENSAYO[data.tipo]
    await agregarNotificacion({
      tipo:    'info',
      titulo:  `${tipo?.emoji || '🎸'} Nuevo ${tipo?.label || 'Ensayo'}: ${data.titulo || tipo?.label}`,
      mensaje: `Programado para el ${fmtFecha(data.fecha)} a las ${data.hora}`,
    })
    setModalNuevo(false)
    setTab('ensayos')
    return result
  }

  const TABS = [
    { id: 'ensayos',      label: 'Ensayos',      icon: ClipboardTextIcon },
    { id: 'estadisticas', label: 'Estadísticas',  icon: ChartBarIcon      },
    { id: 'premios',      label: 'Premios',       icon: TrophyIcon        },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Asistencia y Puntualidad</h1>
          <p className="page-subtitle">{ensayos.length} ensayo{ensayos.length !== 1 ? 's' : ''} registrado{ensayos.length !== 1 ? 's' : ''}</p>
        </div>
        {esDirector && (
          <button className="btn-primary" onClick={() => setModalNuevo(true)}>
            <PlusIcon size={16} /> Nuevo Ensayo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Contenido por tab */}
      {tab === 'ensayos'      && <TabEnsayos      onNuevo={() => setModalNuevo(true)} />}
      {tab === 'estadisticas' && <TabEstadisticas />}
      {tab === 'premios'      && <TabPremios       />}

      {/* Modal nuevo ensayo */}
      {modalNuevo && (
        <ModalEnsayo
          onClose={() => setModalNuevo(false)}
          onSave={handleNuevoEnsayo}
        />
      )}
    </div>
  )
}
