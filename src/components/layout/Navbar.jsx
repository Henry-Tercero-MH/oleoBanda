import { ListIcon } from '@phosphor-icons/react'
import { useLocation } from 'react-router-dom'
import SyncStatusBar from '../SyncStatusBar'
import NotificacionesPanel from '../NotificacionesPanel'

const TITLES = {
  '/':         'Dashboard',
  '/musicos':  'Músicos',
  '/recursos': 'Recursos',
  '/finanzas': 'Finanzas',
  '/ajustes':  'Ajustes del Sistema',
}

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Banda Musical'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="btn-icon btn-ghost text-gray-500 lg:hidden"
      >
        <ListIcon size={20} />
      </button>

      <h1 className="flex-1 text-lg font-semibold text-gray-900">{title}</h1>

      <NotificacionesPanel />
      <SyncStatusBar />

      <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
        <span>{new Date().toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </div>
    </header>
  )
}
