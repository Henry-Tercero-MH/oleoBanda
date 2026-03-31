import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { shortId } from '../utils/formatters'

const NotificacionesContext = createContext(null)

const STORAGE_KEY = 'banda_notificaciones'
const LEIDAS_KEY  = 'banda_notificaciones_leidas'

/** Genera las notificaciones automáticas según el día del mes */
function generarAutomaticas() {
  const hoy   = new Date()
  const dia   = hoy.getDate()
  const mes   = hoy.getMonth()    // 0-11
  const anio  = hoy.getFullYear()
  const key   = `auto-${anio}-${mes}`  // una por mes

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
  const [manuales, setManuales] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [leidas, setLeidas] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LEIDAS_KEY) || '[]') } catch { return [] }
  })

  // Persistir
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manuales))
  }, [manuales])
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

  const agregarNotificacion = useCallback((data) => {
    const nueva = {
      id:         `notif-${shortId()}`,
      tipo:       data.tipo || 'info',
      titulo:     data.titulo,
      mensaje:    data.mensaje,
      fecha:      new Date().toISOString(),
      automatica: false,
    }
    setManuales(prev => [nueva, ...prev])
  }, [])

  const eliminarNotificacion = useCallback((id) => {
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
