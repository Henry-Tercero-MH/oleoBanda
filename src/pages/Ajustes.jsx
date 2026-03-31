import { useState, useEffect, useRef } from 'react'
import { CloudArrowUpIcon, DownloadSimpleIcon, WifiHighIcon, MusicNotesIcon, CurrencyDollarIcon, BookOpenIcon, UsersThreeIcon, CheckCircleIcon, XCircleIcon, WarningCircleIcon, HardDriveIcon, ArrowSquareOutIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useFinanzas } from '../contexts/FinanzasContext'
import { useRecursos } from '../contexts/RecursosContext'
import { testConexion, gasBackupCompleto, testDrive, gasGetAll } from '../services/googleAppsScript'
import Alert from '../components/ui/Alert'

function EstadoBadge({ estado }) {
  if (estado === 'ok')    return <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircleIcon size={15} /> OK</span>
  if (estado === 'error') return <span className="flex items-center gap-1.5 text-sm text-red-500"><XCircleIcon size={15} /> Error</span>
  return <span className="flex items-center gap-1.5 text-sm text-gray-400"><WarningCircleIcon size={15} /> Sin verificar</span>
}

// Modal de contraseña interna
function PasswordModal({ onSuccess }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const handleSubmit = (e) => {
    e.preventDefault()
    if (input === 'admin') {
      sessionStorage.setItem('ajustes_autorizado', '1')
      onSuccess()
    } else {
      setError('Contraseña incorrecta')
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xs animate-fade-in flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900 text-center">Contraseña requerida</h2>
        <input
          type="password"
          className="input text-center"
          placeholder="Contraseña interna"
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          autoFocus
        />
        {error && <div className="text-sm text-red-600 text-center">{error}</div>}
        <button type="submit" className="btn-primary w-full">Entrar</button>
      </form>
    </div>
  )
}

export default function Ajustes() {
  const { sesion, esDirector } = useAuth()
  const { musicos } = useMusicos()
  const { ingresos, pagosCuota } = useFinanzas()
  const { recursos } = useRecursos()

  const fileInputRef = useRef(null)
  const [alerta, setAlerta] = useState(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [driveLoading, setDriveLoading] = useState(false)
  const [conexion, setConexion] = useState(null)  // null | 'ok' | 'error'
  const [drive, setDrive] = useState(null)  // null | { ok, mensaje, folderUrl } | 'error'
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('ajustes_autorizado')) {
      setShowPasswordModal(true)
    }
  }, [])

  const mostrarAlerta = (type, message) => {
    setAlerta({ type, message })
    setTimeout(() => setAlerta(null), 5000)
  }

  const handleTestConexion = async () => {
    setTestLoading(true)
    setConexion(null)
    const res = await testConexion()
    setConexion(res.ok ? 'ok' : 'error')
    res.ok
      ? mostrarAlerta('success', 'Conexión con Google Sheets exitosa ✓')
      : mostrarAlerta('error', `Sin conexión: ${res.error || 'Verifica la URL en .env'}`)
    setTestLoading(false)
  }

  const handleTestDrive = async () => {
    setDriveLoading(true)
    setDrive(null)
    const res = await testDrive()
    if (res.ok) {
      setDrive({ ok: true, mensaje: res.mensaje, folderUrl: res.folderUrl })
      mostrarAlerta('success', `Drive autorizado ✓ — ${res.mensaje}`)
    } else {
      setDrive('error')
      mostrarAlerta('error', `Drive sin permiso: ${res.error}. Ejecuta testDrive() manualmente en Apps Script para autorizar.`)
    }
    setDriveLoading(false)
  }

  const handleRestaurar = async () => {
    setRestoreLoading(true)
    try {
      // Pares: [entidad en Sheet, clave localStorage]
      const mapa = [
        { entidad: 'usuarios',    claves: ['ferreapp_usuarios', 'banda_usuarios'] },
        { entidad: 'ingresos',    claves: ['ferreapp_ingresos'] },
        { entidad: 'pagosCuota',  claves: ['ferreapp_pagosCuota'] },
        { entidad: 'recursos',    claves: ['ferreapp_recursos', 'banda_recursos'] },
      ]

      let total = 0
      const errores = []

      for (const { entidad, claves } of mapa) {
        try {
          const res = await gasGetAll(entidad)
          if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
            const json = JSON.stringify(res.data)
            claves.forEach(clave => localStorage.setItem(clave, json))
            total += res.data.length
          }
        } catch {
          errores.push(entidad)
        }
      }

      if (total > 0) {
        mostrarAlerta('success', `Restaurados ${total} registros. Recargando...`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        mostrarAlerta('error', `No se encontraron datos en el Sheet.${errores.length ? ' Errores en: ' + errores.join(', ') : ''}`)
      }
    } catch (e) {
      mostrarAlerta('error', `Error al restaurar: ${e.message}`)
    }
    setRestoreLoading(false)
  }

  const handleImportarJSON = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        let total = 0

        if (Array.isArray(data.musicos) && data.musicos.length) {
          localStorage.setItem('banda_usuarios', JSON.stringify(data.musicos))
          localStorage.setItem('ferreapp_usuarios', JSON.stringify(data.musicos))
          total += data.musicos.length
        }
        if (Array.isArray(data.ingresos)) {
          localStorage.setItem('ferreapp_ingresos', JSON.stringify(data.ingresos))
          total += data.ingresos.length
        }
        if (Array.isArray(data.pagosCuota)) {
          localStorage.setItem('ferreapp_pagosCuota', JSON.stringify(data.pagosCuota))
          total += data.pagosCuota.length
        }
        if (Array.isArray(data.recursos) && data.recursos.length) {
          localStorage.setItem('banda_recursos', JSON.stringify(data.recursos))
          localStorage.setItem('ferreapp_recursos', JSON.stringify(data.recursos))
          total += data.recursos.length
        }

        mostrarAlerta('info', `Datos cargados (${total} registros). Sincronizando con Google Sheets...`)

        // Sobreescribir el Sheet completo con los datos del JSON
        await gasBackupCompleto({
          usuarios:   data.musicos  || [],
          ingresos:   data.ingresos || [],
          pagosCuota: data.pagosCuota || [],
          recursos:   (data.recursos || []).map(r => ({ ...r, archivo_base64: undefined })),
          fecha:      new Date().toISOString(),
        })

        mostrarAlerta('success', `Restauración completa: ${total} registros en app y Sheet. Recargando...`)
        setTimeout(() => window.location.reload(), 2000)
      } catch (err) {
        mostrarAlerta('error', `Error: ${err.message || 'Archivo JSON no válido'}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      await gasBackupCompleto({
        usuarios:   musicos,
        ingresos,
        pagosCuota,
        recursos:   recursos.map(r => ({ ...r, archivo_base64: undefined })),
        fecha:      new Date().toISOString(),
      })
      mostrarAlerta('success', `Backup enviado: ${musicos.length} músicos, ${ingresos.length} ingresos, ${pagosCuota.length} abonos, ${recursos.length} recursos`)
    } catch (e) {
      mostrarAlerta('error', `Error al hacer backup: ${e.message}`)
    }
    setBackupLoading(false)
  }

  const handleExportarJSON = () => {
    const data = {
      fecha_export: new Date().toISOString(),
      musicos,
      ingresos,
      pagosCuota,
      recursos: recursos.map(r => ({ ...r, archivo_base64: '[omitido]' })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `oleo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    mostrarAlerta('success', 'Backup JSON descargado')
  }

  if (showPasswordModal) {
    return <PasswordModal onSuccess={() => setShowPasswordModal(false)} />
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="page-title">Ajustes</h1>
        <p className="page-subtitle">Respaldos y estado del sistema</p>
      </div>

      {alerta && <Alert type={alerta.type} message={alerta.message} onClose={() => setAlerta(null)} />}

      {/* Estadísticas */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Datos del sistema</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Músicos',  value: musicos.length,    icon: UsersThreeIcon,      color: 'bg-purple-100 text-purple-600' },
            { label: 'Ingresos', value: ingresos.length,   icon: CurrencyDollarIcon,  color: 'bg-green-100 text-green-600' },
            { label: 'Abonos',   value: pagosCuota.length, icon: CurrencyDollarIcon,  color: 'bg-orange-100 text-orange-600' },
            { label: 'Recursos', value: recursos.length,   icon: BookOpenIcon,        color: 'bg-blue-100 text-blue-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl bg-gray-50 p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Sheets — conexión */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Google Sheets</h2>
        <p className="text-sm text-gray-400 mb-4">
          Requiere <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">VITE_APPS_SCRIPT_URL</code> en el archivo <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code>.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={handleTestConexion} disabled={testLoading} className="btn-secondary">
            <WifiHighIcon size={16} />
            {testLoading ? 'Probando...' : 'Probar Sheets'}
          </button>
          <EstadoBadge estado={conexion} />
        </div>
      </div>

      {/* Google Drive — permisos */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Google Drive</h2>
        <p className="text-sm text-gray-400 mb-1">
          Los archivos (partituras e imágenes) se guardan en la carpeta <strong>BandaApp - Recursos</strong> de tu Drive.
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Si es la primera vez, ejecuta <code className="bg-gray-100 px-1.5 py-0.5 rounded">testDrive()</code> manualmente en el editor de Apps Script para autorizar los permisos de Drive.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={handleTestDrive} disabled={driveLoading} className="btn-secondary">
            <HardDriveIcon size={16} />
            {driveLoading ? 'Verificando...' : 'Verificar Drive'}
          </button>
          <EstadoBadge estado={drive === null ? null : drive === 'error' ? 'error' : 'ok'} />
          {drive?.ok && drive.folderUrl && (
            <a
              href={drive.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary-600 hover:underline"
            >
              <ArrowSquareOutIcon size={13} /> Ver carpeta en Drive
            </a>
          )}
        </div>
      </div>

      {/* Respaldos — solo director */}
      {esDirector ? (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Respaldos</h2>
          <p className="text-sm text-gray-400 mb-4">Guarda una copia de todos los datos de la banda.</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleBackup} disabled={backupLoading} className="btn-primary">
              <CloudArrowUpIcon size={16} />
              {backupLoading ? 'Enviando...' : 'Backup a Google Sheets'}
            </button>
            <button onClick={handleExportarJSON} className="btn-secondary">
              <DownloadSimpleIcon size={16} />
              Exportar JSON local
            </button>
            <button onClick={handleRestaurar} disabled={restoreLoading} className="btn-secondary">
              <ArrowCounterClockwiseIcon size={16} />
              {restoreLoading ? 'Restaurando...' : 'Restaurar desde Sheet'}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
              <DownloadSimpleIcon size={16} />
              Importar JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportarJSON}
            />
          </div>
          <p className="mt-3 text-xs text-gray-400">
            El backup exporta músicos, ingresos, abonos y recursos (sin archivos — esos quedan en Drive).
          </p>
        </div>
      ) : (
        <div className="card bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <WarningCircleIcon size={16} />
            Solo el director puede realizar respaldos.
          </div>
        </div>
      )}

      {/* Sesión actual */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Sesión actual</h2>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg">
            {sesion?.nombre?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{sesion?.nombre}</p>
            <p className="text-sm text-gray-400">{sesion?.email} · {sesion?.instrumento}</p>
            <span className={`badge mt-1 ${sesion?.rol === 'director' ? 'badge-purple' : 'badge-blue'}`}>
              {sesion?.rol === 'director' ? '🎤 Director' : '🎵 Músico'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-300 pb-4">
        <MusicNotesIcon size={13} />
        <span>Óleo de Alegría · Sistema de Gestión v1.0</span>
      </div>
    </div>
  )
}
