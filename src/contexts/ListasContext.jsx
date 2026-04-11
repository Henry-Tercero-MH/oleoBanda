/**
 * ListasContext — Listas de reproducción de la banda
 * Cada lista agrupa videos (recursos de tipo 'video') por canción/tema.
 * Solo el director puede crear, editar y eliminar listas.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../services/db'
import { shortId } from '../utils/formatters'

const ListasContext = createContext(null)

const LS_KEY = 'banda_listas'

function cargarListas() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function guardarListas(lista) {
  localStorage.setItem(LS_KEY, JSON.stringify(lista))
}

// video_ids se guarda como JSON string en el Sheet
function serializarParaSheet(lista) {
  return { ...lista, video_ids: JSON.stringify(lista.video_ids) }
}

export function ListasProvider({ children }) {
  const [listas, setListas] = useState(() => cargarListas())

  // Al montar: si hay datos en Sheet, fusionar con local
  useEffect(() => {
    db.getAll('listas').then(data => {
      if (!data?.length) return
      const remotas = data.map(l => ({
        ...l,
        video_ids: typeof l.video_ids === 'string'
          ? (() => { try { return JSON.parse(l.video_ids) } catch { return [] } })()
          : (l.video_ids || []),
        ensayo: l.ensayo === true || l.ensayo === 'true',
      }))
      // Fusionar: prioridad al Sheet si tiene más datos
      setListas(prev => {
        const merged = [...prev]
        remotas.forEach(r => {
          if (!merged.find(l => l.id === r.id)) merged.push(r)
        })
        guardarListas(merged)
        return merged
      })
    })
  }, [])

  const _set = (fn, dbOp) => {
    setListas(prev => {
      const next = fn(prev)
      guardarListas(next)
      return next
    })
    dbOp?.()
  }

  /** Crea una lista nueva y retorna su id */
  const crearLista = useCallback((data) => {
    const nueva = {
      id:          `lst-${shortId()}`,
      nombre:      data.nombre.trim(),
      descripcion: data.descripcion?.trim() || '',
      video_ids:   [],
      ensayo:      false,
      creado_en:   new Date().toISOString(),
    }
    _set(prev => [nueva, ...prev], () => db.insert('listas', serializarParaSheet(nueva)))
    return nueva.id
  }, [])

  /** Edita nombre/descripción de una lista */
  const editarLista = useCallback((id, data) => {
    const cambios = { nombre: data.nombre.trim(), descripcion: data.descripcion?.trim() || '' }
    _set(
      prev => prev.map(l => l.id === id ? { ...l, ...cambios } : l),
      () => db.update('listas', id, cambios)
    )
  }, [])

  /** Elimina una lista (no elimina los recursos) */
  const eliminarLista = useCallback((id) => {
    _set(
      prev => prev.filter(l => l.id !== id),
      () => db.remove('listas', id)
    )
  }, [])

  /** Agrega un video a una lista (evita duplicados) */
  const agregarVideoALista = useCallback((listaId, videoId) => {
    _set(prev => {
      const next = prev.map(l =>
        l.id === listaId
          ? { ...l, video_ids: l.video_ids.includes(videoId) ? l.video_ids : [...l.video_ids, videoId] }
          : l
      )
      const lista = next.find(l => l.id === listaId)
      if (lista) db.update('listas', listaId, { video_ids: JSON.stringify(lista.video_ids) })
      return next
    })
  }, [])

  /** Quita un video de una lista */
  const quitarVideoDeList = useCallback((listaId, videoId) => {
    _set(prev => {
      const next = prev.map(l =>
        l.id === listaId
          ? { ...l, video_ids: l.video_ids.filter(id => id !== videoId) }
          : l
      )
      const lista = next.find(l => l.id === listaId)
      if (lista) db.update('listas', listaId, { video_ids: JSON.stringify(lista.video_ids) })
      return next
    })
  }, [])

  /** Retorna las listas que contienen un video */
  const listasDeVideo = useCallback((videoId) =>
    listas.filter(l => l.video_ids.includes(videoId))
  , [listas])

  /** Marca/desmarca una lista como la del próximo ensayo */
  const marcarEnsayo = useCallback((id) => {
    _set(prev => {
      const next = prev.map(l =>
        l.id === id
          ? { ...l, ensayo: !l.ensayo }
          : { ...l, ensayo: false }
      )
      // Sincronizar todos los cambios de ensayo al Sheet
      next.forEach(l => db.update('listas', l.id, { ensayo: l.ensayo }))
      return next
    })
  }, [])

  return (
    <ListasContext.Provider value={{
      listas,
      crearLista,
      editarLista,
      eliminarLista,
      agregarVideoALista,
      quitarVideoDeList,
      listasDeVideo,
      marcarEnsayo,
    }}>
      {children}
    </ListasContext.Provider>
  )
}

export function useListas() {
  const ctx = useContext(ListasContext)
  if (!ctx) throw new Error('useListas debe usarse dentro de <ListasProvider>')
  return ctx
}
