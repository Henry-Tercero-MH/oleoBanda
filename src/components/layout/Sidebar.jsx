import { NavLink } from 'react-router-dom'
import {
  HouseIcon, UsersThreeIcon, MusicNotesIcon, CurrencyDollarIcon,
  GearSixIcon, XIcon, SignOutIcon, PlaylistIcon, CreditCardIcon,
  CalendarCheckIcon,
} from '@phosphor-icons/react'
import { useAuth, ROLES } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',    icon: HouseIcon,          end: true },
  { separator: true,    label: 'BANDA' },
  { to: '/musicos',     label: 'Músicos',      icon: UsersThreeIcon },
  { to: '/asistencia',  label: 'Asistencia',   icon: CalendarCheckIcon },
  { to: '/recursos',    label: 'Recursos',     icon: MusicNotesIcon },
  { to: '/listas',      label: 'Listas',       icon: PlaylistIcon },
  { separator: true,    label: 'ADMINISTRACIÓN' },
  { to: '/gastos',      label: 'Gastos Fijos', icon: CreditCardIcon },
  { to: '/finanzas',    label: 'Finanzas',     icon: CurrencyDollarIcon },
  { separator: true,    label: 'SISTEMA' },
  { to: '/ajustes',     label: 'Ajustes',      icon: GearSixIcon },
]

export default function Sidebar({ open, onClose }) {
  const { sesion, logout, tieneAcceso } = useAuth()

  const items = NAV_ITEMS.filter(item => {
    if (item.separator) return true
    return tieneAcceso(item.to)
  }).filter((item, i, arr) => {
    if (!item.separator) return true
    const next = arr[i + 1]
    return next && !next.separator
  })

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-xl border-r border-gray-100
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0 lg:shadow-none
      `}>
        {/* Logo / Nombre banda */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/icons/logoOleo.jpeg"
              alt="Óleo de Alegría"
              className="h-10 w-10 object-contain rounded-lg"
            />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">ÓLEO DE ALEGRÍA</p>
              <p className="text-xs text-gray-400 italic">Salmos 45:7</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden btn-icon btn-ghost text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div key={`sep-${index}`} className="pt-3 pb-1 px-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              )
            }
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  isActive ? 'sidebar-item-active' : 'sidebar-item'
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Usuario actual */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
              {sesion?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{sesion?.nombre}</p>
              <p className="truncate text-xs text-gray-400">{ROLES[sesion?.rol]?.label} · {sesion?.instrumento}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="btn-icon btn-ghost text-gray-400 hover:text-red-500"
            >
              <SignOutIcon size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
