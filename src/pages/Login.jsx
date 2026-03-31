import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const result = await login(form.email, form.password)
    setLoading(false)
    if (!result.ok) { setError(result.error); return }
    navigate(from, { replace: true })
  }



  return (
    <div className="min-h-screen bg-white flex">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Notas de fondo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 select-none">
          <span className="text-white" style={{ fontSize: '40rem', lineHeight: 1 }}>♪</span>
        </div>
        <div className="relative z-10 flex flex-col items-center text-center gap-8">
          <img
            src="/icons/logoOleo.jpeg"
            alt="Óleo de Alegría"
            className="w-52 h-52 object-contain rounded-2xl shadow-2xl"
            style={{ filter: 'invert(1)' }}
          />
          <div>
            <h2 className="text-4xl font-bold text-white tracking-wide">ÓLEO DE ALEGRÍA</h2>
            <p className="text-gray-400 mt-2 text-lg italic">Salmos 45:7</p>
          </div>
          <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
            Sistema de gestión para la banda — recursos, músicos y finanzas en un solo lugar.
          </p>

          {/* Eliminado: Ver demo sin iniciar sesión, Acceso director, credenciales de ejemplo */}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo móvil */}
          <div className="lg:hidden flex flex-col items-center mb-8 gap-3">
            <img
              src="/icons/logoOleo.jpeg"
              alt="Óleo de Alegría"
              className="w-24 h-24 object-contain"
            />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">ÓLEO DE ALEGRÍA</h1>
              <p className="text-xs text-gray-400 italic">Salmos 45:7</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
            <p className="text-gray-400 mt-1 text-sm">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert type="error" message={error} onClose={() => setError('')} />
            )}

            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Correo electrónico"
                  className="input pl-9"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-lg bg-black text-white hover:bg-gray-900 focus:ring-gray-700 disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-300">
            Óleo de Alegría v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
