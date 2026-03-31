import { useState } from 'react'

// Genera sonidos con Web Audio API sin archivos externos
function playSound(tipo) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    if (tipo === 'urgente') {
      // Dos pulsos agudos urgentes
      ;[0, 0.25].forEach(delay => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime + delay)
        osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + delay + 0.15)
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.2)
      })
    } else {
      // Campana suave para recordatorio/aviso
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523, ctx.currentTime)       // Do5
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12) // Mi5
      gain.gain.setValueAtTime(0.35, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    }
  } catch { /* silencioso si el navegador no soporta */ }
}
import { BellIcon, BellRingingIcon, XIcon, TrashIcon, PlusIcon, WarningIcon, InfoIcon, CheckCircleIcon, MegaphoneIcon } from '@phosphor-icons/react'
import { useNotificaciones } from '../contexts/NotificacionesContext'
import { useAuth } from '../contexts/AuthContext'
import { formatDate } from '../utils/formatters'

function getLeidasLocal() {
  try { return JSON.parse(localStorage.getItem('banda_notificaciones_leidas') || '[]') } catch { return [] }
}

const TIPO_CONFIG = {
  urgente:      { icon: WarningIcon,     color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200' },
  recordatorio: { icon: BellRingingIcon, color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-200' },
  info:         { icon: InfoIcon,        color: 'text-blue-500',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  aviso:        { icon: MegaphoneIcon,   color: 'text-purple-500', bg: 'bg-purple-50',  border: 'border-purple-200' },
  exito:        { icon: CheckCircleIcon, color: 'text-green-500',  bg: 'bg-green-50',   border: 'border-green-200' },
}

function FormNueva({ onClose }) {
  const { agregarNotificacion } = useNotificaciones()
  const [form, setForm] = useState({ titulo: '', mensaje: '', tipo: 'aviso' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.titulo || !form.mensaje) return
    agregarNotificacion(form)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white shadow-md animate-fade-in">
      <p className="text-sm font-semibold text-gray-700">Nueva notificación</p>

      <div>
        <label className="label text-xs">Tipo</label>
        <select className="input text-sm" value={form.tipo} onChange={e => setForm(p => ({...p, tipo: e.target.value}))}>
          <option value="aviso">Aviso</option>
          <option value="info">Información</option>
          <option value="urgente">Urgente</option>
          <option value="exito">Éxito</option>
        </select>
      </div>
      <div>
        <label className="label text-xs">Título *</label>
        <input className="input text-sm" value={form.titulo}
          onChange={e => setForm(p => ({...p, titulo: e.target.value}))}
          placeholder="Ej: Reunión especial este sábado" />
      </div>
      <div>
        <label className="label text-xs">Mensaje *</label>
        <textarea className="input text-sm resize-none" rows={2} value={form.mensaje}
          onChange={e => setForm(p => ({...p, mensaje: e.target.value}))}
          placeholder="Detalles del aviso..." />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="btn-secondary btn-sm flex-1">Cancelar</button>
        <button type="submit" className="btn-primary btn-sm flex-1">Publicar</button>
      </div>
    </form>
  )
}

export default function NotificacionesPanel() {
  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas, eliminarNotificacion } = useNotificaciones()
  const { esDirector } = useAuth()
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleAbrir = () => {
    setOpen(true)
    if (noLeidas > 0) {
      const tieneUrgente = notificaciones.some(n => !getLeidasLocal().includes(n.id) && n.tipo === 'urgente')
      playSound(tieneUrgente ? 'urgente' : 'normal')
    }
  }

  const handleCerrar = () => {
    setOpen(false)
    setShowForm(false)
    marcarTodasLeidas()
  }

  return (
    <>
      {/* Botón campana */}
      <button
        onClick={handleAbrir}
        className="relative btn-icon btn-ghost text-gray-500"
        title="Notificaciones"
      >
        {noLeidas > 0
          ? <BellRingingIcon size={20} weight="fill" className="text-orange-500" />
          : <BellIcon size={20} />
        }
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={handleCerrar} />
      )}

      {/* Panel (sheet) */}
      <div className={`
        fixed top-0 right-0 z-50 h-screen w-full sm:w-96 bg-white shadow-2xl border-l border-gray-100
        flex flex-col transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BellIcon size={18} className="text-gray-600" />
            <h2 className="font-semibold text-gray-900">Notificaciones</h2>
            {noLeidas > 0 && (
              <span className="badge badge-orange">{noLeidas} nueva{noLeidas !== 1 ? 's' : ''}</span>
            )}
          </div>
          <button onClick={handleCerrar} className="btn-icon btn-ghost text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-gray-50">
          {esDirector && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <PlusIcon size={14} /> Agregar aviso
            </button>
          )}
          {notificaciones.length > 0 && !esDirector && (
            <div />
          )}
          <button
            onClick={marcarTodasLeidas}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Marcar todas leídas
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Formulario nueva */}
          {showForm && esDirector && (
            <FormNueva onClose={() => setShowForm(false)} />
          )}

          {notificaciones.length === 0 && !showForm && (
            <div className="text-center py-16">
              <BellIcon size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">Sin notificaciones</p>
            </div>
          )}

          {notificaciones.map(n => {
            const config = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.info
            const Icono  = config.icon
            const leida  = getLeidasLocal().includes(n.id)
            return (
              <div
                key={n.id}
                onClick={() => marcarLeida(n.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all
                  ${config.bg} ${config.border}
                  ${leida ? 'opacity-60' : 'shadow-sm'}`}
              >
                <div className="flex items-start gap-3">
                  <Icono size={18} className={`flex-shrink-0 mt-0.5 ${config.color}`} weight={leida ? 'regular' : 'fill'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${leida ? 'text-gray-500' : 'text-gray-800'}`}>{n.titulo}</p>
                      {!n.automatica && esDirector && (
                        <button
                          onClick={e => { e.stopPropagation(); eliminarNotificacion(n.id) }}
                          className="flex-shrink-0 text-gray-300 hover:text-red-400"
                        >
                          <TrashIcon size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.mensaje}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.fecha)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 text-center">
          <p className="text-xs text-gray-300">Recordatorio automático: días 1–7 de cada mes</p>
        </div>
      </div>
    </>
  )
}

