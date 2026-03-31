/**
 * BandaApp — Google Apps Script (GENÉRICO)
 * ============================================================
 * NO necesitas editar este archivo para agregar nuevas entidades.
 * Cualquier entidad nueva que uses desde la app se crea
 * automáticamente como hoja en el Sheet.
 *
 * Instalación (una sola vez):
 * 1. Abre Google Sheets → Extensiones → Apps Script
 * 2. Pega este código completo
 * 3. Despliega como Web App:
 *    - Implementar → Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 4. Copia la URL y pégala en la app → Ajustes
 *
 * ¿Quieres una hoja nueva? Solo úsala desde la app con db.insert('miEntidad', datos)
 * y el Sheet la crea automáticamente con las columnas correctas.
 * ============================================================
 */

// ── Punto de entrada POST ─────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)

    const SECRET = PropertiesService.getScriptProperties().getProperty('API_SECRET')
    if (SECRET && body.secret !== SECRET) {
      return json({ ok: false, error: 'No autorizado' })
    }

    switch (body.action) {
      case 'getAll':       return json(getAll(body.entity))
      case 'insert':       return json(insert(body.entity, body.data))
      case 'update':       return json(update(body.entity, body.id, body.data))
      case 'remove':       return json(remove(body.entity, body.id))
      case 'backup':       return json(backup(body))
      case 'uploadDrive':  return json(uploadToDrive(body.fileName, body.mimeType, body.base64Data, body.folderId))
      case 'deleteDrive':  return json(deleteFromDrive(body.fileId))
      case 'testDrive':    return json(testDrive())
      default:             throw new Error('Acción desconocida: ' + body.action)
    }
  } catch (err) {
    return json({ ok: false, error: err.message })
  }
}

// ── Punto de entrada GET (ping / verificar conexión) ──────────
function doGet(e) {
  const SECRET = PropertiesService.getScriptProperties().getProperty('API_SECRET')
  const s = e && e.parameter && e.parameter.secret
  if (SECRET && s !== SECRET) return json({ ok: false, error: 'No autorizado' })
  return json({ ok: true, app: 'BandaApp', version: '2.0', ts: new Date().toISOString() })
}

// ── CRUD genérico ─────────────────────────────────────────────

/**
 * Devuelve todos los registros de una hoja como array de objetos.
 * La fila 1 se usa como nombres de columna (keys).
 */
function getAll(entity) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName(entity))
  if (!hoja) return { ok: true, data: [] }

  const valores = hoja.getDataRange().getValues()
  if (valores.length < 2) return { ok: true, data: [] }

  const headers = valores[0].map(String)
  const data = valores.slice(1).map(function(fila) {
    var obj = {}
    headers.forEach(function(key, i) { obj[key] = fila[i] })
    return obj
  })
  return { ok: true, data: data }
}

/**
 * Inserta un nuevo registro.
 * Si la hoja no existe, la crea con las keys del objeto como encabezados.
 * Si la hoja existe pero faltan columnas, las agrega al final.
 */
function insert(entity, data) {
  if (!data || typeof data !== 'object') throw new Error('data requerida')

  const ss         = SpreadsheetApp.getActiveSpreadsheet()
  const nombre     = sheetName(entity)
  var   hoja       = ss.getSheetByName(nombre)
  const keys       = Object.keys(data)

  if (!hoja) {
    // Crear hoja nueva con los keys como encabezados
    hoja = ss.insertSheet(nombre)
    hoja.appendRow(keys)
    estilizarEncabezado(hoja, keys.length)
    hoja.setFrozenRows(1)
  } else {
    // Agregar columnas faltantes si las hay
    const existentes = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String)
    keys.forEach(function(key) {
      if (existentes.indexOf(key) === -1) {
        const col = hoja.getLastColumn() + 1
        hoja.getRange(1, col).setValue(key)
        estilizarEncabezado(hoja, col, col)
        existentes.push(key)
      }
    })
  }

  // Leer encabezados actualizados y escribir fila
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String)
  const fila    = headers.map(function(h) { return data[h] !== undefined ? data[h] : '' })
  hoja.appendRow(fila)

  return { ok: true, id: data.id || null }
}

/**
 * Actualiza campos de un registro buscando por id (columna 1) o
 * por el campo que tenga el mismo valor que id.
 */
function update(entity, id, data) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName(entity))
  if (!hoja) throw new Error('Hoja no encontrada: ' + entity)

  const valores = hoja.getDataRange().getValues()
  const headers = valores[0].map(String)

  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      Object.keys(data).forEach(function(key) {
        const col = headers.indexOf(key)
        if (col !== -1) hoja.getRange(i + 1, col + 1).setValue(data[key])
      })
      return { ok: true }
    }
  }
  return { ok: false, error: 'No encontrado: ' + id }
}

/**
 * Soft-delete: pone activo=false si existe esa columna.
 * Si no existe, elimina la fila físicamente.
 */
