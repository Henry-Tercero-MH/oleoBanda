import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../services/db'
import { shortId } from '../utils/formatters'

const NotificacionesContext = createContext(null)

const LEIDAS_KEY = 'banda_notificaciones_leidas'

/** Genera las notificaciones automáticas según el día del mes */
function generarAutomaticas() {
  const hoy  = new Date()
  const dia  = hoy.getDate()
  const mes  = hoy.getMonth()
  const anio = hoy.getFullYear()
  const key  = `auto-${anio}-${mes}`

  const notifs = []

  if (dia >= 1 && dia <= 7) {
    if (dia === 7) {
      notifs.push({
        id:         `${key}-urgente`,
        tipo:       'urgente',
        titulo:     '¡Hoy es el día 7!',
        mensaje:    'Recuerda reunir el dinero de las ofrendas y cuotas del mes. Es el plazo de recordatorio.',
        fecha:      new Date(anio, mes, 7).toISOString(),
        automatica: true,
      })
    } else {
      notifs.push({
        id:         `${key}-recordatorio`,
        tipo:       'recordatorio',
        titulo:     'Recordatorio mensual',
        mensaje:    `Estamos en el día ${dia}. Avisa a los músicos que reúnan el dinero para las ofrendas y cuotas del mes antes del día 7.`,
        fecha:      new Date(anio, mes, dia).toISOString(),
        automatica: true,
      })
    }
  }

  // Notificaciones de cumpleaños
  try {
    const usuarios = JSON.parse(localStorage.getItem('banda_usuarios') || '[]')
    const parseNac = (f) => {
      const s = String(f)
      return s.includes('T') ? new Date(s) : new Date(s + 'T12:00:00')
    }
    usuarios.filter(u => u.activo !== false && u.fecha_nacimiento).forEach(u => {
      const nac    = parseNac(u.fecha_nacimiento)
      const cumple = new Date(anio, nac.getMonth(), nac.getDate())
      const diff   = Math.round((cumple - hoy) / (1000 * 60 * 60 * 24))

      if (diff === 0) {
        notifs.push({
          id:         `cumple-hoy-${u.id}-${anio}`,
          tipo:       'cumpleanos',
          titulo:     `🎂 ¡Hoy cumple años ${u.nombre}!`,
          mensaje:    `Felicita a ${u.nombre} en su día especial. ¡Que Dios le bendiga!`,
          fecha:      new Date().toISOString(),
          automatica: true,
        })
      } else if (diff > 0 && diff <= 7) {
        notifs.push({
          id:         `cumple-prox-${u.id}-${anio}`,
          tipo:       'info',
          titulo:     `🎉 Cumpleaños próximo: ${u.nombre}`,
          mensaje:    `${u.nombre} cumple años en ${diff} día${diff !== 1 ? 's' : ''} (${cumple.toLocaleDateString('es-GT', { day: 'numeric', month: 'long' })}).`,
          fecha:      new Date().toISOString(),
          automatica: true,
        })
      }
    })
  } catch { /* silencioso */ }

  return notifs
}

export function NotificacionesProvider({ children }) {
  const [manuales, setManuales] = useState([])
  const [leidas, setLeidas] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LEIDAS_KEY) || '[]') } catch { return [] }
  })

  // Cargar notificaciones manuales desde db (Sheet + localStorage)
  useEffect(() => {
    db.getAll('notificaciones').then(data => {
      const activas = (data || []).filter(n => n.activo !== false)
      setManuales(activas)
    })
  }, [])

  // Persistir leídas
  useEffect(() => {
    localStorage.setItem(LEIDAS_KEY, JSON.stringify(leidas))
  }, [leidas])

  const automaticas = generarAutomaticas()

  // Todas juntas, más recientes primero
  const todas = [...automaticas, ...manuales]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const noLeidas = todas.filter(n => !leidas.includes(n.id)).length

  const marcarLeida = useCallback((id) => {
    setLeidas(prev => prev.includes(id) ? prev : [...prev, id])
  }, [])

  const marcarTodasLeidas = useCallback(() => {
    setLeidas(todas.map(n => n.id))
  }, [todas])

  const agregarNotificacion = useCallback(async (data) => {
    const nueva = {
      id:        `notif-${shortId()}`,
      tipo:      data.tipo || 'info',
      titulo:    data.titulo,
      mensaje:   data.mensaje,
      fecha:     new Date().toISOString(),
      automatica: false,
      activo:    true,
    }
    // Guardar en db (Sheet + localStorage caché)
    await db.insert('notificaciones', nueva)
    setManuales(prev => [nueva, ...prev])
  }, [])

  const eliminarNotificacion = useCallback(async (id) => {
    await db.remove('notificaciones', id)
    setManuales(prev => prev.filter(n => n.id !== id))
    setLeidas(prev => prev.filter(l => l !== id))
  }, [])

  return (
    <NotificacionesContext.Provider value={{
      notificaciones: todas,
      noLeidas,
      marcarLeida,
      marcarTodasLeidas,
      agregarNotificacion,
      eliminarNotificacion,
    }}>
      {children}
    </NotificacionesContext.Provider>
  )
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext)
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de <NotificacionesProvider>')
  return ctx
}
