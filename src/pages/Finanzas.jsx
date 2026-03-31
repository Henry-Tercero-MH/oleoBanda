import { useState } from 'react'
import { PlusIcon, TrashIcon, XIcon, CurrencyDollarIcon, TrendUpIcon, TrendDownIcon, InfoIcon, PrinterIcon } from '@phosphor-icons/react'
import { useFinanzas, TIPOS_INGRESO } from '../contexts/FinanzasContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate } from '../utils/formatters'

// ── Generador de recibo PDF (via window.print) ────────────────────────────
function generarRecibo(pago, musico, pagadoTotal, deudaTotal) {
  const pendiente = Math.max(0, deudaTotal - pagadoTotal)
  const num = pago.id.replace('pago-', '').toUpperCase()
  const fecha = new Date(pago.fecha || pago.creado_en)
  const fechaStr = fecha.toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Recibo ${num}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: #fff; color: #111; }
    .page { width: 80mm; max-width: 80mm; margin: 0 auto; padding: 8mm 6mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #999; margin: 6px 0; }
    .divider-solid { border-top: 2px solid #111; margin: 6px 0; }
    .logo { font-size: 15px; font-weight: 900; letter-spacing: 2px; }
    .sub { font-size: 9px; color: #555; margin-top: 2px; }
    .recibo-title { font-size: 11px; font-weight: bold; letter-spacing: 1px; margin: 8px 0 2px; text-transform: uppercase; }
    .num { font-size: 9px; color: #555; }
    .row { display: flex; justify-content: space-between; font-size: 10px; margin: 3px 0; }
    .label { color: #555; }
    .value { font-weight: bold; text-align: right; }
    .monto-grande { font-size: 20px; font-weight: 900; text-align: center; margin: 10px 0 4px; }
    .moneda { font-size: 11px; font-weight: normal; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: bold; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .firma { height: 28px; border-bottom: 1px solid #999; margin: 4px 0 2px; }
    .footer-text { font-size: 8px; color: #888; text-align: center; margin-top: 6px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="center">
    <div class="logo">ÓLEO DE ALEGRÍA</div>
    <div class="sub">Salmos 45:7 — Banda Musical Cristiana</div>
  </div>
  <div class="divider-solid"></div>
  <div class="center">
    <div class="recibo-title">Recibo de Pago</div>
    <div class="num"># ${num}</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="label">Fecha:</span><span class="value">${fechaStr}</span></div>
  <div class="row"><span class="label">Músico:</span><span class="value">${musico.nombre}</span></div>
  <div class="row"><span class="label">Instrumento:</span><span class="value">${musico.instrumento || '—'}</span></div>
  ${pago.descripcion ? `<div class="row"><span class="label">Concepto:</span><span class="value">${pago.descripcion}</span></div>` : ''}
  <div class="divider"></div>
  <div class="center">
    <div class="monto-grande"><span class="moneda">Q</span> ${Number(pago.monto).toFixed(2)}</div>
    <div class="sub">Monto recibido</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="label">Deuda total instrumento:</span><span class="value">Q ${Number(deudaTotal).toFixed(2)}</span></div>
  <div class="row"><span class="label">Total abonado:</span><span class="value">Q ${Number(pagadoTotal).toFixed(2)}</span></div>
  <div class="row bold"><span class="label">Saldo pendiente:</span>
    <span class="value ${pendiente > 0 ? '' : ''}">Q ${Number(pendiente).toFixed(2)}</span>
  </div>
  <div class="center" style="margin-top:6px">
    ${pendiente === 0
      ? '<span class="badge badge-green">✓ DEUDA COMPLETAMENTE PAGADA</span>'
      : '<span class="badge badge-red">Pendiente de pago</span>'}
  </div>
  <div class="divider"></div>
  <div class="sub" style="margin-bottom:2px">Firma del director:</div>
  <div class="firma"></div>
  <div class="footer-text">Óleo de Alegría · Recibo generado el ${new Date().toLocaleDateString('es-GT')}</div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=400,height=600')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

const TABS = ['Ingresos', 'Cuotas', 'Historial']

// ── Modal agregar ingreso ──────────────────────────────────────────────────────
function ModalIngreso({ onClose }) {
  const { registrarIngreso, tiposIngreso } = useFinanzas()
  const { musicos } = useMusicos()
  const { sesion } = useAuth()

  const [form, setForm] = useState({
    tipo:        'ofrenda_lunes',
    monto:       '',
    fecha:       new Date().toISOString().slice(0, 10),
    descripcion: '',
    musicos_presentes: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Para ofrenda_lunes: monto auto = Q10 × presentes
  const esOfrendaLunes = form.tipo === 'ofrenda_lunes'
  const montoCalculado = esOfrendaLunes
    ? form.musicos_presentes.length * 10
    : parseFloat(form.monto) || 0

  const toggleMusico = (id) => {
    setForm(p => ({
      ...p,
      musicos_presentes: p.musicos_presentes.includes(id)
        ? p.musicos_presentes.filter(m => m !== id)
        : [...p.musicos_presentes, id],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const monto = esOfrendaLunes ? montoCalculado : parseFloat(form.monto)
    if (!monto || monto <= 0) { setError('Ingresa un monto válido'); return }
    setLoading(true)
    await registrarIngreso({
      tipo:               form.tipo,
      monto,
      fecha:              form.fecha,
      descripcion:        esOfrendaLunes
        ? `Ofrenda lunes — ${form.musicos_presentes.length} músicos presentes`
        : form.descripcion,
      musicos_presentes:  form.musicos_presentes,
      registrado_por:     sesion?.id,
    })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Registrar Ingreso</h2>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="label">Tipo de ingreso *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(tiposIngreso).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, tipo: key, musicos_presentes: [] }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all
                    ${form.tipo === key
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ofrenda lunes: seleccionar músicos */}
          {esOfrendaLunes ? (
            <div>
              <label className="label">Músicos presentes (Q10 c/u)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2">
                {musicos.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.musicos_presentes.includes(m.id)}
                      onChange={() => toggleMusico(m.id)}
                      className="w-4 h-4 accent-primary-600"
                    />
                    <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                      {m.nombre?.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-700">{m.nombre} — {m.instrumento}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 rounded-lg bg-primary-50 p-3 flex items-center justify-between">
                <span className="text-sm text-primary-700">
                  {form.musicos_presentes.length} presentes
                </span>
                <span className="font-bold text-primary-700">
                  Total: {formatCurrency(montoCalculado)}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="label">Monto (Q) *</label>
                <div className="relative">
                  <CurrencyDollarIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-8" type="number" min="0.01" step="0.01"
                    value={form.monto} onChange={e => setForm(p => ({...p, monto: e.target.value}))}
                    placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="label">Descripción</label>
                <input className="input" value={form.descripcion}
                  onChange={e => setForm(p => ({...p, descripcion: e.target.value}))}
                  placeholder="Describe el ingreso..." />
              </div>
            </>
          )}

          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" value={form.fecha}
              onChange={e => setForm(p => ({...p, fecha: e.target.value}))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Registrando...' : 'Registrar ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tab Ingresos ────────────────────────────────────────────────────────────
function TabIngresos({ onNuevo }) {
  const { ingresos, eliminarIngreso, totalIngresos, tiposIngreso } = useFinanzas()
  const { esDirector } = useAuth()

  const agrupados = ingresos.reduce((acc, i) => {
    const tipo = i.tipo || 'otro'
    if (!acc[tipo]) acc[tipo] = { total: 0, items: [] }
    acc[tipo].total += i.monto || 0
    acc[tipo].items.push(i)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="card-gradient-green rounded-xl p-4 flex items-center gap-3 flex-1 mr-4">
          <TrendUpIcon size={20} className="text-green-600" />
          <div>
            <p className="text-xs text-green-600">Total recaudado</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalIngresos)}</p>
          </div>
        </div>
        {esDirector && (
          <button className="btn-primary" onClick={onNuevo}>
            <PlusIcon size={16} /> Registrar ingreso
          </button>
        )}
      </div>

      {/* Por tipo */}
      {Object.entries(agrupados).map(([tipo, grupo]) => {
        const info = tiposIngreso[tipo] || { label: tipo, emoji: '💰' }
        return (
          <div key={tipo} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{info.emoji}</span>
                <span className="font-semibold text-gray-800">{info.label}</span>
                <span className="badge badge-gray">{grupo.items.length}</span>
              </div>
              <span className="font-bold text-green-700">{formatCurrency(grupo.total)}</span>
            </div>
            <div className="space-y-2">
              {grupo.items.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)).map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-t border-gray-50">
                  <div>
                    <p className="text-sm text-gray-700">{item.descripcion || info.label}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.fecha || item.creado_en)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-700">{formatCurrency(item.monto)}</span>
                    {esDirector && (
                      <button onClick={() => eliminarIngreso(item.id)}
                        className="btn-icon btn-ghost text-gray-300 hover:text-red-500 btn-sm">
                        <TrashIcon size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {ingresos.length === 0 && (
        <div className="card text-center py-12">
          <CurrencyDollarIcon size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">Sin ingresos registrados</p>
          {esDirector && (
            <button className="btn-primary mt-4" onClick={onNuevo}>
              <PlusIcon size={16} /> Registrar el primero
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab Cuotas ─────────────────────────────────────────────────────────────
function TabCuotas() {
  const { musicos } = useMusicos()
  const { pagadoPorMusico, registrarPagoCuota, eliminarPagoCuota, pagosDe } = useFinanzas()
  const { esDirector, sesion } = useAuth()

  const [expandido, setExpandido] = useState(null)
  const [formPago, setFormPago] = useState({ monto: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '' })

  const handleAbono = async (musicoId, pendiente) => {
    if (!formPago.monto || parseFloat(formPago.monto) <= 0) return
    await registrarPagoCuota({
      musico_id:    musicoId,
      monto:        Math.min(parseFloat(formPago.monto), pendiente),
      fecha:        formPago.fecha,
      descripcion:  formPago.descripcion,
      registrado_por: sesion?.id,
    })
    setFormPago({ monto: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '' })
  }

  return (
    <div className="space-y-3">
      {musicos.map(m => {
        const pagado    = pagadoPorMusico(m.id)
        const pendiente = Math.max(0, (m.deuda_total || 0) - pagado)
        const pct       = m.deuda_total > 0 ? Math.round((pagado / m.deuda_total) * 100) : 100
        const pagos     = pagosDe(m.id)
        const abierto   = expandido === m.id

        return (
          <div key={m.id} className="card">
            {/* Header */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setExpandido(abierto ? null : m.id)}
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold shadow">
                {m.nombre?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{m.nombre}</p>
                <p className="text-xs text-gray-400">{m.instrumento}</p>
              </div>
              <div className="text-right">
                {m.deuda_total > 0 ? (
                  <>
                    <p className={`text-sm font-bold ${pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {pendiente > 0 ? formatCurrency(pendiente) : '¡Pagado!'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {pendiente > 0 ? 'pendiente' : '✓ completado'}
                    </p>
                  </>
                ) : (
                  <span className="badge badge-gray">Sin deuda</span>
                )}
              </div>
            </div>

            {/* Barra */}
            {m.deuda_total > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
                    style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>{pct}% pagado ({formatCurrency(pagado)})</span>
                  <span>Total: {formatCurrency(m.deuda_total)}</span>
                </div>
              </div>
            )}

            {/* Detalle expandido */}
            {abierto && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 animate-fade-in">
                {/* Formulario abono (solo director) */}
                {esDirector && pendiente > 0 && (
                  <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 space-y-3">
                    <p className="text-sm font-semibold text-primary-700">Registrar abono</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label text-xs">Monto (Q)</label>
                        <input className="input" type="number" min="0.01" step="0.01"
                          value={formPago.monto} onChange={e => setFormPago(p => ({...p, monto: e.target.value}))}
                          placeholder="0.00" />
                      </div>
                      <div>
                        <label className="label text-xs">Fecha</label>
                        <input className="input" type="date" value={formPago.fecha}
                          onChange={e => setFormPago(p => ({...p, fecha: e.target.value}))} />
                      </div>
                      <div className="col-span-2">
                        <label className="label text-xs">Descripción (opcional)</label>
                        <input className="input" value={formPago.descripcion}
                          onChange={e => setFormPago(p => ({...p, descripcion: e.target.value}))}
                          placeholder="Abono mensual..." />
                      </div>
                    </div>
                    <button
                      onClick={() => handleAbono(m.id, pendiente)}
                      className="btn-primary btn-sm w-full"
                    >
                      Registrar abono
                    </button>
                  </div>
                )}

                {/* Historial */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Abonos registrados ({pagos.length})</p>
                  {pagos.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin abonos aún</p>
                  ) : (
                    <div className="space-y-1">
                      {pagos.sort((a,b) => new Date(b.creado_en)-new Date(a.creado_en)).map(p => (
                        <div key={p.id} className="flex items-center justify-between py-1">
                          <div>
                            <span className="text-sm font-medium text-gray-700">{formatCurrency(p.monto)}</span>
                            <span className="text-xs text-gray-400 ml-2">{formatDate(p.fecha || p.creado_en)}</span>
                            {p.descripcion && <span className="text-xs text-gray-400 ml-1">· {p.descripcion}</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => generarRecibo(p, m, pagado, m.deuda_total || 0)}
                              className="btn-icon btn-ghost text-gray-300 hover:text-primary-500 btn-sm"
                              title="Imprimir recibo"
                            >
                              <PrinterIcon size={14} />
                            </button>
                            {esDirector && (
                              <button onClick={() => eliminarPagoCuota(p.id)}
                                className="btn-icon btn-ghost text-gray-300 hover:text-red-500 btn-sm">
                                <TrashIcon size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tab Historial ──────────────────────────────────────────────────────────
function TabHistorial() {
  const { ingresos, pagosCuota, fondoDisponible, totalIngresos, totalPagado, tiposIngreso } = useFinanzas()
  const { musicos } = useMusicos()

  const todos = [
    ...ingresos.map(i => ({ ...i, _tipo: 'ingreso' })),
    ...pagosCuota.map(p => ({ ...p, _tipo: 'pago' })),
  ].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))

  const nombreMusico = (id) => musicos.find(m => m.id === id)?.nombre || '—'

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-gradient-green rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 mb-1">Total ingresos</p>
          <p className="font-bold text-green-700">{formatCurrency(totalIngresos)}</p>
        </div>
        <div className="card-gradient-orange rounded-xl p-4 text-center">
          <p className="text-xs text-orange-600 mb-1">Total abonos</p>
          <p className="font-bold text-orange-700">{formatCurrency(totalPagado)}</p>
        </div>
        <div className={`rounded-xl p-4 text-center ${fondoDisponible >= 0 ? 'card-gradient-green' : 'card-gradient-orange'}`}>
          <p className={`text-xs mb-1 ${fondoDisponible >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
            Fondo disponible
          </p>
          <p className={`font-bold ${fondoDisponible >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(fondoDisponible)}
          </p>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
        <InfoIcon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          El fondo disponible es la diferencia entre todos los ingresos y los abonos realizados a cuotas de instrumentos.
        </p>
      </div>

      {/* Lista completa */}
      <div className="card">
        <div className="space-y-2">
          {todos.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin movimientos registrados</p>
          ) : (
            todos.map(mov => {
              const esIngreso = mov._tipo === 'ingreso'
              const info = esIngreso ? tiposIngreso[mov.tipo] : null
              return (
                <div key={mov.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-base flex-shrink-0
                    ${esIngreso ? 'bg-green-100' : 'bg-orange-100'}`}>
                    {esIngreso ? (info?.emoji || '💰') : '📤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {esIngreso
                        ? (info?.label || mov.tipo)
                        : `Abono cuota — ${nombreMusico(mov.musico_id)}`}
                    </p>
                    {mov.descripcion && (
                      <p className="text-xs text-gray-400 truncate">{mov.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(mov.fecha || mov.creado_en)}</p>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${esIngreso ? 'text-green-600' : 'text-red-500'}`}>
                    {esIngreso ? '+' : '-'}{formatCurrency(mov.monto)}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Finanzas() {
  const [tab, setTab] = useState(0)
  const [modalIngreso, setModalIngreso] = useState(false)
  const { esDirector } = useAuth()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">Control de ingresos y cuotas de instrumentos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === i
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabIngresos onNuevo={() => setModalIngreso(true)} />}
      {tab === 1 && <TabCuotas />}
      {tab === 2 && <TabHistorial />}

      {modalIngreso && (
        <ModalIngreso onClose={() => setModalIngreso(false)} />
      )}
    </div>
  )
}
