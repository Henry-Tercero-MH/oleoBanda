/**
 * ListasContext — Listas de reproducción de la banda
 * Cada lista agrupa videos (recursos de tipo 'video') por canción/tema.
 * Solo el director puede crear, editar y eliminar listas.
 */
import { createContext, useContext, useState, useCallback } from 'react'
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

export function ListasProvider({ children }) {
  const [listas, setListas] = useState(() => cargarListas())

  const _set = (fn) => {
    setListas(prev => {
      const next = fn(prev)
      guardarListas(next)
      return next
    })
  }

  /** Crea una lista nueva y retorna su id */
  const crearLista = useCallback((data) => {
    const nueva = {
      id:          `lst-${shortId()}`,
      nombre:      data.nombre.trim(),
      descripcion: data.descripcion?.trim() || '',
      video_ids:   [],
      creado_en:   new Date().toISOString(),
    }
    _set(prev => [nueva, ...prev])
    return nueva.id
  }, [])

  /** Edita nombre/descripción de una lista */
  const editarLista = useCallback((id, data) => {
    _set(prev => prev.map(l =>
      l.id === id ? { ...l, nombre: data.nombre.trim(), descripcion: data.descripcion?.trim() || '' } : l
    ))
  }, [])

  /** Elimina una lista (no elimina los recursos) */
  const eliminarLista = useCallback((id) => {
    _set(prev => prev.filter(l => l.id !== id))
  }, [])

  /** Agrega un video a una lista (evita duplicados) */
  const agregarVideoALista = useCallback((listaId, videoId) => {
    _set(prev => prev.map(l =>
      l.id === listaId
        ? { ...l, video_ids: l.video_ids.includes(videoId) ? l.video_ids : [...l.video_ids, videoId] }
        : l
    ))
  }, [])

  /** Quita un video de una lista */
  const quitarVideoDeList = useCallback((listaId, videoId) => {
    _set(prev => prev.map(l =>
      l.id === listaId
        ? { ...l, video_ids: l.video_ids.filter(id => id !== videoId) }
        : l
    ))
  }, [])

  /** Retorna las listas que contienen un video */
  const listasDeVideo = useCallback((videoId) =>
    listas.filter(l => l.video_ids.includes(videoId))
  , [listas])

  return (
    <ListasContext.Provider value={{
      listas,
      crearLista,
      editarLista,
      eliminarLista,
      agregarVideoALista,
      quitarVideoDeList,
      listasDeVideo,
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
