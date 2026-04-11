/**
 * RecursosContext — Biblioteca multimedia de la banda
 *
 * Estrategia de almacenamiento de archivos:
 *   1. Si hay conexión y Apps Script configurado → sube a Google Drive,
 *      guarda solo la URL en localStorage y Sheet.
 *   2. Sin conexión o sin URL configurada → guarda base64 en localStorage
 *      (fallback offline, límite ~5MB por archivo).
 *
 * Tipos:
 *   - video:      enlace externo (YouTube, Drive, etc.)
 *   - partitura:  PDF  → Drive o base64
 *   - imagen:     foto → Drive o base64
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db, _online } from '../services/db'
import { uploadToDrive, deleteFromDrive } from '../services/googleAppsScript'
import { shortId } from '../utils/formatters'

const RecursosContext = createContext(null)

export const TIPOS_RECURSO = {
  video:     { label: 'Video',     icon: '🎬', accept: null },
  partitura: { label: 'Partitura', icon: '📄', accept: 'application/pdf' },
  imagen:    { label: 'Imagen',    icon: '🖼️', accept: 'image/*' },
}

const GAS_URL = import.meta.env.VITE_APPS_SCRIPT_URL || ''

/** Convierte File → data URL base64 */
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload  = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export function RecursosProvider({ children }) {
  const [recursos, setRecursos] = useState([])
  const [loading, setLoading]   = useState(true)

  // Cargar desde localStorage primero (para no mostrar pantalla vacía)
  // luego sincronizar con Sheet como fuente de verdad
  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('banda_recursos') || '[]')
        .filter(r => r.activo !== false)
      if (local.length) setRecursos(local)
    } catch { /* silent */ }

    // Siempre consultar el Sheet — es la fuente de verdad entre dispositivos
    db.getAll('recursos').then(data => {
      if (!data?.length) { setLoading(false); return }
      const activos = data.filter(r => r.activo !== false)
      localStorage.setItem('banda_recursos', JSON.stringify(activos))
      setRecursos(activos)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const _guardarLocal = (lista) => {
    localStorage.setItem('banda_recursos', JSON.stringify(lista))
  }

  const agregarRecurso = useCallback(async (data, file = null) => {
    const nuevo = {
      id:             `rec-${shortId()}`,
      musico_id:      data.musico_id || null,
      instrumento:    data.instrumento || '',
      tipo:           data.tipo,
      titulo:         data.titulo,
      descripcion:    data.descripcion || '',
      url_video:      data.url_video || null,
      // Campos de archivo (se rellenan abajo)
      archivo_nombre: null,
      archivo_tipo:   null,
      archivo_base64: null,   // usado solo en modo offline
      drive_file_id:  null,   // ID del archivo en Drive
      drive_url:      null,   // URL para ver en Drive
      drive_download: null,   // URL directa de descarga
      activo:         true,
      creado_en:      new Date().toISOString(),
      creado_por:     data.creado_por || null,
    }

    if (file) {
      nuevo.archivo_nombre = file.name
      nuevo.archivo_tipo   = file.type

      const puedeUsarDrive = GAS_URL && _online

      if (puedeUsarDrive) {
        // ── Subir a Google Drive ──────────────────────────────
        const base64 = await fileToBase64(file)
        const res    = await uploadToDrive(file.name, file.type, base64)

        if (res.ok) {
          nuevo.drive_file_id  = res.fileId
          nuevo.drive_url      = res.url
          nuevo.drive_download = res.downloadUrl
          nuevo.drive_preview  = res.previewUrl
        } else {
          // Drive falló → fallback a base64
          nuevo.archivo_base64 = base64
        }
      } else {
        // ── Fallback: base64 en localStorage ─────────────────
        nuevo.archivo_base64 = await fileToBase64(file)
      }
    }

    // Actualizar estado
    setRecursos(prev => {
      const lista = [nuevo, ...prev]
      _guardarLocal(lista)
      return lista
    })

    // Sincronizar al Sheet (sin base64 — demasiado grande)
    const paraSheet = { ...nuevo, archivo_base64: nuevo.archivo_base64 ? '[LOCAL]' : null }
    await db.insert('recursos', paraSheet)

    return nuevo
  }, [])

  const eliminarRecurso = useCallback(async (id) => {
    // Si tiene archivo en Drive, eliminarlo también
    const recurso = recursos.find(r => r.id === id)
    if (recurso?.drive_file_id && GAS_URL && _online) {
      await deleteFromDrive(recurso.drive_file_id).catch(() => {/* silent */})
    }

    setRecursos(prev => {
      const lista = prev.filter(r => r.id !== id)
      _guardarLocal(lista)
      return lista
    })
    await db.remove('recursos', id)
  }, [recursos])

  const recursosDe = useCallback((musicoId) =>
    recursos.filter(r => r.musico_id === musicoId), [recursos])

  const recursosPorTipo = useCallback((tipo) =>
    recursos.filter(r => r.tipo === tipo), [recursos])

  return (
    <RecursosContext.Provider value={{
      recursos,
      loading,
      tiposRecurso: TIPOS_RECURSO,
      agregarRecurso,
      eliminarRecurso,
      recursosDe,
      recursosPorTipo,
      usandoDrive: !!(GAS_URL && _online),
    }}>
      {children}
    </RecursosContext.Provider>
  )
}

export function useRecursos() {
  const ctx = useContext(RecursosContext)
  if (!ctx) throw new Error('useRecursos debe usarse dentro de <RecursosProvider>')
  return ctx
}
