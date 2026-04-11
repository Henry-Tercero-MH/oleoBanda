/**
 * GastosContext — Gestión de gastos fijos de la banda
 *
 * Lógica:
 *   - El director crea un gasto con deuda_total, num_cuotas y fecha_limite
 *   - monto_cuota = deuda_total / num_cuotas  (calculado automático)
 *   - cuota_por_musico = monto_cuota / num_musicos (calculado en UI)
 *   - Cada músico abona su parte antes de fecha_limite
 *   - Los abonos se registran por músico (musico_id)
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../services/db'
import { gasGetAll, gasUpdate } from '../services/googleAppsScript'
import { shortId } from '../utils/formatters'

const GastosContext = createContext(null)

const LS_GASTOS = 'banda_gastos'
const LS_ABONOS = 'banda_gastos_abonos'

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function lsSet(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function GastosProvider({ children }) {
  const [gastos, setGastos] = useState(() => lsGet(LS_GASTOS).filter(g => g.activo !== false))
  const [abonos, setAbonos] = useState(() => lsGet(LS_ABONOS).filter(a => a.activo !== false))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Siempre consultar el Sheet directamente para tener exentos actualizados
    Promise.all([
      gasGetAll('gastos'),
      gasGetAll('gastosAbonos'),
    ]).then(([resG, resA]) => {
      if (resG?.ok && Array.isArray(resG.data) && resG.data.length > 0) {
        const activos = resG.data
          .filter(x => x.activo !== false && x.activo !== 'false')
          .map(g => ({
            ...g,
            // exentos llega como "id1,id2" desde el Sheet o como array local
            exentos: (() => {
              if (Array.isArray(g.exentos)) return g.exentos
              if (typeof g.exentos === 'string' && g.exentos.startsWith('[')) {
                try { return JSON.parse(g.exentos) } catch { return [] }
              }
              if (typeof g.exentos === 'string' && g.exentos.trim()) {
                return g.exentos.split(',').map(s => s.trim()).filter(Boolean)
              }
              return []
            })(),
          }))
        lsSet(LS_GASTOS, activos)
        setGastos(activos)
      }
      if (resA?.ok && Array.isArray(resA.data) && resA.data.length > 0) {
        const activos = resA.data.filter(x => x.activo !== false && x.activo !== 'false')
        lsSet(LS_ABONOS, activos)
        setAbonos(activos)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ── Gastos ────────────────────────────────────────────────────

  const agregarGasto = useCallback(async (data) => {
    const deuda     = parseFloat(data.deuda_total) || 0
    const nCuotas   = parseInt(data.num_cuotas)    || 1
    const cuota     = deuda / nCuotas
    const nuevo = {
      id:           `gst-${shortId()}`,
      nombre:       data.nombre.trim(),
      descripcion:  data.descripcion?.trim() || '',
      deuda_total:  deuda,
      num_cuotas:   nCuotas,
      monto_cuota:  Math.round(cuota * 100) / 100,
      fecha_limite: data.fecha_limite || '',
      fecha_inicio: data.fecha_inicio || new Date().toISOString().slice(0, 10),
      exentos:      [],   // array de musico_id exentos de este gasto
      activo:       true,
      creado_en:    new Date().toISOString(),
    }
    setGastos(prev => {
      const next = [nuevo, ...prev]
      lsSet(LS_GASTOS, next)
      return next
    })
    await db.insert('gastos', nuevo)
    return nuevo
  }, [])

  const editarGasto = useCallback(async (id, data) => {
    const deuda   = parseFloat(data.deuda_total) || 0
    const nCuotas = parseInt(data.num_cuotas)    || 1
    const cambios = {
      nombre:       data.nombre.trim(),
      descripcion:  data.descripcion?.trim() || '',
      deuda_total:  deuda,
      num_cuotas:   nCuotas,
      monto_cuota:  Math.round((deuda / nCuotas) * 100) / 100,
      fecha_limite: data.fecha_limite || '',
      fecha_inicio: data.fecha_inicio,
    }
    setGastos(prev => {
      const next = prev.map(g => g.id === id ? { ...g, ...cambios } : g)
      lsSet(LS_GASTOS, next)
      return next
    })
    await db.update('gastos', id, cambios)
  }, [])

  /** Marcar/desmarcar músico como exento en un gasto */
  const toggleExento = useCallback(async (gastoId, musicoId) => {
    let nuevosExentos
    setGastos(prev => {
      const next = prev.map(g => {
        if (g.id !== gastoId) return g
        const exentos = Array.isArray(g.exentos) ? g.exentos : []
        nuevosExentos = exentos.includes(musicoId)
          ? exentos.filter(id => id !== musicoId)
          : [...exentos, musicoId]
        return { ...g, exentos: nuevosExentos }
      })
      lsSet(LS_GASTOS, next)
      return next
    })
    // Enviar al Sheet como string "id1,id2" para compatibilidad con Sheets
    setTimeout(() => gasUpdate('gastos', gastoId, { exentos: nuevosExentos.join(',') }).catch(() => {}), 0)
  }, [])

  const eliminarGasto = useCallback(async (id) => {
    setGastos(prev => {
      const next = prev.filter(g => g.id !== id)
      lsSet(LS_GASTOS, next)
      return next
    })
    setAbonos(prev => {
      const next = prev.filter(a => a.gasto_id !== id)
      lsSet(LS_ABONOS, next)
      return next
    })
    await db.remove('gastos', id)
  }, [])

  // ── Abonos por músico ─────────────────────────────────────────

  const registrarAbono = useCallback(async (data) => {
    const nuevo = {
      id:          `gab-${shortId()}`,
      gasto_id:    data.gasto_id,
      musico_id:   data.musico_id || null,
      monto:       parseFloat(data.monto) || 0,
      fecha:       data.fecha || new Date().toISOString().slice(0, 10),
      descripcion: data.descripcion?.trim() || '',
      activo:      true,
      creado_en:   new Date().toISOString(),
    }
    setAbonos(prev => {
      const next = [nuevo, ...prev]
      lsSet(LS_ABONOS, next)
      return next
    })
    await db.insert('gastosAbonos', nuevo)
    return nuevo
  }, [])

  const eliminarAbono = useCallback(async (id) => {
    setAbonos(prev => {
      const next = prev.filter(a => a.id !== id)
      lsSet(LS_ABONOS, next)
      return next
    })
    await db.remove('gastosAbonos', id)
  }, [])

  // ── Cálculos derivados ────────────────────────────────────────

  /** Todos los abonos de un gasto */
  const abonosDe = useCallback((gastoId) =>
    abonos.filter(a => a.gasto_id === gastoId)
  , [abonos])

  /** Total pagado de un gasto (todos los músicos) */
  const pagadoDe = useCallback((gastoId) =>
    abonos.filter(a => a.gasto_id === gastoId).reduce((s, a) => s + (a.monto || 0), 0)
  , [abonos])

  /** Total pagado por un músico en un gasto específico */
  const pagadoPorMusico = useCallback((gastoId, musicoId) =>
    abonos
      .filter(a => a.gasto_id === gastoId && a.musico_id === musicoId)
      .reduce((s, a) => s + (a.monto || 0), 0)
  , [abonos])

  /** Abonos de un músico en un gasto */
  const abonosPorMusico = useCallback((gastoId, musicoId) =>
    abonos.filter(a => a.gasto_id === gastoId && a.musico_id === musicoId)
  , [abonos])

  /**
   * Cuota que le corresponde a un músico en un gasto.
   * Si el músico está exento devuelve 0.
   * El reparto se divide solo entre los no exentos.
   */
  const cuotaDeMusico = useCallback((gasto, musicoId, totalMusicos) => {
    const exentos = Array.isArray(gasto.exentos) ? gasto.exentos : []
    if (exentos.includes(musicoId)) return 0
    const pagantes = Math.max(1, totalMusicos - exentos.length)
    return Math.round((gasto.monto_cuota / pagantes) * 100) / 100
  }, [])

  const totalDeuda     = gastos.reduce((s, g) => s + (g.deuda_total || 0), 0)
  const totalPagado    = gastos.reduce((s, g) => s + pagadoDe(g.id), 0)
  const totalPendiente = Math.max(0, totalDeuda - totalPagado)

  return (
    <GastosContext.Provider value={{
      gastos,
      abonos,
      loading,
      agregarGasto,
      editarGasto,
      eliminarGasto,
      toggleExento,
      registrarAbono,
      eliminarAbono,
      abonosDe,
      pagadoDe,
      pagadoPorMusico,
      abonosPorMusico,
      cuotaDeMusico,
      totalDeuda,
      totalPagado,
      totalPendiente,
    }}>
      {children}
    </GastosContext.Provider>
  )
}

export function useGastos() {
  const ctx = useContext(GastosContext)
  if (!ctx) throw new Error('useGastos debe usarse dentro de <GastosProvider>')
  return ctx
}