function remove(entity, id) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName(entity))
  if (!hoja) throw new Error('Hoja no encontrada: ' + entity)

  const valores   = hoja.getDataRange().getValues()
  const headers   = valores[0].map(String)
  const activoCol = headers.indexOf('activo')

  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      if (activoCol !== -1) {
        hoja.getRange(i + 1, activoCol + 1).setValue(false)
      } else {
        hoja.deleteRow(i + 1)
      }
      return { ok: true }
    }
  }
  return { ok: false, error: 'No encontrado: ' + id }
}

/**
 * Backup completo: recibe un objeto { entidad: [array], ... }
 * y sobreescribe cada hoja con los datos recibidos.
 * También funciona para entidades nuevas — las crea si no existen.
 */
function backup(body) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  var   total   = 0
  var   resumen = []

  // Ignorar campos de control del request
  const ignorar = ['action', 'secret', 'fecha']

  Object.keys(body).forEach(function(key) {
    if (ignorar.indexOf(key) !== -1) return
    const registros = body[key]
    if (!Array.isArray(registros) || registros.length === 0) return

    const nombre  = sheetName(key)
    var   hoja    = ss.getSheetByName(nombre)
    const headers = Object.keys(registros[0])

    if (!hoja) {
      hoja = ss.insertSheet(nombre)
      estilizarEncabezado(hoja, headers.length)
      hoja.setFrozenRows(1)
    }

    hoja.clearContents()
    hoja.appendRow(headers)
    estilizarEncabezado(hoja, headers.length)

    const filas = registros.map(function(r) {
      return headers.map(function(h) { return r[h] !== undefined ? r[h] : '' })
    })
    hoja.getRange(2, 1, filas.length, headers.length).setValues(filas)

    total += registros.length
    resumen.push(registros.length + ' ' + key)
  })

  return { ok: true, mensaje: 'Backup: ' + resumen.join(', ') }
}

// ── Google Drive ──────────────────────────────────────────────

/**
 * Verifica que el script tenga permisos de Drive.
 * Ejecuta esta función manualmente UNA VEZ desde el editor de Apps Script
 * para que Google muestre la pantalla de autorización de permisos.
 */
function testDrive() {
  try {
    var root = DriveApp.getRootFolder()
    var folders = DriveApp.getFoldersByName('BandaApp - Recursos')
    var folder = folders.hasNext()
      ? folders.next()
      : DriveApp.createFolder('BandaApp - Recursos')
    return {
      ok: true,
      mensaje: 'Drive autorizado. Carpeta: ' + folder.getName(),
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
    }
  } catch (err) {
    return { ok: false, error: 'Sin permiso de Drive: ' + err.message }
  }
}

/**
 * Sube un archivo a la carpeta "BandaApp - Recursos" en Drive.
 * Recibe el archivo en base64 (data URL completa: "data:mime/type;base64,xxx").
 * Retorna la URL pública del archivo para verlo/descargarlo.
 *
 * @param {string} fileName   - Nombre del archivo (ej: "partitura.pdf")
 * @param {string} mimeType   - Tipo MIME (ej: "application/pdf", "image/jpeg")
 * @param {string} base64Data - Data URL completa o base64 puro
 * @param {string} folderId   - (Opcional) ID de carpeta Drive específica
 */
function uploadToDrive(fileName, mimeType, base64Data, folderId) {
  try {
    // Extraer el base64 puro si viene como data URL (data:mime;base64,XXXX)
    var base64Pure = base64Data.indexOf(',') !== -1
      ? base64Data.split(',')[1]
      : base64Data

    var bytes = Utilities.base64Decode(base64Pure)
    var blob  = Utilities.newBlob(bytes, mimeType, fileName)

    // Obtener o crear la carpeta destino
    var folder
    if (folderId) {
      folder = DriveApp.getFolderById(folderId)
    } else {
      var found = DriveApp.getFoldersByName('BandaApp - Recursos')
      folder = found.hasNext() ? found.next() : DriveApp.createFolder('BandaApp - Recursos')
    }

    var file = folder.createFile(blob)

    // Hacer el archivo accesible con enlace (cualquiera con el link puede ver)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    return {
      ok:          true,
      fileId:      file.getId(),
      url:         file.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?id=' + file.getId(),
      previewUrl:  'https://drive.google.com/file/d/' + file.getId() + '/preview',
      name:        file.getName(),
    }
  } catch (err) {
    return { ok: false, error: 'Error al subir a Drive: ' + err.message }
  }
}

/**
 * Elimina un archivo de Drive por su ID.
 */
function deleteFromDrive(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: 'Error al eliminar de Drive: ' + err.message }
  }
}

// ── Helpers ───────────────────────────────────────────────────

/** Convierte el nombre de entidad en nombre de hoja (capitalizado) */
function sheetName(entity) {
  if (!entity) throw new Error('entity es requerido')
  return entity.charAt(0).toUpperCase() + entity.slice(1)
}

/** Aplica estilo morado a los encabezados */
function estilizarEncabezado(hoja, totalCols, soloCol) {
  var rango = soloCol
    ? hoja.getRange(1, soloCol, 1, 1)
    : hoja.getRange(1, 1, 1, totalCols)
  rango.setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold')
}

/** Serializa a JSON y devuelve como ContentService */
function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
