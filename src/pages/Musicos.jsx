import { useState } from 'react'
import { PlusIcon, PencilSimpleIcon, TrashIcon, XIcon, FloppyDiskIcon, MusicNotesIcon, EyeIcon, EyeSlashIcon, CreditCardIcon } from '@phosphor-icons/react'
import { useMusicos, INSTRUMENTOS } from '../contexts/MusicosContext'
import { useAuth } from '../contexts/AuthContext'
import { useGastos } from '../contexts/GastosContext'
import { formatCurrency, formatDate } from '../utils/formatters'

const ROLES_OPCIONES = [
  { value: 'musico',   label: 'Músico' },
  { value: 'director', label: 'Director' },
]

function ModalMusico({ musico = null, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre:      musico?.nombre      || '',
    email:       musico?.email       || '',
    instrumento: musico?.instrumento || '',
    rol:         musico?.rol         || 'musico',
    foto_url:    musico?.foto_url    || '',
    password:    '',
  })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const esEdicion = !!musico

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.instrumento) {
      setError('Nombre, email e instrumento son requeridos')
      return
    }
    if (!esEdicion && !form.password) {
      setError('La contraseña es requerida para un músico nuevo')
      return
    }
    setLoading(true)
    const data = {
      nombre:      form.nombre,
      email:       form.email,
      instrumento: form.instrumento,
      rol:         form.rol,
      foto_url:    form.foto_url,
    }
    if (form.password) data.password = form.password
    const result = await onSave(data)
    setLoading(false)
    if (result?.ok === false) { setError(result.error); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar Músico' : 'Agregar Músico'}
          </h2>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="label">URL de foto (opcional)</label>
                          <input className="input" value={form.foto_url} onChange={e => setForm(p => ({...p, foto_url: e.target.value}))} placeholder="https://...jpg/png" />
                          {form.foto_url && (
                            <div className="mt-2 flex items-center gap-2">
                              <img src={form.foto_url} alt="Foto" className="h-16 w-16 rounded-full object-cover border" onError={e => e.target.style.display='none'} />
                              <span className="text-xs text-gray-400">Vista previa</span>
                            </div>
                          )}
                        </div>
            <div className="col-span-2">
              <label className="label">Nombre completo *</label>
              <input className="input" value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} placeholder="Juan Pérez" />
            </div>
            <div className="col-span-2">
              <label className="label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="juan@banda.com" />
            </div>
            <div>
              <label className="label">Instrumento *</label>
              <select className="input" value={form.instrumento} onChange={e => setForm(p => ({...p, instrumento: e.target.value}))}>
                <option value="">Seleccionar...</option>
                {INSTRUMENTOS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.rol} onChange={e => setForm(p => ({...p, rol: e.target.value}))}>
                {ROLES_OPCIONES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">{esEdicion ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeSlashIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              <FloppyDiskIcon size={16} />
              {loading ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Agregar músico')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Fila de un gasto fijo en ModalDeuda
function FilaGastoFijo({ gasto, musicoId, numMusicos, esDirector }) {
  const { pagadoPorMusico, abonosPorMusico, registrarAbono, eliminarAbono, cuotaDeMusico } = useGastos()
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState({ monto: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '' })
  const [loading, setLoading] = useState(false)

  const cuotaMusico = cuotaDeMusico(gasto, musicoId, numMusicos)
  const pagadoM     = pagadoPorMusico(gasto.id, musicoId)
  const pendM       = Math.max(0, cuotaMusico - pagadoM)
  const pctM        = cuotaMusico > 0 ? Math.min(100, Math.round((pagadoM / cuotaMusico) * 100)) : 100
  const listoM      = pendM === 0
  const hoy         = new Date()
  const limite      = gasto.fecha_limite ? new Date(gasto.fecha_limite) : null
  const diasRest    = limite ? Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24)) : null
  const vencido     = diasRest !== null && diasRest < 0
  const abonos      = abonosPorMusico(gasto.id, musicoId)

  const handleAbono = async (e) => {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) return
    setLoading(true)
    await registrarAbono({ gasto_id: gasto.id, musico_id: musicoId, monto: parseFloat(form.monto), fecha: form.fecha, descripcion: form.descripcion })
    setLoading(false)
    setForm(p => ({ ...p, monto: '', descripcion: '' }))
  }

  return (
    <div className={`rounded-xl border p-3 ${listoM ? 'border-green-200 bg-green-50' : vencido ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setAbierto(v => !v)}>
        <div className="flex items-center gap-2 min-w-0">
          <CreditCardIcon size={13} className={listoM ? 'text-green-500' : vencido ? 'text-red-500' : 'text-gray-400'} />
          <span className="text-sm font-medium text-gray-800 truncate">{gasto.nombre}</span>
          {vencido && !listoM && <span className="text-xs text-red-600 font-semibold">⚠ Vencido</span>}
          {!listoM && !vencido && diasRest !== null && diasRest <= 7 && (
            <span className="text-xs text-amber-600 font-semibold">⏰ {diasRest}d</span>
          )}
        </div>
        <span className={`text-sm font-bold ml-2 flex-shrink-0 ${listoM ? 'text-green-600' : 'text-red-600'}`}>
          {listoM ? '✓ Al día' : formatCurrency(pendM)}
        </span>
      </div>

      <div className="mt-2">
        <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-200">
          <div className={`h-full rounded-full ${listoM ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pctM}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>{formatCurrency(pagadoM)} pagado</span>
          <span>Cuota: {formatCurrency(cuotaMusico)}</span>
        </div>
      </div>

      {abierto && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 animate-fade-in">
          {abonos.length > 0 ? (
            <div className="space-y-1">
              {abonos.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)).map(a => (
                <div key={a.id} className="flex items-center justify-between py-0.5">
                  <div>
                    <span className="text-xs font-medium text-gray-700">{formatCurrency(a.monto)}</span>
                    <span className="text-xs text-gray-400 ml-2">{formatDate(a.fecha || a.creado_en)}</span>
                    {a.descripcion && <span className="text-xs text-gray-400 ml-1">· {a.descripcion}</span>}
                  </div>
                  {esDirector && (
                    <button onClick={() => eliminarAbono(a.id)} className="btn-icon btn-ghost text-gray-300 hover:text-red-500 btn-sm">
                      <TrashIcon size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin abonos</p>
          )}

          {esDirector && !listoM && (
            <form onSubmit={handleAbono} className="rounded-lg bg-primary-50 border border-primary-100 p-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Monto (Q)</label>
                  <input className="input" type="number" min="0.01" step="0.01"
                    value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                    placeholder={formatCurrency(pendM)} />
                </div>
                <div>
                  <label className="label text-xs">Fecha</label>
                  <input className="input" type="date" value={form.fecha}
                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <input className="input" value={form.descripcion}
                    onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Descripción opcional..." />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary btn-sm w-full">
                {loading ? 'Registrando...' : 'Registrar abono'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// Botón que registra la cuota del músico en todos los gastos fijos que tenga pendiente
function SincronizarGastos({ gastos, musicoId, numMusicos }) {
  const { pagadoPorMusico, registrarAbono, cuotaDeMusico } = useGastos()
  const [loading, setLoading] = useState(false)
  const [hecho, setHecho] = useState(false)

  const gastosPendientes = gastos.filter(g => {
    const cuotaM  = cuotaDeMusico(g, musicoId, numMusicos)
    const pagadoM = pagadoPorMusico(g.id, musicoId)
    return cuotaM - pagadoM > 0.001
  })

  const handleSync = async () => {
    if (gastosPendientes.length === 0) return
    setLoading(true)
    const hoy = new Date().toISOString().slice(0, 10)
    for (const g of gastosPendientes) {
      const cuotaM  = cuotaDeMusico(g, musicoId, numMusicos)
      const pagadoM = pagadoPorMusico(g.id, musicoId)
      const pendM   = Math.round((cuotaM - pagadoM) * 100) / 100
      if (pendM > 0) {
        await registrarAbono({
          gasto_id:    g.id,
          musico_id:   musicoId,
          monto:       pendM,
          fecha:       hoy,
          descripcion: `Cuota sincronizada — ${g.nombre}`,
        })
      }
    }
    setLoading(false)
    setHecho(true)
    setTimeout(() => setHecho(false), 3000)
  }

  if (gastosPendientes.length === 0) return null

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-800">Pagos pendientes en {gastosPendientes.length} gasto{gastosPendientes.length !== 1 ? 's' : ''}</p>
        <p className="text-xs text-amber-600">Registra la cuota completa en cada gasto pendiente</p>
      </div>
      <button
        onClick={handleSync}
        disabled={loading || hecho}
        className={`flex-shrink-0 btn-sm font-semibold transition-all ${hecho ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'} rounded-lg px-3 py-1.5`}
      >
        {loading ? 'Sincronizando...' : hecho ? '✓ Listo' : 'Sincronizar pagos'}
      </button>
    </div>
  )
}

function ModalDeuda({ musico, onClose }) {
  const { gastos, pagadoPorMusico, cuotaDeMusico } = useGastos()
  const { musicos } = useMusicos()
  const { esDirector } = useAuth()
  const numMusicos = musicos.length || 1

  const pendienteGastos = gastos.reduce((sum, g) => {
    const cuotaM  = cuotaDeMusico(g, musico.id, numMusicos)
    const pagadoM = pagadoPorMusico(g.id, musico.id)
    return sum + Math.max(0, cuotaM - pagadoM)
  }, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gastos fijos — {musico.nombre}</h2>
            <p className="text-sm text-gray-400">{musico.instrumento}</p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {gastos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay gastos fijos registrados.</p>
          ) : (
            <>
              {esDirector && pendienteGastos > 0 && (
                <SincronizarGastos gastos={gastos} musicoId={musico.id} numMusicos={numMusicos} />
              )}
              {gastos.map(g => (
                <FilaGastoFijo key={g.id} gasto={g} musicoId={musico.id} numMusicos={numMusicos} esDirector={esDirector} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Musicos() {
  const { musicos, agregarMusico, editarMusico, eliminarMusico } = useMusicos()
  const { gastos, pagadoPorMusico: pagadoGastoMusico, cuotaDeMusico } = useGastos()
  const { esDirector } = useAuth()

  const [modalMusico, setModalMusico] = useState(null)  // null | 'nuevo' | {musico}
  const [modalDeuda, setModalDeuda]   = useState(null)  // null | {musico}
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSaveMusico = async (data) => {
    if (modalMusico === 'nuevo') return agregarMusico(data)
    return editarMusico(modalMusico.id, data).then(() => ({ ok: true }))
  }

  const handleDelete = async (musico) => {
    await eliminarMusico(musico.id)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Músicos</h1>
          <p className="page-subtitle">{musicos.length} miembro{musicos.length !== 1 ? 's' : ''} activo{musicos.length !== 1 ? 's' : ''}</p>
        </div>
        {esDirector && (
          <button className="btn-primary" onClick={() => setModalMusico('nuevo')}>
            <PlusIcon size={16} /> Agregar músico
          </button>
        )}
      </div>

      {/* Grid de músicos */}
      {musicos.length === 0 ? (
        <div className="card text-center py-16">
          <MusicNotesIcon size={48} className="mx-auto mb-3 text-primary-300" />
          <p className="text-gray-500">No hay músicos registrados</p>
          {esDirector && (
            <button className="btn-primary mt-4" onClick={() => setModalMusico('nuevo')}>
              <PlusIcon size={16} /> Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {musicos.map(m => {
            const numMusicos = musicos.length || 1

            // Gastos fijos: cuotas pendientes de este músico (respeta exentos)
            const gastosConPend = gastos.filter(g => {
              const cuotaM  = cuotaDeMusico(g, m.id, numMusicos)
              const pagadoM = pagadoGastoMusico(g.id, m.id)
              return cuotaM - pagadoM > 0.001
            })
            const pendGastos = gastos.reduce((sum, g) => {
              const cuotaM  = cuotaDeMusico(g, m.id, numMusicos)
              const pagadoM = pagadoGastoMusico(g.id, m.id)
              return sum + Math.max(0, cuotaM - pagadoM)
            }, 0)

            return (
              <div key={m.id} className="card hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {m.foto_url ? (
                      <img src={m.foto_url} alt={m.nombre} className="h-11 w-11 rounded-full object-cover border shadow" onError={e => e.target.style.display='none'} />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow">
                        {m.nombre?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{m.nombre}</p>
                      <p className="text-sm text-gray-400">{m.instrumento}</p>
                    </div>
                  </div>
                  <span className={`badge ${m.rol === 'director' ? 'badge-purple' : 'badge-blue'}`}>
                    {m.rol === 'director' ? '🎤 Director' : '🎵 Músico'}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-3">{m.email}</p>

                {/* Gastos fijos pendientes */}
                {gastos.length > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 flex items-center gap-1">
                        <CreditCardIcon size={11} /> Gastos fijos
                      </span>
                      <span className={pendGastos > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                        {pendGastos > 0 ? `${formatCurrency(pendGastos)} pendiente` : 'Al día ✓'}
                      </span>
                    </div>
                    {gastosConPend.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {gastosConPend.map(g => (
                          <span key={g.id} className="text-xs bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5 truncate max-w-[120px]">
                            {g.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setModalDeuda(m)}
                    className="btn-secondary btn-sm flex-1"
                  >
                    <CreditCardIcon size={14} /> Gastos fijos
                  </button>
                  {esDirector && (
                    <>
                      <button onClick={() => setModalMusico(m)} className="btn-ghost btn-sm btn-icon">
                        <PencilSimpleIcon size={15} />
                      </button>
                      {m.id !== 'usr-director' && (
                        <button onClick={() => setConfirmDelete(m)} className="btn-ghost btn-sm btn-icon text-red-400 hover:text-red-600">
                          <TrashIcon size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo/editar músico */}
      {modalMusico && (
        <ModalMusico
          musico={modalMusico === 'nuevo' ? null : modalMusico}
          onClose={() => setModalMusico(null)}
          onSave={handleSaveMusico}
        />
      )}

      {/* Modal detalle cuota */}
      {modalDeuda && (
        <ModalDeuda
          musico={modalDeuda}
          onClose={() => setModalDeuda(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in">
            <h3 className="font-semibold text-gray-900 mb-2">¿Eliminar músico?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Se eliminará a <strong>{confirmDelete.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-danger flex-1" onClick={() => handleDelete(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
