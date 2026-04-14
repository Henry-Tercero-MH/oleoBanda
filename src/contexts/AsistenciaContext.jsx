/**
 * AsistenciaContext — Gestión de asistencia y puntualidad
 *
 * Modelos:
 *  ensayo:   { id, titulo, tipo, fecha, hora, descripcion, creado_en }
 *  asistencia: { id, ensayo_id, musico_id, estado, minutos_tarde, creado_en }
 *
 * Estado de asistencia: 'presente' | 'tardanza' | 'ausente' | 'justificado'
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../services/db'
import { shortId } from '../utils/formatters'

const AsistenciaContext = createContext(null)

/** Parsea fecha a Date manejando tanto YYYY-MM-DD como ISO completo */
function parseDate(f) {
  if (!f) return new Date(NaN)
  const s = String(f)
  return s.includes('T') ? new Date(s) : new Date(s + 'T12:00:00')
}

export const TIPOS_ENSAYO = {
  ensayo:   { label: 'Ensayo Regular',     emoji: '🎸', color: 'blue'   },
  servicio: { label: 'Servicio Dominical', emoji: '🙏', color: 'purple' },
  evento:   { label: 'Evento Especial',    emoji: '🎤', color: 'green'  },
}

export const ESTADOS = {
  presente:    { label: 'Presente',    emoji: '✅', color: 'green'  },
  tardanza:    { label: 'Tardanza',    emoji: '⏰', color: 'yellow' },
  ausente:     { label: 'Ausente',     emoji: '❌', color: 'red'    },
  justificado: { label: 'Justificado', emoji: '📋', color: 'blue'   },
}

// Puntos para el ranking de puntualidad
const PUNTOS = { presente: 3, justificado: 2, tardanza: 1, ausente: 0 }

