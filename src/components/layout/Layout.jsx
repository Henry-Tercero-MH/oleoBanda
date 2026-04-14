import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { MapPinIcon, XIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useAsistencia } from '../../contexts/AsistenciaContext'

const GPS_KEY = 'banda_gps_permiso_solicitado'

// ── Hook de auto-marcado GPS en tiempo real ───────────────────
function useGpsAutoMarca() {
  const { sesion } = useAuth()
  const { ensayos, getRegistro, registrarAsistencia } = useAsistencia()
  const marcadosRef = useRef(new Set()) // ensayos ya marcados esta sesión
  const [toast, setToast] = useState(null) // { mensaje }

  const distanciaMetros = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const calcMinutosTarde = (horaEnsayo) => {
    if (!horaEnsayo) return 0
    const [hh, mm] = horaEnsayo.split(':').map(Number)
    const ahora = new Date()
    const diff = ahora.getHours() * 60 + ahora.getMinutes() - (hh * 60 + mm)
    return diff > 0 ? diff : 0
  }

  useEffect(() => {
    if (!sesion || !navigator.geolocation) return

    // Solo ensayos de hoy con GPS configurado
    const hoy = new Date().toISOString().slice(0, 10)

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords

        for (const ensayo of ensayos) {
          if (!ensayo.lat || !ensayo.lng) continue

          // Solo ensayos del día de hoy
          const fechaEnsayo = String(ensayo.fecha).slice(0, 10)
          if (fechaEnsayo !== hoy) continue

          // No marcar dos veces en la misma sesión
          if (marcadosRef.current.has(ensayo.id)) continue

          // No marcar si ya tiene registro
          const yaRegistrado = getRegistro(ensayo.id, sesion.id)
          if (yaRegistrado) {
            marcadosRef.current.add(ensayo.id)
            continue
          }

          const dist = distanciaMetros(latitude, longitude, parseFloat(ensayo.lat), parseFloat(ensayo.lng))
          if (dist <= 300) {
            const mins = calcMinutosTarde(ensayo.hora)
            const estado = mins > 0 ? 'tardanza' : 'presente'
            await registrarAsistencia(ensayo.id, sesion.id, estado, mins)
            marcadosRef.current.add(ensayo.id)

            const msg = estado === 'presente'
              ? `✅ Asistencia marcada: ${ensayo.titulo || 'Ensayo'}`
              : `⏰ Tardanza registrada: ${mins} min — ${ensayo.titulo || 'Ensayo'}`
            setToast(msg)
            setTimeout(() => setToast(null), 5000)
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [sesion, ensayos]) // eslint-disable-line react-hooks/exhaustive-deps

  return { toast }
}

// ── Layout ────────────────────────────────────────────────────
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bannerGps, setBannerGps] = useState(false)
  const { toast } = useGpsAutoMarca()

  useEffect(() => {
    if (!navigator.geolocation) return
    if (localStorage.getItem(GPS_KEY)) return
    const t = setTimeout(() => setBannerGps(true), 2000)
    return () => clearTimeout(t)
  }, [])

  const pedirPermiso = () => {
    navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true })
    localStorage.setItem(GPS_KEY, '1')
    setBannerGps(false)
  }

  const descartar = () => {
    localStorage.setItem(GPS_KEY, '1')
    setBannerGps(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {bannerGps && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-600 text-white text-sm flex-shrink-0">
            <MapPinIcon size={18} className="flex-shrink-0" />
            <p className="flex-1 text-xs sm:text-sm">
              Activa tu ubicación para marcarte automáticamente en los ensayos.
            </p>
            <button onClick={pedirPermiso}
              className="flex-shrink-0 px-3 py-1 rounded-lg bg-white text-violet-700 font-semibold text-xs hover:bg-violet-50 transition-colors">
              Activar
            </button>
            <button onClick={descartar} className="flex-shrink-0 opacity-70 hover:opacity-100">
              <XIcon size={16} />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Toast de auto-marcado */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-2xl shadow-2xl animate-fade-in">
          <CheckCircleIcon size={18} className="text-green-400 flex-shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
