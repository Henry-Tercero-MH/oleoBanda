import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { MapPinIcon, XIcon } from '@phosphor-icons/react'

const GPS_KEY = 'banda_gps_permiso_solicitado'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bannerGps, setBannerGps] = useState(false)

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
    </div>
  )
}