export function AsistenciaProvider({ children }) {
  const [ensayos, setEnsayos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('banda_ensayos') || '[]') } catch { return [] }
  })
  const [registros, setRegistros] = useState(() => {
    try { return JSON.parse(localStorage.getItem('banda_asistencias') || '[]') } catch { return [] }
  })

  // Persistir en localStorage
  useEffect(() => { localStorage.setItem('banda_ensayos',    JSON.stringify(ensayos))   }, [ensayos])
  useEffect(() => { localStorage.setItem('banda_asistencias', JSON.stringify(registros)) }, [registros])

  // Cargar desde GAS al iniciar (deduplicando por id)
  useEffect(() => {
    db.getAll('ensayos').then(data => {
      if (data?.length) {
        const unicos = data.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
        setEnsayos(unicos)
      }
    })
    db.getAll('asistencias').then(data => {
      if (data?.length) {
        const unicos = data.filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i)
        setRegistros(unicos)
      }
    })
  }, [])

  // ── Ensayos ───────────────────────────────────────────────────

  const agregarEnsayo = useCallback(async (data) => {
    const nuevo = { ...data, id: `ens-${shortId()}`, creado_en: new Date().toISOString() }
    setEnsayos(prev => [nuevo, ...prev])
    await db.insert('ensayos', nuevo)
    return { ok: true, ensayo: nuevo }
  }, [])

  const editarEnsayo = useCallback(async (id, data) => {
    setEnsayos(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
    await db.update('ensayos', id, data)
  }, [])

  const eliminarEnsayo = useCallback(async (id) => {
    setEnsayos(prev => prev.filter(e => e.id !== id))
    setRegistros(prev => prev.filter(r => r.ensayo_id !== id))
    await db.remove('ensayos', id)
  }, [])

  // ── Registros de asistencia ───────────────────────────────────

  const registrarAsistencia = useCallback(async (ensayoId, musicoId, estado, minutosTarde = 0) => {
    const existente = registros.find(r => r.ensayo_id === ensayoId && r.musico_id === musicoId)
    const cambios = { estado, minutos_tarde: estado === 'tardanza' ? (minutosTarde || 0) : 0 }

    if (existente) {
      setRegistros(prev => prev.map(r =>
        r.ensayo_id === ensayoId && r.musico_id === musicoId ? { ...r, ...cambios } : r
      ))
      await db.update('asistencias', existente.id, cambios)
    } else {
      const nuevo = {
        id: `ast-${shortId()}`,
        ensayo_id: ensayoId,
        musico_id: musicoId,
        ...cambios,
        creado_en: new Date().toISOString(),
      }
      setRegistros(prev => [...prev, nuevo])
      await db.insert('asistencias', nuevo)
    }
  }, [registros])

  // Marcar a todos los músicos de un ensayo como 'presente'
  const marcarTodosPresente = useCallback(async (ensayoId, musicos) => {
    for (const m of musicos) {
      await registrarAsistencia(ensayoId, m.id, 'presente')
    }
  }, [registrarAsistencia])

  // ── Helpers de consulta ───────────────────────────────────────

  const getRegistro = useCallback((ensayoId, musicoId) =>
    registros.find(r => r.ensayo_id === ensayoId && r.musico_id === musicoId) || null
  , [registros])

  const registrosDe = useCallback((ensayoId) =>
    registros.filter(r => r.ensayo_id === ensayoId)
  , [registros])

  /** Estadísticas de un músico en un período dado */
  const statsDe = useCallback((musicoId, mes = null, anio = null) => {
    let ensayosFiltrados = ensayos
    if (mes !== null && anio !== null) {
      ensayosFiltrados = ensayos.filter(e => {
        const f = parseDate(e.fecha)
        return f.getMonth() === mes && f.getFullYear() === anio
      })
    } else if (anio !== null) {
      ensayosFiltrados = ensayos.filter(e => parseDate(e.fecha).getFullYear() === anio)
    }

    const ids = new Set(ensayosFiltrados.map(e => e.id))
    const mis  = registros.filter(r => r.musico_id === musicoId && ids.has(r.ensayo_id))

    const total       = ensayosFiltrados.length
    const presente    = mis.filter(r => r.estado === 'presente').length
    const tardanza    = mis.filter(r => r.estado === 'tardanza').length
    const ausente     = mis.filter(r => r.estado === 'ausente').length
    const justificado = mis.filter(r => r.estado === 'justificado').length
    const sinMarcar   = total - mis.length
    const puntos      = mis.reduce((s, r) => s + (PUNTOS[r.estado] ?? 0), 0)
    const maxPuntos   = total * 3
    const pctPuntual  = total > 0 ? Math.round((presente / total) * 100) : 0
    const pctAsiste   = total > 0 ? Math.round(((presente + tardanza + justificado) / total) * 100) : 0

    return { total, presente, tardanza, ausente, justificado, sinMarcar, puntos, maxPuntos, pctPuntual, pctAsiste }
  }, [ensayos, registros])

  /** Ranking de músicos ordenado por puntualidad */
  const rankingPuntualidad = useCallback((musicos, mes = null, anio = null) =>
    musicos
      .map(m => ({ ...m, stats: statsDe(m.id, mes, anio) }))
      .filter(m => m.stats.total > 0)
      .sort((a, b) => b.stats.pctPuntual - a.stats.pctPuntual || b.stats.presente - a.stats.presente)
  , [statsDe])

  /** Ranking de músicos ordenado por asistencia */
  const rankingAsistencia = useCallback((musicos, mes = null, anio = null) =>
    musicos
      .map(m => ({ ...m, stats: statsDe(m.id, mes, anio) }))
      .filter(m => m.stats.total > 0)
      .sort((a, b) => b.stats.pctAsiste - a.stats.pctAsiste || b.stats.presente - a.stats.presente)
  , [statsDe])

  return (
    <AsistenciaContext.Provider value={{
      ensayos: [...ensayos].sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha)),
      registros,
      agregarEnsayo,
      editarEnsayo,
      eliminarEnsayo,
      registrarAsistencia,
      marcarTodosPresente,
      getRegistro,
      registrosDe,
      statsDe,
      rankingPuntualidad,
      rankingAsistencia,
    }}>
      {children}
    </AsistenciaContext.Provider>
  )
}

export function useAsistencia() {
  const ctx = useContext(AsistenciaContext)
  if (!ctx) throw new Error('useAsistencia debe usarse dentro de <AsistenciaProvider>')
  return ctx
}
