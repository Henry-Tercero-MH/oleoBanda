import { MusicNotesIcon, CurrencyDollarIcon, UsersThreeIcon, BookOpenIcon, CalendarBlankIcon, CreditCardIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFinanzas, TIPOS_INGRESO } from '../contexts/FinanzasContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useRecursos } from '../contexts/RecursosContext'
import { useGastos } from '../contexts/GastosContext'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function Dashboard() {
  const { sesion } = useAuth()
  const { musicos } = useMusicos()
  const { ingresos, pagosCuota, fondoDisponible, totalIngresos } = useFinanzas()
  const { recursos } = useRecursos()
  const { gastos, pagadoDe, pagadoPorMusico: pagadoGastoMusico, cuotaDeMusico, totalPendiente: gastosPendiente } = useGastos()

  const numMusicos = musicos.length || 1

  // Por músico: cuánto debe pagar de cada gasto y cuánto ha pagado
  const estadoPorMusico = musicos.map(m => {
    let totalCuota    = 0
    let totalPagado   = 0
    let gastosExento  = 0
    gastos.forEach(g => {
      const exentos = Array.isArray(g.exentos) ? g.exentos : []
      if (exentos.includes(m.id)) { gastosExento++; return }
      const cuotaM  = cuotaDeMusico(g, m.id, numMusicos)
      const pagadoM = pagadoGastoMusico(g.id, m.id)
      totalCuota  += cuotaM
      totalPagado += Math.min(pagadoM, cuotaM)
    })
    const esExentoTotal = gastos.length > 0 && gastosExento === gastos.length
    return { ...m, totalCuota, totalPagado, pendiente: Math.max(0, totalCuota - totalPagado), gastosExento, esExentoTotal }
  }).sort((a, b) => b.pendiente - a.pendiente)

  const musicosPend = estadoPorMusico.filter(m => m.pendiente > 0).length

  const ultimosMovimientos = [
    ...ingresos.map(i => ({ ...i, _tipo: 'ingreso' })),
    ...pagosCuota.map(p => ({ ...p, _tipo: 'pago' })),
  ]
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
    .slice(0, 6)

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
            <CreditCardIcon size={22} className="text-white" />
          </div>
          <div>
            <p className="stat-label text-orange-700">Gastos Fijos</p>
            <p className="stat-value">{formatCurrency(gastosPendiente)}</p>
            <p className="text-xs text-orange-600 mt-0.5">
              {musicosPend > 0 ? `${musicosPend} músico${musicosPend !== 1 ? 's' : ''} con pendiente` : 'todos al día ✓'}
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

      {/* Widgets Gastos Fijos — dos columnas */}
      {gastos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Widget 1: estado general por gasto */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCardIcon size={18} className="text-primary-500" />
                <h2 className="text-base font-semibold text-gray-800">Gastos Fijos</h2>
                {gastosPendiente > 0 && (
                  <span className="badge badge-orange">{formatCurrency(gastosPendiente)} pendiente</span>
                )}
              </div>
              <Link to="/gastos" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                Ver todo <ArrowRightIcon size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {gastos.slice(0, 4).map(g => {
                const pagado    = pagadoDe(g.id)
                const pendiente = Math.max(0, g.deuda_total - pagado)
                const pct       = g.deuda_total > 0 ? Math.min(100, Math.round((pagado / g.deuda_total) * 100)) : 0
                const listo     = pendiente === 0
                const hoy       = new Date()
                const limite    = g.fecha_limite ? new Date(g.fecha_limite) : null
                const diasRest  = limite ? Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24)) : null
                const vencido   = diasRest !== null && diasRest < 0
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">💳</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-gray-800 truncate">{g.nombre}</p>
                            {vencido && !listo && <span className="text-xs text-red-500 font-semibold flex-shrink-0">⚠ Vencido</span>}
                            {!vencido && !listo && diasRest !== null && diasRest <= 7 && (
                              <span className="text-xs text-amber-500 font-semibold flex-shrink-0">⏰ {diasRest}d</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">Cuota: {formatCurrency(g.monto_cuota)} · {g.num_cuotas} cuotas</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        {listo
                          ? <span className="text-xs font-semibold text-green-600">✓ Pagado</span>
                          : <><p className="text-xs font-semibold text-red-600">{formatCurrency(pendiente)}</p><p className="text-xs text-gray-400">pendiente</p></>
                        }
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${listo ? 'bg-green-500' : 'bg-gradient-to-r from-primary-500 to-violet-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct}% pagado de {formatCurrency(g.deuda_total)}</p>
                  </div>
                )
              })}
              {gastos.length > 4 && (
                <Link to="/gastos" className="block text-center text-xs text-primary-600 hover:underline pt-1">
                  Ver {gastos.length - 4} más...
                </Link>
              )}
            </div>
          </div>

          {/* Widget 2: avance por músico en gastos fijos */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UsersThreeIcon size={18} className="text-primary-500" />
                <h2 className="text-base font-semibold text-gray-800">Cuota por Músico</h2>
                {musicosPend > 0
                  ? <span className="badge badge-orange">{musicosPend} pendiente{musicosPend !== 1 ? 's' : ''}</span>
                  : <span className="badge badge-green">Todos al día ✓</span>
                }
              </div>
              <Link to="/musicos" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                Ver todo <ArrowRightIcon size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {estadoPorMusico.map(m => {
                if (m.esExentoTotal) {
                  return (
                    <div key={m.id} className="flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-2">
                        {m.foto_url ? (
                          <img src={m.foto_url} alt={m.nombre}
                            className="h-8 w-8 rounded-full object-cover border flex-shrink-0 grayscale"
                            onError={e => e.target.style.display='none'} />
                        ) : (
                          <div className="h-8 w-8 rounded-full text-sm font-bold flex items-center justify-center flex-shrink-0 bg-gray-200 text-gray-400">
                            {m.nombre?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-500">{m.nombre}</p>
                          <p className="text-xs text-gray-400">{m.instrumento}</p>
                        </div>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full border border-gray-200">Exento</span>
                    </div>
                  )
                }
                if (m.totalCuota === 0) return null
                const pct   = Math.min(100, Math.round((m.totalPagado / m.totalCuota) * 100))
                const listo = m.pendiente === 0
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {m.foto_url ? (
                          <img src={m.foto_url} alt={m.nombre}
                            className="h-8 w-8 rounded-full object-cover border flex-shrink-0"
                            onError={e => e.target.style.display='none'} />
                        ) : (
                          <div className={`h-8 w-8 rounded-full text-sm font-bold flex items-center justify-center flex-shrink-0
                            ${listo ? 'bg-green-100 text-green-700' : 'bg-gradient-to-br from-primary-400 to-violet-500 text-white'}`}>
                            {m.nombre?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800">{m.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {m.instrumento}
                            {m.gastosExento > 0 && <span className="ml-1 text-gray-300">· {m.gastosExento} exento{m.gastosExento !== 1 ? 's' : ''}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {listo
                          ? <span className="text-xs font-semibold text-green-600">✓ Al día</span>
                          : <><p className="text-xs font-semibold text-red-600">{formatCurrency(m.pendiente)}</p><p className="text-xs text-gray-400">pendiente</p></>
                        }
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${listo ? 'bg-green-500' : 'bg-gradient-to-r from-primary-500 to-violet-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct}% · {formatCurrency(m.totalPagado)} de {formatCurrency(m.totalCuota)}</p>
                  </div>
                )
              })}
              {estadoPorMusico.every(m => m.totalCuota === 0 && !m.esExentoTotal) && (
                <div className="text-center py-6 text-gray-400">
                  <MusicNotesIcon size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin cuotas asignadas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm ${esIngreso ? 'bg-green-100' : 'bg-orange-100'}`}>
                    {esIngreso ? (tipoInfo?.emoji || '💰') : '📤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {esIngreso ? (tipoInfo?.label || mov.tipo) : `Abono cuota${mov.descripcion ? ` — ${mov.descripcion}` : ''}`}
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
  )
}
