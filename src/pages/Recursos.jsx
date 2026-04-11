import { useState, useRef } from 'react'
import { PlusIcon, XIcon, TrashIcon, ArrowSquareOutIcon, FileTextIcon, ImageIcon, VideoIcon, MusicNotesIcon, UploadSimpleIcon, MagnifyingGlassIcon, PlaylistIcon } from '@phosphor-icons/react'
import { useRecursos, TIPOS_RECURSO } from '../contexts/RecursosContext'
import { useMusicos } from '../contexts/MusicosContext'
import { useAuth } from '../contexts/AuthContext'
import { useListas } from '../contexts/ListasContext'
import { formatDate } from '../utils/formatters'

// Utilidad para obtener la miniatura de YouTube
function getYoutubeThumbnail(url) {
  let videoId = ''
  if (url.includes('youtube.com')) {
    const match = url.match(/[?&]v=([^&]+)/)
    videoId = match ? match[1] : ''
  } else if (url.includes('youtu.be')) {
    const match = url.match(/youtu\.be\/([^?&]+)/)
    videoId = match ? match[1] : ''
  }
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
}

// ── Modal agregar recurso ───────────────────────────────────────────────────
function ModalRecurso({ onClose }) {
  const { agregarRecurso, tiposRecurso } = useRecursos()
  const { musicos } = useMusicos()
  const { sesion } = useAuth()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    musico_id:   sesion?.id || '',
    tipo:        'video',
    titulo:      '',
    descripcion: '',
    url_video:   '',
  })
  const [archivo, setArchivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const tipoActual = tiposRecurso[form.tipo]

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar 5MB. Para archivos grandes usa un enlace externo (Drive, Dropbox).')
      return
    }
    setError('')
    setArchivo(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo) { setError('El título es requerido'); return }
    if (form.tipo === 'video' && !form.url_video) { setError('Ingresa la URL del video'); return }
    if (form.tipo !== 'video' && !archivo) { setError('Selecciona un archivo'); return }

    setLoading(true)
    await agregarRecurso({
      ...form,
      creado_por: sesion?.id,
      instrumento: musicos.find(m => m.id === form.musico_id)?.instrumento || '',
    }, archivo)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Agregar Recurso</h2>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          {/* Tipo */}
          <div>
            <label className="label">Tipo de recurso *</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(tiposRecurso).map(([key, info]) => (
                <button key={key} type="button"
                  onClick={() => { setForm(p => ({...p, tipo: key})); setArchivo(null) }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm transition-all
                    ${form.tipo === key
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span className="text-xl">{info.icon}</span>
                  <span className="text-xs font-medium">{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Músico al que pertenece */}
          <div>
            <label className="label">Pertenece a</label>
            <select className="input" value={form.musico_id}
              onChange={e => setForm(p => ({...p, musico_id: e.target.value}))}>
              <option value="">— General (toda la banda) —</option>
              {musicos.map(m => (
                <option key={m.id} value={m.id}>{m.nombre} — {m.instrumento}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Título *</label>
            <input className="input" value={form.titulo}
              onChange={e => setForm(p => ({...p, titulo: e.target.value}))}
              placeholder="Ej: Intro canción principal, Partitura Salmo 23..." />
          </div>

          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea className="input resize-none" rows={2} value={form.descripcion}
              onChange={e => setForm(p => ({...p, descripcion: e.target.value}))}
              placeholder="Notas adicionales sobre este recurso..." />
          </div>

          {/* Video: URL */}
          {form.tipo === 'video' && (
            <div>
              <label className="label">URL del video *</label>
              <input className="input" type="url" value={form.url_video}
                onChange={e => setForm(p => ({...p, url_video: e.target.value}))}
                placeholder="https://youtube.com/watch?v=..." />
              <p className="text-xs text-gray-400 mt-1">YouTube, Drive, Vimeo o cualquier enlace</p>
            </div>
          )}

          {/* Partitura / Imagen: subir archivo */}
          {form.tipo !== 'video' && (
            <div>
              <label className="label">
                {form.tipo === 'partitura' ? 'Archivo PDF *' : 'Imagen *'}
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${archivo ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
              >
                {archivo ? (
                  <div>
                    <div className="text-2xl mb-1">{tipoActual.icon}</div>
                    <p className="text-sm font-medium text-primary-700">{archivo.name}</p>
                    <p className="text-xs text-gray-400">{(archivo.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <UploadSimpleIcon size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click para seleccionar</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {form.tipo === 'partitura' ? 'PDF (máx. 5MB)' : 'JPG, PNG, GIF (máx. 5MB)'}
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={tipoActual.accept}
                onChange={handleFile}
                className="hidden"
              />
              {archivo && (
                <button type="button" onClick={() => setArchivo(null)}
                  className="text-xs text-red-500 mt-1 hover:underline">
                  Quitar archivo
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Subiendo...' : 'Agregar recurso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Icono por tipo ─────────────────────────────────────────────────────────
function IconTipo({ tipo, size = 20 }) {
  if (tipo === 'video')     return <VideoIcon size={size} />
  if (tipo === 'partitura') return <FileTextIcon size={size} />
  if (tipo === 'imagen')    return <ImageIcon size={size} />
  return <MusicNotesIcon size={size} />
}

const COLOR_TIPO = {
  video:     'bg-red-100 text-red-600',
  partitura: 'bg-blue-100 text-blue-600',
  imagen:    'bg-green-100 text-green-600',
}

// Paleta de colores para listas (se asigna por índice)
const LISTA_COLORES = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-300'    },
  { bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-300'},
  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300'  },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-300'   },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300'   },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
]


function getYoutubeEmbedUrl(url) {
  // Soporta youtube.com/watch?v=... y youtu.be/...
  var videoId = ''
  if (url.includes('youtube.com')) {
    var match = url.match(/[?&]v=([^&]+)/)
    videoId = match ? match[1] : ''
  } else if (url.includes('youtu.be')) {
    var match = url.match(/youtu\.be\/([^?&]+)/)
    videoId = match ? match[1] : ''
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url
}

// ── Modal agregar video a lista ────────────────────────────────────────────
function ModalAgregarALista({ recurso, onClose }) {
  const { listas, crearLista, agregarVideoALista, listasDeVideo } = useListas()
  const { esDirector } = useAuth()
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  const listasConVideo = listasDeVideo(recurso.id)

  const handleAgregar = (listaId) => {
    agregarVideoALista(listaId, recurso.id)
  }

  const handleCrearYAgregar = () => {
    if (!nuevaNombre.trim()) { setError('Escribe un nombre'); return }
    const id = crearLista({ nombre: nuevaNombre })
    agregarVideoALista(id, recurso.id)
    setNuevaNombre('')
    setCreando(false)
    setError('')
  }

  const yaEsta = (listaId) => listasConVideo.some(l => l.id === listaId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Agregar a lista</h2>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{recurso.titulo}</p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {listas.length === 0 && !creando && (
            <p className="text-sm text-gray-400 text-center py-2">No hay listas. Crea una nueva.</p>
          )}

          {listas.map(lista => (
            <div key={lista.id} className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">🎵</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{lista.nombre}</p>
                  <p className="text-xs text-gray-400">{lista.video_ids.length} video{lista.video_ids.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {yaEsta(lista.id) ? (
                <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Agregado</span>
              ) : (
                <button onClick={() => handleAgregar(lista.id)}
                  className="btn-primary btn-sm flex-shrink-0">
                  Agregar
                </button>
              )}
            </div>
          ))}

          {/* Crear nueva lista */}
          {esDirector && (
            creando ? (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-600">Nueva lista</p>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <input className="input" autoFocus value={nuevaNombre}
                  onChange={e => setNuevaNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCrearYAgregar()}
                  placeholder="Nombre de la canción..." />
                <div className="flex gap-2">
                  <button onClick={() => { setCreando(false); setError('') }} className="btn-secondary btn-sm flex-1">Cancelar</button>
                  <button onClick={handleCrearYAgregar} className="btn-primary btn-sm flex-1">Crear y agregar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCreando(true)}
                className="w-full flex items-center gap-2 justify-center p-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-all">
                <PlusIcon size={16} /> Crear nueva lista
              </button>
            )
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary w-full">Listo</button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de recurso ─────────────────────────────────────────────────────
function CardRecurso({ recurso, onDelete, esDirector, musicos, listaColorMap }) {
  const [verImagen, setVerImagen] = useState(false)
  const [verVideo, setVerVideo] = useState(false)
  const [modalLista, setModalLista] = useState(false)
  const musico = musicos.find(m => m.id === recurso.musico_id)

  // Listas a las que pertenece este video
  const listasDelVideo = listaColorMap.filter(l => l.video_ids.includes(recurso.id))

  const abrirRecurso = () => {
    if (recurso.tipo === 'video') {
      setVerVideo(true)
    } else if (recurso.tipo === 'imagen') {
      setVerImagen(true)
    } else if (recurso.tipo === 'partitura' && recurso.archivo_base64) {
      const link = document.createElement('a')
      link.href = recurso.archivo_base64
      link.download = recurso.archivo_nombre || 'partitura.pdf'
      link.click()
    }
  }

  return (
    <>
      <div className="card hover:shadow-lg transition-all group">
        {/* Previa imagen o video */}
        {recurso.tipo === 'imagen' && recurso.archivo_base64 && (
          <div className="mb-3 -mt-1 -mx-1 rounded-lg overflow-hidden h-32 bg-gray-100 cursor-pointer"
            onClick={abrirRecurso}>
            <img src={recurso.archivo_base64} alt={recurso.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        {recurso.tipo === 'video' && recurso.url_video && (
          <div className="mb-3 -mt-1 -mx-1 rounded-lg overflow-hidden h-32 bg-gray-100 flex items-center justify-center cursor-pointer"
            onClick={abrirRecurso}>
            {recurso.url_video.includes('youtube.com') || recurso.url_video.includes('youtu.be') ? (
              <img
                src={getYoutubeThumbnail(recurso.url_video)}
                alt="Miniatura video"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                style={{ minHeight: '100px', background: '#000' }}
              />
            ) : (
              <video src={recurso.url_video} className="w-full h-full object-cover" style={{ minHeight: '100px', background: '#000' }} muted preload="metadata" />
            )}

          </div>
        )}


        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR_TIPO[recurso.tipo] || 'bg-gray-100 text-gray-500'}`}>
            <IconTipo tipo={recurso.tipo} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{recurso.titulo}</p>
            {recurso.descripcion && (
              <p className="text-xs text-gray-400 truncate">{recurso.descripcion}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {musico && (
                <span className="badge badge-purple text-xs">
                  {musico.instrumento}
                </span>
              )}
              {!recurso.musico_id && (
                <span className="badge badge-gray text-xs">General</span>
              )}
              <span className="text-xs text-gray-400">{formatDate(recurso.creado_en)}</span>
            </div>
            {/* Badges de listas */}
            {listasDelVideo.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {listasDelVideo.map(l => (
                  <span key={l.id}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${l.color.bg} ${l.color.text} ${l.color.border}`}>
                    🎵 {l.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <button onClick={abrirRecurso}
            className="btn-secondary btn-sm flex-1">
            <ArrowSquareOutIcon size={13} />
            {recurso.tipo === 'video' ? 'Ver video' : recurso.tipo === 'imagen' ? 'Ver imagen' : 'Descargar PDF'}
          </button>
          {recurso.tipo === 'video' && esDirector && (
            <button onClick={() => setModalLista(true)}
              className="btn-icon btn-ghost text-gray-400 hover:text-primary-500 btn-sm"
              title="Agregar a lista">
              <PlaylistIcon size={16} />
            </button>
          )}
          {esDirector && (
            <button onClick={() => onDelete(recurso)}
              className="btn-icon btn-ghost text-gray-400 hover:text-red-500 btn-sm">
              <TrashIcon size={15} />
            </button>
          )}
        </div>

        {modalLista && (
          <ModalAgregarALista recurso={recurso} onClose={() => setModalLista(false)} />
        )}
            {/* Lightbox video */}
            {verVideo && recurso.tipo === 'video' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-8 bg-black/80 backdrop-blur-sm"
                onClick={() => setVerVideo(false)}>
                <div className="relative w-full max-w-3xl sm:max-w-4xl max-h-full bg-black rounded-xl shadow-2xl flex flex-col items-center justify-center">
                  <button onClick={() => setVerVideo(false)}
                    className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-lg">
                    <XIcon size={16} />
                  </button>
                  {recurso.url_video.includes('youtube.com') || recurso.url_video.includes('youtu.be') ? (
                    <iframe
                      src={getYoutubeEmbedUrl(recurso.url_video)}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-xl w-[90vw] sm:w-[800px] max-w-full h-[45vw] sm:h-[450px] max-h-[70vh] bg-black"
                    />
                  ) : (
                    <video src={recurso.url_video} controls className="rounded-xl w-[90vw] sm:w-[800px] max-w-full h-[45vw] sm:h-[450px] max-h-[70vh] bg-black" />
                  )}
                </div>
              </div>
            )}

      // Utilidad para obtener el embed de YouTube
      </div>

      {/* Lightbox imagen */}
      {verImagen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setVerImagen(false)}>
          <div className="relative max-w-4xl max-h-full">
            <img src={recurso.archivo_base64} alt={recurso.titulo}
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" />
            <button onClick={() => setVerImagen(false)}
              className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-lg">
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Recursos() {
  const { recursos, eliminarRecurso, tiposRecurso } = useRecursos()
  const { musicos } = useMusicos()
  const { esDirector } = useAuth()
  const { listas } = useListas()

  const [modal, setModal]         = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroMusico, setFiltroMusico] = useState('todos')
  const [busqueda, setBusqueda]   = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Mapa de listas con color asignado por índice
  const listaColorMap = listas.map((l, i) => ({
    ...l,
    color: LISTA_COLORES[i % LISTA_COLORES.length],
  }))

  const filtrados = recursos.filter(r => {
    if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false
    if (filtroMusico === 'general' && r.musico_id) return false
    if (filtroMusico !== 'todos' && filtroMusico !== 'general' && r.musico_id !== filtroMusico) return false
    if (busqueda && !r.titulo.toLowerCase().includes(busqueda.toLowerCase()) &&
        !r.descripcion?.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const handleDelete = async (recurso) => {
    await eliminarRecurso(recurso.id)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recursos</h1>
          <p className="page-subtitle">{recursos.length} recurso{recursos.length !== 1 ? 's' : ''} en la biblioteca</p>
        </div>
        {esDirector && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <PlusIcon size={16} /> Agregar recurso
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card space-y-3">
        {/* Búsqueda */}
        <div className="relative">
          <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar recurso..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Filtro tipo */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                ${filtroTipo === 'todos' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>
              Todos
            </button>
            {Object.entries(tiposRecurso).map(([key, info]) => (
              <button key={key} onClick={() => setFiltroTipo(key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                  ${filtroTipo === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>
                {info.icon} {info.label}
              </button>
            ))}
          </div>

          {/* Filtro músico */}
          <select className="input w-auto text-sm"
            value={filtroMusico} onChange={e => setFiltroMusico(e.target.value)}>
            <option value="todos">Todos los músicos</option>
            <option value="general">General (sin asignar)</option>
            {musicos.map(m => (
              <option key={m.id} value={m.id}>{m.nombre} — {m.instrumento}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de recursos */}
      {filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <MusicNotesIcon size={48} className="mx-auto mb-3 text-primary-300" />
          <p className="text-gray-500">
            {recursos.length === 0 ? 'No hay recursos en la biblioteca' : 'No hay recursos con ese filtro'}
          </p>
          {esDirector && recursos.length === 0 && (
            <button className="btn-primary mt-4" onClick={() => setModal(true)}>
              <PlusIcon size={16} /> Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(r => (
            <CardRecurso
              key={r.id}
              recurso={r}
              musicos={musicos}
              esDirector={esDirector}
              onDelete={setConfirmDelete}
              listaColorMap={listaColorMap}
            />
          ))}
        </div>
      )}

      {/* Modal agregar */}
      {modal && <ModalRecurso onClose={() => setModal(false)} />}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in">
            <h3 className="font-semibold text-gray-900 mb-2">¿Eliminar recurso?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Se eliminará <strong>{confirmDelete.titulo}</strong>. Esta acción no se puede deshacer.
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
