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

  if (dia < 1 || dia > 7) return []

  if (dia === 7) {
    return [{
      id:        `${key}-urgente`,
      tipo:      'urgente',
      titulo:    '¡Hoy es el día 7!',
      mensaje:   'Recuerda reunir el dinero de las ofrendas y cuotas del mes. Es el plazo de recordatorio.',
      fecha:     new Date(anio, mes, 7).toISOString(),
      automatica: true,
    }]
  }

  return [{
    id:        `${key}-recordatorio`,
    tipo:      'recordatorio',
    titulo:    'Recordatorio mensual',
    mensaje:   `Estamos en el día ${dia}. Avisa a los músicos que reúnan el dinero para las ofrendas y cuotas del mes antes del día 7.`,
    fecha:     new Date(anio, mes, dia).toISOString(),
    automatica: true,
  }]
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
