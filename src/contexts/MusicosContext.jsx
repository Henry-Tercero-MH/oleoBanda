/**
 * MusicosContext — Gestión de músicos de la banda
 * Los músicos son los mismos usuarios (AuthContext),
 * este contexto expone helpers y datos derivados sobre ellos.
 */
import { createContext, useContext, useCallback } from 'react'
import { useAuth } from './AuthContext'

export const INSTRUMENTOS = [
  'Guitarra Eléctrica', 'Guitarra Acústica', 'Bajo', 'Batería', 'Teclado / Piano',
  'Voz / Canto', 'Trompeta', 'Saxofón', 'Violín',
  'Flauta', 'Percusión', 'Dirección', 'Otro',
]

const MusicosContext = createContext(null)

export function MusicosProvider({ children }) {
  const { usuarios, agregarUsuario, editarUsuario, eliminarUsuario } = useAuth()

  // Todos los músicos activos
  const musicos = usuarios

  // Actualizar deuda de un músico (solo director)
  const actualizarDeuda = useCallback(async (musicoId, nuevaDeuda) => {
    await editarUsuario(musicoId, { deuda_total: parseFloat(nuevaDeuda) || 0 })
  }, [editarUsuario])

  // Agregar músico nuevo (wrapper con rol forzado a 'musico')
  const agregarMusico = useCallback(async (data) => {
    return agregarUsuario({ ...data, rol: data.rol || 'musico' })
  }, [agregarUsuario])

  return (
    <MusicosContext.Provider value={{
      musicos,
      instrumentos: INSTRUMENTOS,
      agregarMusico,
      editarMusico: editarUsuario,
      eliminarMusico: eliminarUsuario,
      actualizarDeuda,
    }}>
      {children}
    </MusicosContext.Provider>
  )
}

export function useMusicos() {
  const ctx = useContext(MusicosContext)
  if (!ctx) throw new Error('useMusicos debe usarse dentro de <MusicosProvider>')
  return ctx
}
