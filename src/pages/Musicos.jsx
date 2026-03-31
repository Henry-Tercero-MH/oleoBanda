import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Save, Music2, DollarSign, Eye, EyeOff } from 'lucide-react'
import { useMusicos, INSTRUMENTOS } from '../contexts/MusicosContext'
import { useAuth } from '../contexts/AuthContext'
import { useFinanzas } from '../contexts/FinanzasContext'
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
    deuda_total: musico?.deuda_total || '',
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
      deuda_total: parseFloat(form.deuda_total) || 0,
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
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><X size={18} /></button>
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
              <label className="label">Deuda total instrumento (Q)</label>
              <div className="relative">
                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-8"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.deuda_total}
                  onChange={e => setForm(p => ({...p, deuda_total: e.target.value}))}
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Monto total a crédito del instrumento</p>
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
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              <Save size={16} />
              {loading ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Agregar músico')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalDeuda({ musico, onClose }) {
  const { pagosDe, registrarPagoCuota, eliminarPagoCuota, pagadoPorMusico } = useFinanzas()
  const { esDirector, sesion } = useAuth()
  const pagos = pagosDe(musico.id)
  const pagado = pagadoPorMusico(musico.id)
  const pendiente = Math.max(0, (musico.deuda_total || 0) - pagado)

  const [form, setForm] = useState({ monto: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '' })
  const [loading, setLoading] = useState(false)

  const handlePago = async (e) => {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) return
    setLoading(true)
    await registrarPagoCuota({
      musico_id:   musico.id,
      monto:       parseFloat(form.monto),
      fecha:       form.fecha,
      descripcion: form.descripcion,
      registrado_por: sesion?.id,
    })
    setLoading(false)
    setForm({ monto: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '' })
  }

  const pct = musico.deuda_total > 0 ? Math.round((pagado / musico.deuda_total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cuota — {musico.nombre}</h2>
            <p className="text-sm text-gray-400">{musico.instrumento}</p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-bold text-gray-800">{formatCurrency(musico.deuda_total || 0)}</p>
              <p className="text-xs text-gray-400">Total deuda</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-lg font-bold text-green-700">{formatCurrency(pagado)}</p>
              <p className="text-xs text-green-600">Pagado</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-lg font-bold text-red-600">{formatCurrency(pendiente)}</p>
              <p className="text-xs text-red-500">Pendiente</p>
            </div>
          </div>

          {/* Barra progreso */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso de pago</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all"
                style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Formulario de abono (solo director) */}
          {esDirector && pendiente > 0 && (
            <form onSubmit={handlePago} className="rounded-xl border border-primary-100 bg-primary-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-primary-700">Registrar abono</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Monto (Q) *</label>
                  <input className="input" type="number" min="0.01" step="0.01" max={pendiente}
                    value={form.monto} onChange={e => setForm(p => ({...p, monto: e.target.value}))} placeholder="0.00" />
                </div>
                <div>
                  <label className="label text-xs">Fecha</label>
                  <input className="input" type="date" value={form.fecha}
                    onChange={e => setForm(p => ({...p, fecha: e.target.value}))} />
                </div>
                <div className="col-span-2">
                  <label className="label text-xs">Descripción (opcional)</label>
                  <input className="input" value={form.descripcion}
                    onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} placeholder="Abono mensual..." />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full btn-sm">
                {loading ? 'Registrando...' : 'Registrar abono'}
              </button>
            </form>
          )}

          {/* Historial de pagos */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Historial de abonos ({pagos.length})</p>
            {pagos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin abonos registrados</p>
            ) : (
              <div className="space-y-2">
                {pagos.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{formatCurrency(p.monto)}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.fecha || p.creado_en)} {p.descripcion ? `· ${p.descripcion}` : ''}</p>
                    </div>
                    {esDirector && (
                      <button onClick={() => eliminarPagoCuota(p.id)}
                        className="btn-icon btn-ghost text-gray-400 hover:text-red-500 btn-sm">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Musicos() {
  const { musicos, agregarMusico, editarMusico, eliminarMusico } = useMusicos()
  const { pagadoPorMusico } = useFinanzas()
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
            <Plus size={16} /> Agregar músico
          </button>
        )}
      </div>

      {/* Grid de músicos */}
      {musicos.length === 0 ? (
        <div className="card text-center py-16">
          <Music2 size={48} className="mx-auto mb-3 text-primary-300" />
          <p className="text-gray-500">No hay músicos registrados</p>
          {esDirector && (
            <button className="btn-primary mt-4" onClick={() => setModalMusico('nuevo')}>
              <Plus size={16} /> Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {musicos.map(m => {
            const pagado   = pagadoPorMusico(m.id)
            const pendiente = Math.max(0, (m.deuda_total || 0) - pagado)
            const pct = m.deuda_total > 0 ? Math.round((pagado / m.deuda_total) * 100) : 100

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

                {/* Deuda */}
                {m.deuda_total > 0 ? (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Cuota instrumento</span>
                      <span className={pendiente > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                        {pendiente > 0 ? `${formatCurrency(pendiente)} pendiente` : '¡Pagado! ✓'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>{pct}% pagado</span>
                      <span>Total: {formatCurrency(m.deuda_total)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-3">Sin deuda de instrumento</p>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setModalDeuda(m)}
                    className="btn-secondary btn-sm flex-1"
                  >
                    <DollarSign size={14} /> Cuota
                  </button>
                  {esDirector && (
                    <>
                      <button onClick={() => setModalMusico(m)} className="btn-ghost btn-sm btn-icon">
                        <Edit2 size={15} />
                      </button>
                      {m.id !== 'usr-director' && (
                        <button onClick={() => setConfirmDelete(m)} className="btn-ghost btn-sm btn-icon text-red-400 hover:text-red-600">
                          <Trash2 size={15} />
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
