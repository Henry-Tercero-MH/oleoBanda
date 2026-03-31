import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId } from '../utils/formatters'
import { db } from '../services/db'
import { sha256 } from '../services/googleAppsScript'

export const AuthContext = createContext(null)

// Roles de la banda
export const ROLES = {
  director: {
    label: 'Director',
    rutas: ['/', '/musicos', '/recursos', '/finanzas', '/ajustes'],
  },
  musico: {
    label: 'Músico',
    rutas: ['/', '/musicos', '/recursos', '/finanzas'],
  },
}

// SHA-256 de 'director123'
const HASH_DIRECTOR_DEFAULT = '9e4d7bba246abe731743986c4dc50897b68b1d0249a066abb3530fcbaa33dab3'

const USUARIOS_DEFAULT = [
  {
    id: 'usr-director',
    nombre: 'Director',
    email: 'director@banda.com',
    password_hash: HASH_DIRECTOR_DEFAULT,
    rol: 'director',
    instrumento: 'Dirección',
    deuda_total: 0,
    activo: true,
    creado_en: new Date().toISOString(),
  },
]

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem('banda_usuarios') || 'null') || USUARIOS_DEFAULT } catch { return USUARIOS_DEFAULT }
  })
  const [sesion, setSesion] = useLocalStorage('banda_sesion', null)

  useEffect(() => {
    db.getAll('usuarios').then(data => { if (data.length) setUsuarios(data) })
  }, [])

  // Persistir usuarios en localStorage con clave nueva
  useEffect(() => {
    localStorage.setItem('banda_usuarios', JSON.stringify(usuarios))
  }, [usuarios])

  const login = useCallback(async (email, password) => {
    const hash = await sha256(password)
    const usuario = usuarios.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password_hash === hash && u.activo
    )
    if (!usuario) return { ok: false, error: 'Credenciales incorrectas' }
    const { password_hash: _, ...sesionData } = usuario
    setSesion(sesionData)
    return { ok: true }
  }, [usuarios, setSesion])

  const logout = useCallback(() => setSesion(null), [setSesion])

  const tieneAcceso = useCallback((ruta) => {
    if (!sesion || !ruta) return false
    const rol = ROLES[sesion.rol]
    if (!rol) return false
    return rol.rutas.some(r => ruta === r || ruta.startsWith(r + '/'))
  }, [sesion])

  const esDirector = sesion?.rol === 'director'

  const agregarUsuario = useCallback(async (data) => {
    if (usuarios.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { ok: false, error: 'Ya existe un usuario con ese email' }
    }
    const { password, ...resto } = data
    const password_hash = password ? await sha256(password) : ''
    const nuevo = {
      ...resto,
      password_hash,
      id: `usr-${shortId()}`,
      activo: true,
      creado_en: new Date().toISOString(),
    }
    setUsuarios(prev => [...prev, nuevo])
    await db.insert('usuarios', nuevo)
    return { ok: true }
  }, [usuarios])

  const editarUsuario = useCallback(async (id, data) => {
    let cambios = { ...data }
    if (data.password) {
      cambios.password_hash = await sha256(data.password)
      delete cambios.password
    }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...cambios } : u))
    // Actualizar sesión si es el usuario actual
    setSesion(prev => prev?.id === id ? { ...prev, ...cambios } : prev)
    await db.update('usuarios', id, cambios)
  }, [setSesion])

  const eliminarUsuario = useCallback(async (id) => {
    if (id === 'usr-director') return { ok: false, error: 'No puedes eliminar al director principal' }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: false } : u))
    await db.remove('usuarios', id)
    return { ok: true }
  }, [])

  return (
    <AuthContext.Provider value={{
      sesion,
      usuarios: usuarios.filter(u => u.activo),
      login,
      logout,
      tieneAcceso,
      esDirector,
      agregarUsuario,
      editarUsuario,
      eliminarUsuario,
      estaAutenticado: !!sesion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
