/**
 * FinanzasContext — Gestión financiera de la banda
 *
 * INGRESOS (entradas al fondo):
 *   - ofrenda_lunes: Q10 por músico presente cada lunes de ensayo
 *   - venta:         venta de artículos para recaudar fondos
 *   - evento:        pago recibido por tocar en un evento
 *   - ofrenda_toque: ofrenda recibida por tocar en servicio/evento
 *
 * PAGOS DE CUOTA (salidas del fondo hacia abono de instrumento):
 *   - Cada músico tiene deuda_total en su perfil
 *   - Cada pago_cuota reduce su deuda pendiente
 *
 * FONDO DISPONIBLE = Σ ingresos − Σ pagos_cuota
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../services/db'
import { shortId } from '../utils/formatters'

const FinanzasContext = createContext(null)

export const TIPOS_INGRESO = {
  ofrenda_lunes: { label: 'Ofrenda Lunes',   color: 'purple', emoji: '🙏' },
  venta:         { label: 'Venta',            color: 'blue',   emoji: '🛍️' },
  evento:        { label: 'Evento / Concierto', color: 'green', emoji: '🎤' },
  ofrenda_toque: { label: 'Ofrenda por Toque', color: 'yellow', emoji: '🎵' },
}

export function FinanzasProvider({ children }) {
  const [ingresos, setIngresos]       = useState([])
  const [pagosCuota, setPagosCuota]   = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      db.getAll('ingresos'),
      db.getAll('pagosCuota'),
    ]).then(([ing, pag]) => {
      setIngresos(ing.filter(i => i.activo !== false))
      setPagosCuota(pag.filter(p => p.activo !== false))
      setLoading(false)
    })
  }, [])

  // ── Ingresos ──────────────────────────────────────────────────

  const registrarIngreso = useCallback(async (data) => {
    const nuevo = {
      ...data,
      id: `ing-${shortId()}`,
      monto: parseFloat(data.monto) || 0,
      activo: true,
      creado_en: new Date().toISOString(),
    }
    setIngresos(prev => [nuevo, ...prev])
    await db.insert('ingresos', nuevo)
    return nuevo
  }, [])

  const eliminarIngreso = useCallback(async (id) => {
    setIngresos(prev => prev.filter(i => i.id !== id))
    await db.remove('ingresos', id)
  }, [])

  // ── Pagos de cuota ────────────────────────────────────────────

  const registrarPagoCuota = useCallback(async (data) => {
    const nuevo = {
      ...data,
      id: `pago-${shortId()}`,
      monto: parseFloat(data.monto) || 0,
      activo: true,
      creado_en: new Date().toISOString(),
    }
    setPagosCuota(prev => [nuevo, ...prev])
    await db.insert('pagosCuota', nuevo)
    return nuevo
  }, [])

  const eliminarPagoCuota = useCallback(async (id) => {
    setPagosCuota(prev => prev.filter(p => p.id !== id))
    await db.remove('pagosCuota', id)
  }, [])

  // ── Cálculos derivados ────────────────────────────────────────

  const totalIngresos    = ingresos.reduce((s, i) => s + (i.monto || 0), 0)
  const totalPagado      = pagosCuota.reduce((s, p) => s + (p.monto || 0), 0)
  const fondoDisponible  = totalIngresos - totalPagado

  // Deuda pagada por músico
  const pagadoPorMusico = useCallback((musicoId) => {
    return pagosCuota
      .filter(p => p.musico_id === musicoId)
      .reduce((s, p) => s + (p.monto || 0), 0)
  }, [pagosCuota])

  // Pagos de un músico específico
  const pagosDe = useCallback((musicoId) => {
    return pagosCuota.filter(p => p.musico_id === musicoId)
  }, [pagosCuota])

  return (
    <FinanzasContext.Provider value={{
      ingresos,
      pagosCuota,
      loading,
      tiposIngreso: TIPOS_INGRESO,
      registrarIngreso,
      eliminarIngreso,
      registrarPagoCuota,
      eliminarPagoCuota,
      totalIngresos,
      totalPagado,
      fondoDisponible,
      pagadoPorMusico,
      pagosDe,
    }}>
      {children}
    </FinanzasContext.Provider>
  )
}

export function useFinanzas() {
  const ctx = useContext(FinanzasContext)
  if (!ctx) throw new Error('useFinanzas debe usarse dentro de <FinanzasProvider>')
  return ctx
}
