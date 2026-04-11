import { useState } from 'react'
import {
  PlusIcon, XIcon, TrashIcon, PencilSimpleIcon,
  PlayCircleIcon, MusicNotesSimpleIcon, FloppyDiskIcon,
  CaretDownIcon, CaretUpIcon, CalendarCheckIcon,
} from '@phosphor-icons/react'
import { useListas } from '../contexts/ListasContext'
import { useRecursos } from '../contexts/RecursosContext'
import { useAuth } from '../contexts/AuthContext'

// ── Utilidades YouTube ────────────────────────────────────────────────────────
function getYoutubeThumbnail(url) {
  let videoId = ''
  if (url?.includes('youtube.com')) {
    const m = url.match(/[?&]v=([^&]+)/)
    videoId = m ? m[1] : ''
  } else if (url?.includes('youtu.be')) {
    const m = url.match(/youtu\.be\/([^?&]+)/)
    videoId = m ? m[1] : ''
  }
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
}

function getYoutubeEmbedUrl(url) {
  let videoId = ''
  if (url?.includes('youtube.com')) {
    const m = url.match(/[?&]v=([^&]+)/)
    videoId = m ? m[1] : ''
  } else if (url?.includes('youtu.be')) {
    const m = url.match(/youtu\.be\/([^?&]+)/)
    videoId = m ? m[1] : ''
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url
}

// ── Modal crear / editar lista ────────────────────────────────────────────────
function ModalLista({ lista = null, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre:      lista?.nombre      || '',
    descripcion: lista?.descripcion || '',
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {lista ? 'Editar lista' : 'Nueva lista'}
          </h2>
          <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><XIcon size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="label">Nombre de la lista *</label>
            <input className="input" value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: 10,000 Razones" autoFocus />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea className="input resize-none" rows={2} value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Notas sobre esta canción..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">
              <FloppyDiskIcon size={16} />
              {lista ? 'Guardar cambios' : 'Crear lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Lightbox video ────────────────────────────────────────────────────────────
function LightboxVideo({ recurso, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-8 bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-lg z-10">
          <XIcon size={16} />
        </button>
        <p className="text-white text-sm font-medium mb-2 truncate">{recurso.titulo}</p>
        <iframe
          src={getYoutubeEmbedUrl(recurso.url_video)}
          title={recurso.titulo}
          style={{ border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-xl w-full h-[50vw] sm:h-[450px] max-h-[70vh] bg-black"
        />
      </div>
    </div>
  )
}

// ── Tarjeta de video dentro de una lista ─────────────────────────────────────
function CardVideo({ recurso, esDirector, onPlay, onQuitar }) {
  const thumb = getYoutubeThumbnail(recurso.url_video)

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 group transition-all">
      {/* Miniatura */}
      <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
        onClick={() => onPlay(recurso)}>
        {thumb
          ? <img src={thumb} alt={recurso.titulo} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-400"><PlayCircleIcon size={28} /></div>
        }
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayCircleIcon size={22} className="text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{recurso.titulo}</p>
        {recurso.descripcion && (
          <p className="text-xs text-gray-400 truncate">{recurso.descripcion}</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onPlay(recurso)}
          className="btn-icon btn-ghost text-primary-500 btn-sm" title="Ver video">
          <PlayCircleIcon size={18} />
        </button>
        {esDirector && (
          <button onClick={() => onQuitar(recurso.id)}
            className="btn-icon btn-ghost text-gray-400 hover:text-red-500 btn-sm" title="Quitar de lista">
            <XIcon size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Card de lista ─────────────────────────────────────────────────────────────
function CardLista({ lista, recursos, esDirector, onEditar, onEliminar }) {
  const { quitarVideoDeList, marcarEnsayo } = useListas()
  const [expandida, setExpandida] = useState(false)
  const [videoActivo, setVideoActivo] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const videos = lista.video_ids
    .map(id => recursos.find(r => r.id === id))
    .filter(Boolean)

  const esEnsayo = !!lista.ensayo

  return (
    <div className={`card border-2 transition-colors ${esEnsayo ? 'border-blue-400 bg-blue-50' : 'border-transparent'}`}>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🎵</span>
            <h3 className={`font-semibold truncate ${esEnsayo ? 'text-blue-800' : 'text-gray-900'}`}>
              {lista.nombre}
            </h3>
            {esEnsayo && (
              <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                <CalendarCheckIcon size={12} /> Próximo ensayo
              </span>
            )}
          </div>
          {lista.descripcion && (
            <p className="text-xs text-gray-400 mt-0.5 ml-7">{lista.descripcion}</p>
          )}
          <p className="text-xs text-gray-400 mt-1 ml-7">
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {esDirector && (
            <>
              <button
                onClick={() => marcarEnsayo(lista.id)}
                title={esEnsayo ? 'Quitar de ensayo' : 'Marcar para ensayo'}
                className={`btn-icon btn-sm ${esEnsayo ? 'text-blue-500 hover:text-gray-400' : 'btn-ghost text-gray-400 hover:text-blue-500'}`}>
                <CalendarCheckIcon size={16} />
              </button>
              <button onClick={() => onEditar(lista)} className="btn-icon btn-ghost text-gray-400 btn-sm">
                <PencilSimpleIcon size={15} />
              </button>
              <button onClick={() => setConfirmDel(true)} className="btn-icon btn-ghost text-gray-400 hover:text-red-500 btn-sm">
                <TrashIcon size={15} />
              </button>
            </>
          )}
          <button onClick={() => setExpandida(v => !v)}
            className="btn-icon btn-ghost text-gray-500 btn-sm">
            {expandida ? <CaretUpIcon size={16} /> : <CaretDownIcon size={16} />}
          </button>
        </div>
      </div>

      {/* Miniaturas preview (cuando cerrado) */}
      {!expandida && videos.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {videos.slice(0, 5).map(v => {
            const thumb = getYoutubeThumbnail(v.url_video)
            return (
              <div key={v.id}
                onClick={() => { setExpandida(true); setVideoActivo(v) }}
                className="w-20 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                {thumb
                  ? <img src={thumb} alt={v.titulo} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-400"><PlayCircleIcon size={20} /></div>
                }
              </div>
            )
          })}
          {videos.length > 5 && (
            <div className="w-20 h-12 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs text-gray-500 font-medium cursor-pointer"
              onClick={() => setExpandida(true)}>
              +{videos.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Lista expandida de videos */}
      {expandida && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          {videos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Sin videos. Desde Recursos usa "Agregar a lista".
            </p>
          ) : (
            videos.map(v => (
              <CardVideo
                key={v.id}
                recurso={v}
                esDirector={esDirector}
                onPlay={setVideoActivo}
                onQuitar={(videoId) => quitarVideoDeList(lista.id, videoId)}
              />
            ))
          )}
        </div>
      )}

      {/* Lightbox */}
      {videoActivo && (
        <LightboxVideo recurso={videoActivo} onClose={() => setVideoActivo(null)} />
      )}

      {/* Confirm eliminar lista */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in">
            <h3 className="font-semibold text-gray-900 mb-2">¿Eliminar lista?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Se eliminará <strong>{lista.nombre}</strong>. Los videos no se borran.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setConfirmDel(false)}>Cancelar</button>
              <button className="btn-danger flex-1" onClick={() => { onEliminar(lista.id); setConfirmDel(false) }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Listas() {
  const { listas, crearLista, editarLista, eliminarLista } = useListas()
  const { recursos } = useRecursos()
  const { esDirector } = useAuth()

  const [modalLista, setModalLista] = useState(null) // null | 'nueva' | {lista}

  const handleSave = (form) => {
    if (modalLista === 'nueva') {
      crearLista(form)
    } else {
      editarLista(modalLista.id, form)
    }
  }

  // Solo videos para mostrar conteo global
  const totalVideos = recursos.filter(r => r.tipo === 'video').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Listas</h1>
          <p className="page-subtitle">
            {listas.length} lista{listas.length !== 1 ? 's' : ''} · {totalVideos} video{totalVideos !== 1 ? 's' : ''} disponibles
          </p>
        </div>
        {esDirector && (
          <button className="btn-primary" onClick={() => setModalLista('nueva')}>
            <PlusIcon size={16} /> Nueva lista
          </button>
        )}
      </div>

      {listas.length === 0 ? (
        <div className="card text-center py-16">
          <MusicNotesSimpleIcon size={48} className="mx-auto mb-3 text-primary-300" />
          <p className="text-gray-500">No hay listas creadas</p>
          <p className="text-sm text-gray-400 mt-1">
            Crea una lista y luego agrega videos desde Recursos
          </p>
          {esDirector && (
            <button className="btn-primary mt-4" onClick={() => setModalLista('nueva')}>
              <PlusIcon size={16} /> Crear la primera lista
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {[...listas].sort((a, b) => (b.ensayo ? 1 : 0) - (a.ensayo ? 1 : 0)).map(lista => (
            <CardLista
              key={lista.id}
              lista={lista}
              recursos={recursos}
              esDirector={esDirector}
              onEditar={setModalLista}
              onEliminar={eliminarLista}
            />
          ))}
        </div>
      )}

      {modalLista && (
        <ModalLista
          lista={modalLista === 'nueva' ? null : modalLista}
          onClose={() => setModalLista(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
