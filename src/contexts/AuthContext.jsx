import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { shortId } from '../utils/formatters'
import { sha256, gasGetAll, gasUpdate } from '../services/googleAppsScript'

export const AuthContext = createContext(null)

// Roles de la banda
export const ROLES = {
  director: {
    label: 'Director',
    rutas: ['/', '/musicos', '/recursos', '/listas', '/gastos', '/finanzas', '/ajustes'],
  },
  musico: {
    label: 'Músico',
    rutas: ['/', '/musicos', '/recursos', '/listas', '/gastos', '/finanzas'],
  },
}

const USUARIOS_DEFAULT = []

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem('banda_usuarios') || 'null') || USUARIOS_DEFAULT } catch { return USUARIOS_DEFAULT }
  })
  const [sesion, setSesion] = useLocalStorage('banda_sesion', null)

  // Persistir usuarios en localStorage
  useEffect(() => {
    localStorage.setItem('banda_usuarios', JSON.stringify(usuarios))
  }, [usuarios])

  // Siempre cargar desde Sheet al iniciar para tener fotos y datos actualizados
  useEffect(() => {
    gasGetAll('usuarios').then(res => {
      if (res?.ok && Array.isArray(res.data) && res.data.length > 0) {
        const activos = res.data.filter(u => u.activo !== false && u.activo !== 'false')
        localStorage.setItem('banda_usuarios', JSON.stringify(activos))
        setUsuarios(activos)
      }
    }).catch(() => {})
  }, [])

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
    try { await gasUpdate('usuarios', id, cambios) } catch {}
  }, [setSesion])

  const eliminarUsuario = useCallback(async (id) => {
    if (id === 'usr-director') return { ok: false, error: 'No puedes eliminar al director principal' }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: false } : u))
    try { await gasUpdate('usuarios', id, { activo: false }) } catch {}
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
