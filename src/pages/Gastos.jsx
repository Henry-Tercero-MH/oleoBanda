import { useState } from 'react'
import {
  PlusIcon, XIcon, TrashIcon, PencilSimpleIcon,
  FloppyDiskIcon, CurrencyDollarIcon, CaretDownIcon,
  CaretUpIcon, CreditCardIcon, WarningCircleIcon,
  CalendarIcon, UsersThreeIcon,
} from '@phosphor-icons/react'
import { useGastos } from '../contexts/GastosContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate } from '../utils/formatters'

// ── Modal crear / editar gasto ────────────────────────────────────────────────
function ModalGasto({ gasto = null, onClose }) {
  const { agregarGasto, editarGasto } = useGastos()
  const [form, setForm] = useState({
    nombre:       gasto?.nombre       || '',
    descripcion:  gasto?.descripcion  || '',
    deuda_total:  gasto?.deuda_total  || '',
    num_cuotas:   gasto?.num_cuotas   || '',
    fecha_limite: gasto?.fecha_limite || '',
    fecha_inicio: gasto?.fecha_inicio || new Date().toISOString().slice(0, 10),
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const esEdicion = !!gasto

  // Cuota calculada automáticamente
  const cuotaCalc = form.deuda_total && form.num_cuotas
    ? Math.round((parseFloat(form.deuda_total) / parseInt(form.num_cuotas)) * 100) / 100
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre)       { setError('El nombre es requerido');           return }
    if (!form.deuda_total)  { setError('La deuda total es requerida');      return }
    if (!form.num_cuotas || parseInt(form.num_cuotas) < 1)
                            { setError('Ingresa un número de cuotas válido'); return }
    if (!form.fecha_limite) { setError('La fecha límite es requerida');     return }
    setLoading(true)
    if (esEdicion) {
      await editarGasto(gasto.id, form)
    } else {
      await agregarGasto(form)
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar gasto' : 'Nuevo gasto fijo'}
          </h2>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Visa cuotas sonido, Préstamo batería..." autoFocus />
          </div>

          <div>
            <label className="label">Descripción / Detalles (opcional)</label>
            <textarea className="input resize-none" rows={2} value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Banco, número de referencia, notas..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Deuda total (Q) *</label>
              <div className="relative">
                <CurrencyDollarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-8" type="number" min="0.01" step="0.01"
                  value={form.deuda_total}
                  onChange={e => setForm(p => ({ ...p, deuda_total: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="label">Número de cuotas *</label>
              <input className="input" type="number" min="1" step="1"
                value={form.num_cuotas}
                onChange={e => setForm(p => ({ ...p, num_cuotas: e.target.value }))}
                placeholder="Ej: 12" />
            </div>
          </div>

          {/* Cuota calculada */}
          {cuotaCalc && (
            <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-primary-600">Cuota mensual calculada</p>
                <p className="text-lg font-bold text-primary-700">{formatCurrency(cuotaCalc)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-primary-600">por cuota entre músicos</p>
                <p className="text-xs text-primary-500">(se divide al registrar)</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de inicio</label>
              <input className="input" type="date" value={form.fecha_inicio}
                onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fecha límite de pago *</label>
              <input className="input" type="date" value={form.fecha_limite}
                onChange={e => setForm(p => ({ ...p, fecha_limite: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Fecha máxima por cuota</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              <FloppyDiskIcon size={16} />
              {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Card de gasto ─────────────────────────────────────────────────────────────
function CardGasto({ gasto }) {
  const { registrarAbono, eliminarAbono, eliminarGasto, pagadoDe, pagadoPorMusico, abonosPorMusico, toggleExento, cuotaDeMusico } = useGastos()
  const { musicos } = useMusicos()
  const { esDirector, sesion } = useAuth()

  const [expandido, setExpandido]   = useState(false)
  const [editando, setEditando]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [musicoSel, setMusicoSel]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [form, setForm] = useState({
    monto:       '',
    fecha:       new Date().toISOString().slice(0, 10),
    descripcion: '',
    musico_id:   sesion?.id || '',
  })

  const numMusicos     = musicos.length || 1
  const exentos        = Array.isArray(gasto.exentos) ? gasto.exentos : []
  const pagadoTotal    = pagadoDe(gasto.id)
  const pendienteTotal = Math.max(0, gasto.deuda_total - pagadoTotal)
  const pct            = gasto.deuda_total > 0 ? Math.min(100, Math.round((pagadoTotal / gasto.deuda_total) * 100)) : 0
  const listo          = pendienteTotal === 0

  // Días restantes
  const hoy        = new Date()
  const limite     = gasto.fecha_limite ? new Date(gasto.fecha_limite) : null
  const diasRest   = limite ? Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24)) : null
  const vencido    = diasRest !== null && diasRest < 0

  const handleAbono = async (e) => {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) return
    if (!form.musico_id) return
    setLoading(true)
    await registrarAbono({
      gasto_id:    gasto.id,
      musico_id:   form.musico_id,
      monto:       parseFloat(form.monto),
      fecha:       form.fecha,
      descripcion: form.descripcion,
    })
    setLoading(false)
    setForm(p => ({ ...p, monto: '', descripcion: '' }))
  }

  return (
    <>
      <div className={`card border-2 transition-colors
        ${listo ? 'border-green-300 bg-green-50' : vencido ? 'border-red-300 bg-red-50' : 'border-transparent'}`}>

        {/* Cabecera */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">💳</span>
              <h3 className={`font-semibold truncate ${listo ? 'text-green-800' : vencido ? 'text-red-800' : 'text-gray-900'}`}>
                {gasto.nombre}
              </h3>
              {listo && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✓ Pagado</span>}
              {vencido && !listo && <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">⚠ Vencido</span>}
              {!listo && !vencido && diasRest !== null && diasRest <= 7 && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  ⏰ {diasRest}d restantes
                </span>
              )}
            </div>
            {gasto.descripcion && <p className="text-xs text-gray-400 mt-0.5 ml-7">{gasto.descripcion}</p>}
            <div className="flex items-center gap-3 mt-0.5 ml-7 flex-wrap">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CreditCardIcon size={11} /> {gasto.num_cuotas} cuotas · {formatCurrency(gasto.monto_cuota)}/cuota
              </span>
              {gasto.fecha_limite && (
                <span className={`text-xs flex items-center gap-1 ${vencido ? 'text-red-500' : 'text-gray-400'}`}>
                  <CalendarIcon size={11} /> Límite: {formatDate(gasto.fecha_limite)}
                </span>
              )}
              {(() => {
                const pagantes = Math.max(1, numMusicos - exentos.length)
                const cuotaP   = Math.round((gasto.monto_cuota / pagantes) * 100) / 100
                return (
                  <span className="text-xs text-primary-600 flex items-center gap-1">
                    <UsersThreeIcon size={11} /> {formatCurrency(cuotaP)}/músico · {pagantes} pagante{pagantes !== 1 ? 's' : ''}
                    {exentos.length > 0 && <span className="text-gray-400">({exentos.length} exento{exentos.length !== 1 ? 's' : ''})</span>}
                  </span>
                )
              })()}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {esDirector && (
              <>
                <button onClick={() => setEditando(true)} className="btn-icon btn-ghost text-gray-400 btn-sm">
                  <PencilSimpleIcon size={15} />
                </button>
                <button onClick={() => setConfirmDel(true)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500 btn-sm">
                  <TrashIcon size={15} />
                </button>
              </>
            )}
            <button onClick={() => setExpandido(v => !v)} className="btn-icon btn-ghost text-gray-500 btn-sm">
              {expandido ? <CaretUpIcon size={16} /> : <CaretDownIcon size={16} />}
            </button>
          </div>
        </div>

        {/* Resumen montos */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-xl bg-gray-50 p-2">
            <p className="text-sm font-bold text-gray-800">{formatCurrency(gasto.deuda_total)}</p>
            <p className="text-xs text-gray-400">Total deuda</p>
          </div>
          <div className="rounded-xl bg-green-50 p-2">
            <p className="text-sm font-bold text-green-700">{formatCurrency(pagadoTotal)}</p>
            <p className="text-xs text-green-500">Pagado</p>
          </div>
          <div className="rounded-xl bg-red-50 p-2">
            <p className="text-sm font-bold text-red-600">{formatCurrency(pendienteTotal)}</p>
            <p className="text-xs text-red-400">Pendiente</p>
          </div>
        </div>

        {/* Barra progreso global */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progreso general</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${listo ? 'bg-green-500' : 'bg-gradient-to-r from-primary-500 to-violet-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Detalle expandido */}
        {expandido && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">

            {/* Estado por músico */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Estado por músico</p>
              <div className="space-y-2">
                {musicos.map(m => {
                  const esExento  = exentos.includes(m.id)
                  const cuotaM    = cuotaDeMusico(gasto, m.id, numMusicos)
                  const pagadoM   = pagadoPorMusico(gasto.id, m.id)
                  const pendM     = Math.max(0, cuotaM - pagadoM)
                  const pctM      = cuotaM > 0 ? Math.min(100, Math.round((pagadoM / cuotaM) * 100)) : 100
                  const listoM    = esExento || pendM === 0
                  return (
                    <div key={m.id}
                      className={`rounded-xl p-2 transition-colors ${esExento ? 'bg-gray-50 opacity-60' : musicoSel === m.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => !esExento && setMusicoSel(musicoSel === m.id ? null : m.id)}>
                          {m.foto_url ? (
                            <img src={m.foto_url} alt={m.nombre} className="h-7 w-7 rounded-full object-cover border flex-shrink-0" onError={e => e.target.style.display='none'} />
                          ) : (
                            <div className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0
                              ${esExento ? 'bg-gray-200 text-gray-400' : 'bg-primary-100 text-primary-700'}`}>
                              {m.nombre?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-medium ${esExento ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{m.nombre}</p>
                              {esExento && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Exento</span>}
                            </div>
                            <p className="text-xs text-gray-400">{m.instrumento}{!esExento && ` · Cuota: ${formatCurrency(cuotaM)}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!esExento && (
                            <span className={`text-xs font-semibold ${listoM ? 'text-green-600' : 'text-red-500'}`}>
                              {listoM ? '✓ Al día' : `${formatCurrency(pendM)} pend.`}
                            </span>
                          )}
                          {/* Toggle exento — solo director */}
                          {esDirector && (
                            <button
                              onClick={e => { e.stopPropagation(); toggleExento(gasto.id, m.id) }}
                              title={esExento ? 'Quitar exención' : 'Marcar como exento'}
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all
                                ${esExento
                                  ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'
                                  : 'border-gray-200 bg-white text-gray-400 hover:border-amber-300 hover:text-amber-600'}`}>
                              {esExento ? 'Reactivar' : 'Exentar'}
                            </button>
                          )}
                        </div>
                      </div>

                      {!esExento && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${listoM ? 'bg-green-500' : 'bg-primary-500'}`}
                            style={{ width: `${pctM}%` }} />
                        </div>
                      )}

                      {/* Historial de abonos */}
                      {!esExento && musicoSel === m.id && (
                        <div className="mt-2 space-y-1">
                          {abonosPorMusico(gasto.id, m.id).length === 0
                            ? <p className="text-xs text-gray-400 pl-1">Sin abonos</p>
                            : abonosPorMusico(gasto.id, m.id)
                                .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
                                .map(a => (
                                  <div key={a.id} className="flex items-center justify-between pl-1 py-0.5">
                                    <div>
                                      <span className="text-xs font-medium text-gray-700">{formatCurrency(a.monto)}</span>
                                      <span className="text-xs text-gray-400 ml-2">{formatDate(a.fecha || a.creado_en)}</span>
                                      {a.descripcion && <span className="text-xs text-gray-400 ml-1">· {a.descripcion}</span>}
                                    </div>
                                    {esDirector && (
                                      <button onClick={e => { e.stopPropagation(); eliminarAbono(a.id) }}
                                        className="btn-icon btn-ghost text-gray-300 hover:text-red-500 btn-sm">
                                        <TrashIcon size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Formulario abono — director registra por cualquier músico */}
            {esDirector && !listo && (
              <form onSubmit={handleAbono} className="rounded-xl bg-primary-50 border border-primary-100 p-4 space-y-3">
                <p className="text-sm font-semibold text-primary-700">Registrar abono de músico</p>
                <div>
                  <label className="label text-xs">Músico</label>
                  <select className="input" value={form.musico_id}
                    onChange={e => setForm(p => ({ ...p, musico_id: e.target.value }))}>
                    <option value="">Seleccionar músico...</option>
                    {musicos.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre} — {m.instrumento}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Monto (Q)</label>
                    <input className="input" type="number" min="0.01" step="0.01"
                      value={form.monto}
                      onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                      placeholder={formatCurrency(cuotaDeMusico(gasto, form.musico_id, numMusicos))} />
                    <p className="text-xs text-gray-400 mt-0.5">Cuota: {formatCurrency(cuotaDeMusico(gasto, form.musico_id, numMusicos))}</p>
                  </div>
                  <div>
                    <label className="label text-xs">Fecha</label>
                    <input className="input" type="date" value={form.fecha}
                      onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="label text-xs">Descripción (opcional)</label>
                    <input className="input" value={form.descripcion}
                      onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Cuota enero..." />
                  </div>
                </div>
                <button type="submit" disabled={loading || !form.musico_id} className="btn-primary btn-sm w-full">
                  {loading ? 'Registrando...' : 'Registrar abono'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {editando && <ModalGasto gasto={gasto} onClose={() => setEditando(false)} />}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in">
            <h3 className="font-semibold text-gray-900 mb-2">¿Eliminar gasto?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Se eliminará <strong>{gasto.nombre}</strong> y todos sus abonos.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setConfirmDel(false)}>Cancelar</button>
              <button className="btn-danger flex-1" onClick={() => { eliminarGasto(gasto.id); setConfirmDel(false) }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Gastos() {
  const { gastos, totalDeuda, totalPagado, totalPendiente } = useGastos()
  const { esDirector } = useAuth()
  const [modal, setModal] = useState(false)

  const vencidos = gastos.filter(g => {
    if (!g.fecha_limite) return false
    return new Date(g.fecha_limite) < new Date() && (g.deuda_total - 0) > 0
  }).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gastos Fijos</h1>
          <p className="page-subtitle">{gastos.length} gasto{gastos.length !== 1 ? 's' : ''} registrado{gastos.length !== 1 ? 's' : ''}</p>
        </div>
        {esDirector && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <PlusIcon size={16} /> Nuevo gasto
          </button>
        )}
      </div>

      {/* Resumen global */}
      {gastos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totalDeuda)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total deuda</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalPagado)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total pagado</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalPendiente)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Pendiente</p>
          </div>
        </div>
      )}

      {/* Alertas */}
      {vencidos > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
          <WarningCircleIcon size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            {vencidos} gasto{vencidos !== 1 ? 's' : ''} con fecha límite vencida.
          </p>
        </div>
      )}
      {totalPendiente > 0 && vencidos === 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <WarningCircleIcon size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Hay <strong>{formatCurrency(totalPendiente)}</strong> pendientes de pago.
          </p>
        </div>
      )}

      {/* Lista */}
      {gastos.length === 0 ? (
        <div className="card text-center py-16">
          <CreditCardIcon size={48} className="mx-auto mb-3 text-primary-300" />
          <p className="text-gray-500">No hay gastos fijos registrados</p>
          {esDirector && (
            <button className="btn-primary mt-4" onClick={() => setModal(true)}>
              <PlusIcon size={16} /> Crear el primero
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {gastos.map(g => <CardGasto key={g.id} gasto={g} />)}
        </div>
      )}

      {modal && <ModalGasto onClose={() => setModal(false)} />}
    </div>
  )
}
