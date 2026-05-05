import { useState } from 'react'
import { PlusIcon, TrashIcon, XIcon, CurrencyDollarIcon, TrendUpIcon, InfoIcon, CreditCardIcon, CaretDownIcon, CaretUpIcon, PrinterIcon } from '@phosphor-icons/react'
import { useFinanzas } from '../contexts/FinanzasContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useAuth } from '../contexts/AuthContext'
import { useGastos } from '../contexts/GastosContext'
import { formatCurrency, formatDate } from '../utils/formatters'

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

// ── Subcomponente: fila de gasto fijo por músico ─────────────────────────────
function FilaGastoMusico({ gasto, musicoId, numMusicos, esDirector }) {
  const { pagadoPorMusico, abonosPorMusico, registrarAbono, eliminarAbono, cuotaDeMusico } = useGastos()
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState({ monto: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '' })
  const [loading, setLoading] = useState(false)

  const cuotaMusico  = cuotaDeMusico(gasto, musicoId, numMusicos)
  const pagadoM      = pagadoPorMusico(gasto.id, musicoId)
  const pendM        = Math.max(0, cuotaMusico - pagadoM)
  const pctM         = cuotaMusico > 0 ? Math.min(100, Math.round((pagadoM / cuotaMusico) * 100)) : 100
  const listoM       = pendM === 0
  const hoy          = new Date()
  const limite       = gasto.fecha_limite ? new Date(gasto.fecha_limite) : null
  const diasRest     = limite ? Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24)) : null
  const vencido      = diasRest !== null && diasRest < 0

  const abonos = abonosPorMusico(gasto.id, musicoId)

  const handleAbono = async (e) => {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) return
    setLoading(true)
    await registrarAbono({
      gasto_id:    gasto.id,
      musico_id:   musicoId,
      monto:       parseFloat(form.monto),
      fecha:       form.fecha,
      descripcion: form.descripcion,
    })
    setLoading(false)
    setForm(p => ({ ...p, monto: '', descripcion: '' }))
  }

  return (
    <div className={`rounded-xl border p-3 transition-colors ${listoM ? 'border-green-200 bg-green-50' : vencido ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setAbierto(v => !v)}>
        <div className="flex items-center gap-2 min-w-0">
          <CreditCardIcon size={13} className={listoM ? 'text-green-500' : vencido ? 'text-red-500' : 'text-gray-400'} />
          <span className="text-sm font-medium text-gray-800 truncate">{gasto.nombre}</span>
          {listoM && <span className="text-xs text-green-600 font-semibold">✓</span>}
          {vencido && !listoM && <span className="text-xs text-red-600 font-semibold">⚠ Vencido</span>}
          {!listoM && !vencido && diasRest !== null && diasRest <= 7 && (
            <span className="text-xs text-amber-600 font-semibold">⏰ {diasRest}d</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-bold ${listoM ? 'text-green-600' : 'text-red-600'}`}>
            {listoM ? 'Al día' : formatCurrency(pendM)}
          </span>
          {abierto ? <CaretUpIcon size={13} className="text-gray-400" /> : <CaretDownIcon size={13} className="text-gray-400" />}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-2">
        <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-200">
          <div className={`h-full rounded-full ${listoM ? 'bg-green-500' : 'bg-primary-500'}`}
            style={{ width: `${pctM}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>{formatCurrency(pagadoM)} pagado</span>
          <span>Cuota: {formatCurrency(cuotaMusico)}</span>
        </div>
      </div>

      {/* Detalle expandido */}
      {abierto && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 animate-fade-in">
          {/* Historial de abonos */}
          {abonos.length > 0 && (
            <div className="space-y-1">
              {abonos.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)).map(a => (
                <div key={a.id} className="flex items-center justify-between py-0.5">
                  <div>
                    <span className="text-xs font-medium text-gray-700">{formatCurrency(a.monto)}</span>
                    <span className="text-xs text-gray-400 ml-2">{formatDate(a.fecha || a.creado_en)}</span>
                    {a.descripcion && <span className="text-xs text-gray-400 ml-1">· {a.descripcion}</span>}
                  </div>
                  {esDirector && (
                    <button onClick={() => eliminarAbono(a.id)}
                      className="btn-icon btn-ghost text-gray-300 hover:text-red-500 btn-sm">
                      <TrashIcon size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {abonos.length === 0 && <p className="text-xs text-gray-400">Sin abonos</p>}

          {/* Formulario abono */}
          {esDirector && !listoM && (
            <form onSubmit={handleAbono} className="rounded-lg bg-primary-50 border border-primary-100 p-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Monto (Q)</label>
                  <input className="input" type="number" min="0.01" step="0.01"
                    value={form.monto}
                    onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
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
                    placeholder="Descripción (opcional)..." />
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

// ── Voucher de pago ────────────────────────────────────────────────────────
function imprimirVoucher({ musico, gastos, cuotaDeMusico, pagadoPorMusico, numMusicos }) {
  const hoy = new Date()
  const fechaLarga  = hoy.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })
  const fechaCorta  = hoy.toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const shortId     = musico.id?.slice(-7)?.toUpperCase() ?? 'XXXXXXX'

  const detalles = gastos
    .map(g => ({
      nombre: g.nombre,
      cuota:  cuotaDeMusico(g, musico.id, numMusicos),
      pagado: pagadoPorMusico(g.id, musico.id),
    }))
    .filter(d => d.cuota > 0)

  const totalCuotas = detalles.reduce((s, d) => s + d.cuota, 0)
  const totalPagado = detalles.reduce((s, d) => s + d.pagado, 0)
  const saldo       = Math.max(0, totalCuotas - totalPagado)
  const fQ = n => `Q ${Number(n).toFixed(2)}`

  const concepto = detalles.length === 1
    ? detalles[0].nombre
    : 'Cuotas de instrumentos'

  const filasResumen = detalles.map(d => `
    <div class="sum-row">
      <span class="sum-label">${d.nombre}</span>
      <span class="sum-val">${fQ(d.pagado)}</span>
    </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo — ${musico.nombre}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:20px 16px;min-height:100vh}

    .topbar{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:370px;margin-bottom:14px}
    .topbar-left .lbl{font-size:11px;color:#888}
    .topbar-left .rid{font-size:15px;font-weight:800;color:#111;letter-spacing:.5px}
    .topbar-right{display:flex;align-items:center;gap:8px}
    .btn-print{background:#111;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;letter-spacing:.3px}
    .btn-close{background:#fff;border:1px solid #ccc;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;color:#555;display:flex;align-items:center;justify-content:center;line-height:1}

    .receipt{background:#fff;width:100%;max-width:370px;padding:28px 26px 20px;box-shadow:0 4px 20px rgba(0,0,0,.13)}

    .rcp-header{text-align:center;padding-bottom:18px}
    .rcp-name{font-size:22px;font-weight:900;color:#111;letter-spacing:.5px;text-transform:uppercase}
    .rcp-sub{font-size:11px;color:#777;margin-top:5px}

    .dash{border:none;border-top:1.5px dashed #bbb;margin:16px 0}

    .sec-title{text-align:center;font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#111}
    .sec-id{text-align:center;font-size:11px;color:#aaa;margin-top:3px}

    .field{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px}
    .field-lbl{font-size:12px;color:#666}
    .field-val{font-size:12px;font-weight:700;color:#111;text-align:right;max-width:200px}

    .amount-box{text-align:center;padding:6px 0 4px}
    .amount-q{font-size:46px;font-weight:900;color:#111;letter-spacing:-1px;line-height:1}
    .amount-sub{font-size:10px;color:#aaa;margin-top:6px;letter-spacing:1.5px;text-transform:uppercase}

    .sum-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
    .sum-label{font-size:12px;color:#555}
    .sum-val{font-size:12px;font-weight:600;color:#111}

    .sep-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;border-top:1px solid #eee;padding-top:6px;margin-top:2px}
    .sep-label{font-size:12px;font-weight:700;color:#111}
    .sep-val{font-size:12px;font-weight:700;color:#111}

    .paid{text-align:center;font-size:11px;font-weight:800;color:#16a34a;letter-spacing:1px;padding:6px 0 2px}

    .sig{display:flex;align-items:flex-end;gap:8px;margin-top:10px}
    .sig-lbl{font-size:11px;color:#777;white-space:nowrap}
    .sig-line{flex:1;border-bottom:1px solid #bbb;margin-bottom:2px}

    .footer{text-align:center;font-size:10px;color:#bbb;margin-top:18px}

    @media print{
      body{background:#fff;padding:0}
      .topbar{display:none}
      .receipt{box-shadow:none;max-width:100%;padding:20px}
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <div class="lbl">Recibo #</div>
      <div class="rid">${shortId}</div>
    </div>
    <div class="topbar-right">
      <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir / PDF</button>
      <button class="btn-close" onclick="window.close()">✕</button>
    </div>
  </div>

  <div class="receipt">
    <div class="rcp-header">
      <div class="rcp-name">Óleo de Alegría</div>
      <div class="rcp-sub">Salmos 45:7 — Banda Musical Cristiana</div>
    </div>

    <hr class="dash">

    <div class="sec-title">Recibo de Pago</div>
    <div class="sec-id"># ${shortId}</div>

    <hr class="dash">

    <div class="field"><span class="field-lbl">Fecha:</span><span class="field-val">${fechaLarga}</span></div>
    <div class="field"><span class="field-lbl">Músico:</span><span class="field-val">${musico.nombre}</span></div>
    <div class="field"><span class="field-lbl">Instrumento:</span><span class="field-val">${musico.instrumento ?? '—'}</span></div>
    <div class="field"><span class="field-lbl">Concepto:</span><span class="field-val">${concepto}</span></div>

    <hr class="dash">

    <div class="amount-box">
      <div class="amount-q">${fQ(totalPagado)}</div>
      <div class="amount-sub">Monto recibido</div>
    </div>

    <hr class="dash">

    ${filasResumen}
    <div class="sum-row"><span class="sum-label">Deuda total:</span><span class="sum-val">${fQ(totalCuotas)}</span></div>
    <div class="sum-row"><span class="sum-label">Total abonado:</span><span class="sum-val">${fQ(totalPagado)}</span></div>
    <div class="sep-row"><span class="sep-label">Saldo pendiente:</span><span class="sep-val">${fQ(saldo)}</span></div>

    <div class="paid">✓ DEUDA COMPLETAMENTE PAGADA</div>

    <hr class="dash">

    <div class="sig">
      <span class="sig-lbl">Firma del director:</span>
      <div class="sig-line"></div>
    </div>

    <div class="footer">Óleo de Alegría — Generado el ${fechaCorta}</div>
  </div>

  <script>window.onload = () => { window.print() }<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=460,height=820')
  win.document.write(html)
  win.document.close()
}

// ── Tab Cuotas ─────────────────────────────────────────────────────────────
function TabCuotas() {
  const { musicos } = useMusicos()
  const { gastos, pagadoPorMusico: pagadoGastoMusico, cuotaDeMusico } = useGastos()
  const { esDirector } = useAuth()

  const [expandido, setExpandido] = useState(null)
  const numMusicos = musicos.length || 1

  return (
    <div className="space-y-3">
      {musicos.map(m => {
        const abierto = expandido === m.id
        const totalPendienteGastos = gastos.reduce((sum, g) => {
          const cuotaM  = cuotaDeMusico(g, m.id, numMusicos)
          const pagadoM = pagadoGastoMusico(g.id, m.id)
          return sum + Math.max(0, cuotaM - pagadoM)
        }, 0)

        return (
          <div key={m.id} className="card">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandido(abierto ? null : m.id)}>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold shadow flex-shrink-0">
                {m.nombre?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{m.nombre}</p>
                <p className="text-xs text-gray-400">{m.instrumento}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {totalPendienteGastos > 0 ? (
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(totalPendienteGastos)}</p>
                    <p className="text-xs text-gray-400">pendiente</p>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-green-600">Al día ✓</span>
                    {gastos.length > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          imprimirVoucher({ musico: m, gastos, cuotaDeMusico, pagadoPorMusico: pagadoGastoMusico, numMusicos })
                        }}
                        className="btn-icon btn-ghost text-gray-400 hover:text-primary-600 btn-sm"
                        title="Imprimir / descargar comprobante"
                      >
                        <PrinterIcon size={15} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {abierto && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 animate-fade-in">
                {gastos.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay gastos fijos registrados.</p>
                ) : (
                  gastos.map(g => (
                    <FilaGastoMusico key={g.id} gasto={g} musicoId={m.id} numMusicos={numMusicos} esDirector={esDirector} />
                  ))
                )}
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
