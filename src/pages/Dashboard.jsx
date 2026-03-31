import { MusicNotesIcon, CurrencyDollarIcon, UsersThreeIcon, BookOpenIcon, TrendDownIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { useFinanzas, TIPOS_INGRESO } from '../contexts/FinanzasContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useRecursos } from '../contexts/RecursosContext'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function Dashboard() {
  const { sesion } = useAuth()
  const { musicos } = useMusicos()
  const { ingresos, pagosCuota, fondoDisponible, totalIngresos, pagadoPorMusico } = useFinanzas()
  const { recursos } = useRecursos()

  const deudaTotalBanda = musicos.reduce((s, m) => s + (m.deuda_total || 0), 0)
  const deudaPendienteBanda = musicos.reduce((s, m) => {
    const pendiente = Math.max(0, (m.deuda_total || 0) - pagadoPorMusico(m.id))
    return s + pendiente
  }, 0)

  const ultimosMovimientos = [
    ...ingresos.map(i => ({ ...i, _tipo: 'ingreso' })),
    ...pagosCuota.map(p => ({ ...p, _tipo: 'pago' })),
  ]
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
    .slice(0, 6)

  const musicosConDeuda = musicos
    .map(m => ({
      ...m,
      pagado: pagadoPorMusico(m.id),
      pendiente: Math.max(0, (m.deuda_total || 0) - pagadoPorMusico(m.id)),
    }))
    .filter(m => m.deuda_total > 0)
    .sort((a, b) => b.pendiente - a.pendiente)

  const esLunes = new Date().getDay() === 1

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Bienvenido, {sesion?.nombre}! 🎵
        </h1>
        <p className="text-sm text-gray-500 capitalize">
          {new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {esLunes && <span className="ml-2 badge badge-purple">🎸 Día de ensayo</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card card-gradient-green">
          <div className="stat-icon bg-gradient-to-br from-green-500 to-emerald-600">
            <CurrencyDollarIcon size={22} className="text-white" />
          </div>
          <div>
            <p className="stat-label text-green-700">Fondo Disponible</p>
            <p className="stat-value">{formatCurrency(fondoDisponible)}</p>
            <p className="text-xs text-green-600 mt-0.5">
              de {formatCurrency(totalIngresos)} recaudados
            </p>
          </div>
        </div>

        <div className="stat-card card-gradient-orange">
          <div className="stat-icon bg-gradient-to-br from-orange-500 to-red-500">
            <TrendDownIcon size={22} className="text-white" />
          </div>
          <div>
            <p className="stat-label text-orange-700">Deuda Pendiente</p>
            <p className="stat-value">{formatCurrency(deudaPendienteBanda)}</p>
            <p className="text-xs text-orange-600 mt-0.5">
              de {formatCurrency(deudaTotalBanda)} totales
            </p>
          </div>
        </div>

        <div className="stat-card card-gradient-purple">
          <div className="stat-icon bg-gradient-to-br from-primary-500 to-violet-600">
            <UsersThreeIcon size={22} className="text-white" />
          </div>
          <div>
            <p className="stat-label text-primary-700">Músicos</p>
            <p className="stat-value">{musicos.length}</p>
            <p className="text-xs text-primary-600 mt-0.5">miembros activos</p>
          </div>
        </div>

        <div className="stat-card card-gradient-blue">
          <div className="stat-icon bg-gradient-to-br from-blue-500 to-cyan-600">
            <BookOpenIcon size={22} className="text-white" />
          </div>
          <div>
            <p className="stat-label text-blue-700">Recursos</p>
            <p className="stat-value">{recursos.length}</p>
            <p className="text-xs text-blue-600 mt-0.5">videos, partituras e imágenes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cuotas por músico */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Estado de Cuotas</h2>
            <span className="badge badge-orange">{musicosConDeuda.length} con deuda</span>
          </div>

          {musicosConDeuda.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MusicNotesIcon size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">¡Sin deudas! Todos al día 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {musicosConDeuda.map(m => {
                const pct = m.deuda_total > 0 ? Math.round((m.pagado / m.deuda_total) * 100) : 0
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                          {m.nombre?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{m.nombre}</p>
                          <p className="text-xs text-gray-400">{m.instrumento}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-red-600">{formatCurrency(m.pendiente)}</p>
                        <p className="text-xs text-gray-400">pendiente</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct}% pagado de {formatCurrency(m.deuda_total)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimos movimientos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Últimos Movimientos</h2>
            <CalendarBlankIcon size={16} className="text-gray-400" />
          </div>

          {ultimosMovimientos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CurrencyDollarIcon size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin movimientos aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimosMovimientos.map(mov => {
                const esIngreso = mov._tipo === 'ingreso'
                const tipoInfo = esIngreso ? TIPOS_INGRESO[mov.tipo] : null
                return (
                  <div key={mov.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm
                      ${esIngreso ? 'bg-green-100' : 'bg-orange-100'}`}>
                      {esIngreso ? (tipoInfo?.emoji || '💰') : '📤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {esIngreso
                          ? (tipoInfo?.label || mov.tipo)
                          : `Abono cuota${mov.descripcion ? ` — ${mov.descripcion}` : ''}`}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(mov.fecha || mov.creado_en)}</p>
                    </div>
                    <p className={`text-sm font-semibold flex-shrink-0 ${esIngreso ? 'text-green-600' : 'text-red-500'}`}>
                      {esIngreso ? '+' : '-'}{formatCurrency(mov.monto)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
