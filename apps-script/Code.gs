/**
 * BandaApp — Google Apps Script (GENÉRICO)
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
      case 'getAll':     return json(getAll(body.entity))
      case 'insert':     return json(insert(body.entity, body.data))
      case 'update':     return json(update(body.entity, body.id, body.data))
      case 'remove':     return json(remove(body.entity, body.id))
      case 'backup':     return json(backup(body))
      case 'testDrive':  return json(testDrive())
      case 'uploadDrive': return json(uploadDrive(body.fileName, body.mimeType, body.base64Data, body.folderId))
      case 'deleteDrive': return json(deleteDrive(body.fileId))
      default:           throw new Error('Acción desconocida: ' + body.action)
    }
  } catch (err) {
    return json({ ok: false, error: err.message })
  }
}

// ── Punto de entrada GET ──────────────────────────────────────
function doGet(e) {
  const SECRET = PropertiesService.getScriptProperties().getProperty('API_SECRET')
  const s = e && e.parameter && e.parameter.secret
  if (SECRET && s !== SECRET) return json({ ok: false, error: 'No autorizado' })
  return json({ ok: true, app: 'BandaApp', version: '2.0', ts: new Date().toISOString() })
}

// ── CRUD genérico ─────────────────────────────────────────────

function getAll(entity) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName(entity))
  if (!hoja) return { ok: true, data: [] }

  const valores = hoja.getDataRange().getValues()
  if (valores.length < 2) return { ok: true, data: [] }

  const headers = valores[0].map(String)
  const data = valores.slice(1).map(function(fila) {
    var obj = {}
    headers.forEach(function(key, i) {
      var val = fila[i]
      if (val === 'true' || val === true || val === 'TRUE') obj[key] = true
      else if (val === 'false' || val === false || val === 'FALSE') obj[key] = false
      else obj[key] = val
    })
    return obj
  })
  return { ok: true, data: data }
}

function insert(entity, data) {
  if (!data || typeof data !== 'object') throw new Error('data requerida')

  const ss     = SpreadsheetApp.getActiveSpreadsheet()
  const nombre = sheetName(entity)
  var   hoja   = ss.getSheetByName(nombre)
  const keys   = Object.keys(data)

  if (!hoja) {
    hoja = ss.insertSheet(nombre)
    hoja.appendRow(keys)
    estilizarEncabezado(hoja, keys.length)
    hoja.setFrozenRows(1)
  } else {
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

  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String)
  const fila    = headers.map(function(h) { return data[h] !== undefined ? data[h] : '' })
  hoja.appendRow(fila)

  return { ok: true, id: data.id || null }
}

function update(entity, id, data) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName(entity))
  if (!hoja) throw new Error('Hoja no encontrada: ' + entity)

  const valores = hoja.getDataRange().getValues()
  const headers = valores[0].map(String)
  const idCol   = headers.indexOf('id')

  for (var i = 1; i < valores.length; i++) {
    const rowId = idCol !== -1 ? String(valores[i][idCol]) : String(valores[i][0])
    if (rowId === String(id)) {
      Object.keys(data).forEach(function(key) {
        const col = headers.indexOf(key)
        if (col !== -1) hoja.getRange(i + 1, col + 1).setValue(data[key])
      })
      return { ok: true }
    }
  }
  return { ok: false, error: 'No encontrado: ' + id }
}

function remove(entity, id) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const hoja = ss.getSheetByName(sheetName(entity))
  if (!hoja) throw new Error('Hoja no encontrada: ' + entity)

  const valores   = hoja.getDataRange().getValues()
  const headers   = valores[0].map(String)
  const activoCol = headers.indexOf('activo')
  const idCol     = headers.indexOf('id')

  for (var i = 1; i < valores.length; i++) {
    const rowId = idCol !== -1 ? String(valores[i][idCol]) : String(valores[i][0])
    if (rowId === String(id)) {
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

function backup(body) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  var   resumen = []
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
    resumen.push(registros.length + ' ' + key)
  })

  return { ok: true, mensaje: 'Backup: ' + resumen.join(', ') }
}

// ── Google Drive ──────────────────────────────────────────────

function testDrive() {
  try {
    const nombre = 'BandaApp - Recursos'
    const folders = DriveApp.getFoldersByName(nombre)
    var folder
    if (folders.hasNext()) {
      folder = folders.next()
    } else {
      folder = DriveApp.createFolder(nombre)
    }
    return {
      ok: true,
      mensaje: 'Carpeta lista: ' + folder.getName(),
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function uploadDrive(fileName, mimeType, base64Data, folderId) {
  try {
    var folder
    if (folderId) {
      folder = DriveApp.getFolderById(folderId)
    } else {
      const nombre  = 'BandaApp - Recursos'
      const folders = DriveApp.getFoldersByName(nombre)
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(nombre)
    }

    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data
    const blob   = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName)
    const file   = folder.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    return {
      ok: true,
      fileId:      file.getId(),
      url:         file.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
      previewUrl:  'https://drive.google.com/file/d/' + file.getId() + '/preview',
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function deleteDrive(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Helpers ───────────────────────────────────────────────────

function sheetName(entity) {
  if (!entity) throw new Error('entity es requerido')
  return entity.charAt(0).toUpperCase() + entity.slice(1)
}

function estilizarEncabezado(hoja, totalCols, soloCol) {
  var rango = soloCol
    ? hoja.getRange(1, soloCol, 1, 1)
    : hoja.getRange(1, 1, 1, totalCols)
  rango.setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold')
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
