import { workflow, node, trigger, sticky, languageModel, outputParser, expr } from '@n8n/workflow-sdk';

const revisarDiario = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Revisar cada dia a las 07:00',
    parameters: {
      rule: {
        interval: [
          { field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }
        ]
      }
    },
    position: [0, 0]
  },
  output: [{}]
});

const buscarCorreos = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Buscar correos del colegio',
    parameters: {
      resource: 'message',
      operation: 'getAll',
      returnAll: true,
      simple: false,
      filters: {
        q: 'from:(cynthiaargandona@almenar.cl OR franbravo@almenar.cl)',
        readStatus: 'both',
        receivedAfter: expr('{{ $now.minus(26, "hours").toISO() }}')
      },
      options: { downloadAttachments: false }
    },
    credentials: { gmailOAuth2: { id: 'o7zgkcSK3TETNTZv', name: 'Gmail account' } },
    position: [220, 0]
  },
  output: [
    {
      id: '19a1f0c2b3d4e5f6',
      threadId: '19a1f0c2b3d4e5f6',
      subject: 'Salida pedagogica Kinder A',
      from: { text: 'Cynthia Argandona <cynthiaargandona@almenar.cl>' },
      date: '2026-08-24T13:05:00.000Z',
      text: 'Estimados apoderados, el jueves 28 de agosto realizaremos la salida pedagogica. Favor enviar la autorizacion firmada antes del martes 26.'
    }
  ]
});

const prepararCorreos = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Preparar correos para el resumen',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode:
        'const items = $input.all();\n' +
        'const bloques = [];\n' +
        'let totalKinder = 0;\n' +
        'let totalCuarto = 0;\n' +
        'for (const item of items) {\n' +
        '  const j = item.json;\n' +
        '  const fromObj = j.from || {};\n' +
        '  const fromValue = Array.isArray(fromObj.value) && fromObj.value[0] ? fromObj.value[0].address : "";\n' +
        '  const fromText = j.From || fromObj.text || fromValue || "";\n' +
        '  const fromLower = String(fromText).toLowerCase();\n' +
        '  let curso = "Sin identificar";\n' +
        '  if (fromLower.indexOf("cynthiaargandona") !== -1) {\n' +
        '    curso = "Kinder A - Agustin";\n' +
        '    totalKinder = totalKinder + 1;\n' +
        '  } else if (fromLower.indexOf("franbravo") !== -1) {\n' +
        '    curso = "4to B - Olivia";\n' +
        '    totalCuarto = totalCuarto + 1;\n' +
        '  }\n' +
        '  const asunto = j.Subject || j.subject || "(sin asunto)";\n' +
        '  let fecha = j.date || "";\n' +
        '  if (!fecha && j.internalDate) { fecha = new Date(Number(j.internalDate)).toISOString(); }\n' +
        '  let cuerpo = j.text || j.snippet || "";\n' +
        '  if (!cuerpo && j.html) { cuerpo = String(j.html).replace(/<[^>]+>/g, " "); }\n' +
        '  cuerpo = String(cuerpo)\n' +
        '    .replace(/\\r/g, "")\n' +
        '    .replace(/[ \\t]+/g, " ")\n' +
        '    .replace(/\\n{3,}/g, "\\n\\n")\n' +
        '    .trim()\n' +
        '    .slice(0, 4000);\n' +
        '  bloques.push(\n' +
        '    "### CORREO " + (bloques.length + 1) +\n' +
        '    "\\nCurso: " + curso +\n' +
        '    "\\nDe: " + fromText +\n' +
        '    "\\nFecha: " + fecha +\n' +
        '    "\\nAsunto: " + asunto +\n' +
        '    "\\nContenido:\\n" + cuerpo\n' +
        '  );\n' +
        '}\n' +
        'return [{\n' +
        '  json: {\n' +
        '    total: items.length,\n' +
        '    totalKinder: totalKinder,\n' +
        '    totalCuarto: totalCuarto,\n' +
        '    correos: bloques.join("\\n\\n")\n' +
        '  }\n' +
        '}];'
    },
    position: [440, 0]
  },
  output: [
    {
      total: 1,
      totalKinder: 1,
      totalCuarto: 0,
      correos: '### CORREO 1\nCurso: Kinder A - Agustin\nDe: Cynthia Argandona <cynthiaargandona@almenar.cl>\nFecha: 2026-08-24T13:05:00.000Z\nAsunto: Salida pedagogica Kinder A\nContenido:\nEstimados apoderados...'
    }
  ]
});

const modeloResumen = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: {
    name: 'Modelo OpenRouter',
    parameters: {
      model: 'anthropic/claude-sonnet-4.6',
      options: { temperature: 0.2, maxRetries: 2 }
    },
    credentials: { openRouterApi: { id: 'bZDl6rzCKZZQsTQX', name: 'OpenRouter account' } },
    position: [660, 200]
  }
});

const generarResumen = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Generar resumen diario',
    parameters: {
      promptType: 'define',
      text: expr(
        'Eres un asistente que ayuda a un apoderado del Colegio Almenar a estar al dia con los correos del colegio.\n' +
        '\n' +
        'CONTEXTO DE LOS REMITENTES\n' +
        '- cynthiaargandona@almenar.cl (Cynthia Argandona): profesora de Kinder A. Ese es el curso de AGUSTIN.\n' +
        '- franbravo@almenar.cl (Fran Bravo): profesora de 4to B. Ese es el curso de OLIVIA.\n' +
        '\n' +
        'CORREOS RECIBIDOS EN LAS ULTIMAS 24 HORAS ({{ $json.total }} en total: {{ $json.totalKinder }} de Kinder A y {{ $json.totalCuarto }} de 4to B):\n' +
        '\n' +
        '{{ $json.correos }}\n' +
        '\n' +
        'TAREA\n' +
        'Redacta un resumen en espanol de Chile, claro y breve, dirigido al apoderado. Organizalo en dos bloques: primero "Kinder A - Agustin" y despues "4to B - Olivia". Si un curso no tiene correos en este periodo, escribe "Sin novedades" en ese bloque.\n' +
        '\n' +
        'Para cada curso incluye estas cuatro secciones, en este orden:\n' +
        '1. Temas mas importantes: lo esencial de cada correo, en vinetas cortas.\n' +
        '2. Compromisos: lo que el colegio se comprometio a hacer y lo que se comprometio o se pide a la familia.\n' +
        '3. Fechas clave: cada fecha mencionada en formato dd-mm-aaaa seguida de a que corresponde. Si el correo dice solo un dia de la semana o una fecha relativa, indicalo tal como aparece y agrega "(fecha relativa segun el correo)".\n' +
        '4. Acciones a realizar: lista de tareas concretas para el apoderado, cada una empezando con un verbo y con su plazo entre parentesis cuando exista.\n' +
        '\n' +
        'REGLAS\n' +
        '- No inventes informacion. Si un dato no aparece en los correos, escribe "No especificado".\n' +
        '- No repitas el correo completo, resume.\n' +
        '- Si un correo pide dinero, materiales, autorizaciones o firmas, ese punto va SIEMPRE en "Acciones a realizar".\n' +
        '- Si hay algo urgente para hoy o manana, marcalo con el prefijo "URGENTE:".\n' +
        '\n' +
        'FORMATO DE SALIDA\n' +
        'Responde SOLO con un fragmento HTML, sin bloques de codigo ni texto adicional antes o despues. Usa <h2> para cada curso, <h3> para cada seccion, <ul> y <li> para las vinetas y <strong> para destacar fechas y plazos. Antes del primer <h2> agrega un parrafo <p> de una o dos frases con lo mas importante del dia.'
      ),
      batching: { batchSize: 1, delayBetweenBatches: 0 }
    },
    subnodes: { model: modeloResumen },
    position: [660, 0]
  },
  output: [
    { text: '<p>Hoy hay una autorizacion pendiente para Kinder A.</p><h2>Kinder A - Agustin</h2><h3>Temas mas importantes</h3><ul><li>Salida pedagogica el jueves 28-08-2026.</li></ul>' }
  ]
});

const enviarResumen = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar resumen por correo',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'cristian0907@gmail.com',
      subject: expr('Resumen colegio Almenar - {{ $now.setZone("America/Santiago").toFormat("dd-MM-yyyy") }}'),
      emailType: 'html',
      message: expr(
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222">\n' +
        '{{ $json.text ?? $json.output ?? "" }}\n' +
        '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0">\n' +
        '<p style="font-size:12px;color:#777">Resumen automatico de los correos de cynthiaargandona@almenar.cl (Kinder A - Agustin) y franbravo@almenar.cl (4to B - Olivia) recibidos en las ultimas 24 horas. Generado el {{ $now.setZone("America/Santiago").toFormat("dd-MM-yyyy HH:mm") }}.</p>\n' +
        '</div>'
      ),
      options: { appendAttribution: false, senderName: 'Resumen Colegio Almenar' }
    },
    credentials: { gmailOAuth2: { id: 'o7zgkcSK3TETNTZv', name: 'Gmail account' } },
    position: [880, 0]
  },
  output: [{ id: '19a2b3c4d5e6f708', threadId: '19a2b3c4d5e6f708', labelIds: ['SENT'] }]
});

const leerAuto = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Leer auto.js publicado',
    executeOnce: true,
    parameters: {
      method: 'GET',
      url: 'https://raw.githubusercontent.com/keepsync-hub/ks-almenar/main/docs/auto.js',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: { parameters: [{ name: 'cb', value: expr('{{ $now.toMillis() }}') }] },
      options: {
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'text', outputPropertyName: 'contenido' } },
        timeout: 20000
      }
    },
    position: [660, 420]
  },
  output: [{ statusCode: 200, body: 'const PORTAL_AUTO = { "generado": null, "eventos": [] };' }]
});

const leerData = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Leer data.js publicado',
    executeOnce: true,
    parameters: {
      method: 'GET',
      url: 'https://raw.githubusercontent.com/keepsync-hub/ks-almenar/main/docs/data.js',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: { parameters: [{ name: 'cb', value: expr('{{ $now.toMillis() }}') }] },
      options: {
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'text', outputPropertyName: 'contenido' } },
        timeout: 20000
      }
    },
    position: [770, 540]
  },
  output: [{ statusCode: 200, body: 'const PORTAL = { eventos: [] };' }]
});

const modeloExtractor = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: {
    name: 'Modelo extractor',
    parameters: { model: 'anthropic/claude-sonnet-4.6', options: { temperature: 0, maxRetries: 2 } },
    credentials: { openRouterApi: { id: 'bZDl6rzCKZZQsTQX', name: 'OpenRouter account' } },
    position: [880, 660]
  }
});

const parserNovedades = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Parser de novedades',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample:
        '{\n' +
        '  "eventos": [{ "fecha": "2026-09-05", "curso": "cuartob", "titulo": "Salida pedagogica", "tipo": "Actividad", "detalle": "Descripcion breve.", "hora": "08:30", "lugar": "Gimnasio", "accion": "Firmar autorizacion", "origen": "Francisca Bravo - 05-09-2026" }],\n' +
        '  "recordatorios": [{ "curso": "cuartob", "texto": "Firmar la autorizacion", "prioridad": "alta", "nota": "Contexto adicional.", "vence": "2026-09-04", "origen": "Francisca Bravo - 05-09-2026" }],\n' +
        '  "evaluaciones": [{ "fecha": "2026-09-22", "curso": "cuartob", "asignatura": "Matematica", "titulo": "Prueba de fracciones", "formato": "Prueba escrita", "estado": "proxima", "detalle": "Contenidos que entran.", "origen": "Francisca Bravo - 05-09-2026" }]\n' +
        '}'
    },
    position: [1060, 660]
  }
});

const extraerNovedades = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Extraer novedades',
    executeOnce: true,
    parameters: {
      promptType: 'define',
      hasOutputParser: true,
      text: expr(
        'Extrae SOLO las novedades que todavia no estan publicadas en el portal del colegio. Lo ven TODOS los apoderados de los cursos.\n' +
        '\n' +
        'Hoy es {{ $now.setZone("America/Santiago").toFormat("dd-MM-yyyy") }}.\n' +
        '\n' +
        'CURSOS (usa exactamente estas claves en el campo "curso"):\n' +
        '- "kinder" para los correos de cynthiaargandona@almenar.cl (Kinder A)\n' +
        '- "cuartob" para los correos de franbravo@almenar.cl (4 B)\n' +
        '\n' +
        '=== YA PUBLICADO EN EL PORTAL - NO LO REPITAS ===\n' +
        '\n' +
        'Lo que sigue ya esta en el portal. Si una actividad, recordatorio o evaluacion ya aparece aca, NO la incluyas en tu respuesta, AUNQUE en el correo este redactada de otra forma. Compara por el hecho concreto (misma actividad, misma fecha, misma tarea), no por las palabras.\n' +
        '\n' +
        '--- Contenido curado a mano (data.js) ---\n' +
        '{{ $("Leer data.js publicado").first().json.body ?? $("Leer data.js publicado").first().json.contenido ?? "" }}\n' +
        '\n' +
        '--- Novedades detectadas en dias anteriores (auto.js) ---\n' +
        '{{ $("Leer auto.js publicado").first().json.body ?? $("Leer auto.js publicado").first().json.contenido ?? "" }}\n' +
        '\n' +
        '=== CORREOS DE HOY ===\n' +
        '\n' +
        '{{ $("Preparar correos para el resumen").first().json.correos }}\n' +
        '\n' +
        '=== QUE EXTRAER ===\n' +
        '- eventos: actividades con fecha concreta futura (salidas, presentaciones, jeans day, ferias, celebraciones).\n' +
        '- recordatorios: acciones que debe hacer la familia (enviar dinero, firmar, mandar materiales, preparar algo). Prioridad: "urgente", "alta", "media" o "habito".\n' +
        '- evaluaciones: pruebas, disertaciones o trabajos evaluados con fecha.\n' +
        '\n' +
        '=== REGLAS DURAS ===\n' +
        '1. NO INVENTES FECHAS. Si el correo no da una fecha concreta, usa null en "fecha". Nunca deduzcas un ano o un dia que no aparezca.\n' +
        '2. Convierte las fechas al formato AAAA-MM-DD. El ano en curso es 2026.\n' +
        '3. El campo "tipo" debe ser EXACTAMENTE uno de estos: "Actividad", "Presentacion", "Proyecto", "Actividad evaluada", "Reunion". Nunca repitas ahi el titulo.\n' +
        '4. NO incluyas informacion de un nino en particular: rubricas individuales, notas, felicitaciones personales, situaciones de salud o conducta de un alumno identificable. El portal es publico y lo leen otras familias. Si el correo va dirigido a una familia especifica, ignoralo por completo.\n' +
        '5. Solo lo que sirve de aca en adelante. Si algo ya ocurrio y no deja tarea pendiente, no lo incluyas.\n' +
        '6. Si no hay nada nuevo que agregar, devuelve los tres arreglos vacios. Es el resultado esperado la mayoria de los dias y es preferible a repetir o rellenar.\n' +
        '7. En "origen" pon el nombre de quien envio el correo y su fecha.\n' +
        '8. Se breve en "detalle": una o dos frases.\n' +
        '9. Usa null, no cadenas vacias, para los campos que no apliquen.'
      )
    },
    subnodes: { model: modeloExtractor, outputParser: parserNovedades },
    position: [880, 420]
  },
  output: [{ output: { eventos: [], recordatorios: [], evaluaciones: [] } }]
});

const fusionarNovedades = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Fusionar novedades',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode:
        'const NL = String.fromCharCode(10);\n' +
        'const LIMITE_DIAS = 45;\n' +
        'const HOY = new Date();\n' +
        '\n' +
        'function normalizar(t) {\n' +
        '  return String(t || "")\n' +
        '    .toLowerCase()\n' +
        '    .normalize("NFD")\n' +
        '    .replace(/[\\u0300-\\u036f]/g, "")\n' +
        '    .replace(/[^a-z0-9]+/g, "-")\n' +
        '    .replace(/^-+|-+$/g, "");\n' +
        '}\n' +
        '\n' +
        'function clave(x) {\n' +
        '  return [x.curso || "", x.fecha || "", normalizar(x.titulo || x.texto)].join("|");\n' +
        '}\n' +
        '\n' +
        'function vigente(x) {\n' +
        '  if (!x.fecha) { return true; }\n' +
        '  const p = String(x.fecha).split("-");\n' +
        '  const f = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));\n' +
        '  if (isNaN(f.getTime())) { return true; }\n' +
        '  return (HOY - f) / 86400000 <= LIMITE_DIAS;\n' +
        '}\n' +
        '\n' +
        'function fusionarListas(previas, nuevas) {\n' +
        '  const vistos = {};\n' +
        '  const salida = [];\n' +
        '  (previas || []).forEach(function (x) {\n' +
        '    if (!vigente(x)) { return; }\n' +
        '    vistos[clave(x)] = true;\n' +
        '    salida.push(x);\n' +
        '  });\n' +
        '  (nuevas || []).forEach(function (x) {\n' +
        '    if (!x || (!x.titulo && !x.texto)) { return; }\n' +
        '    const k = clave(x);\n' +
        '    if (vistos[k]) { return; }\n' +
        '    vistos[k] = true;\n' +
        '    if (x.texto && !x.id) { x.id = "auto-" + k; }\n' +
        '    salida.push(x);\n' +
        '  });\n' +
        '  salida.sort(function (a, b) {\n' +
        '    return String(a.fecha || "9999-99-99").localeCompare(String(b.fecha || "9999-99-99"));\n' +
        '  });\n' +
        '  return salida;\n' +
        '}\n' +
        '\n' +
        'const resp = $("Leer auto.js publicado").first().json;\n' +
        'const status = resp.statusCode !== undefined ? Number(resp.statusCode) : 200;\n' +
        '\n' +
        'let crudo = "";\n' +
        'if (typeof resp.contenido === "string") { crudo = resp.contenido; }\n' +
        'else if (typeof resp.body === "string") { crudo = resp.body; }\n' +
        'else if (resp.body && typeof resp.body.contenido === "string") { crudo = resp.body.contenido; }\n' +
        'else if (typeof resp.data === "string") { crudo = resp.data; }\n' +
        '\n' +
        'if (status !== 200 || !crudo) {\n' +
        '  return [{ json: { cambio: false, motivo: "No se pudo leer auto.js (status " + status + "). No se escribe nada." } }];\n' +
        '}\n' +
        '\n' +
        'let previo = null;\n' +
        'try {\n' +
        '  const i = crudo.indexOf("{");\n' +
        '  const j = crudo.lastIndexOf("}");\n' +
        '  previo = JSON.parse(crudo.slice(i, j + 1));\n' +
        '} catch (e) {\n' +
        '  return [{ json: { cambio: false, motivo: "auto.js no se pudo parsear: " + e.message } }];\n' +
        '}\n' +
        '\n' +
        'const extraido = $input.first().json;\n' +
        'const nuevas = extraido.output || extraido;\n' +
        '\n' +
        'const eventos = fusionarListas(previo.eventos, nuevas.eventos);\n' +
        'const recordatorios = fusionarListas(previo.recordatorios, nuevas.recordatorios);\n' +
        'const evaluaciones = fusionarListas(previo.evaluaciones, nuevas.evaluaciones);\n' +
        '\n' +
        'const antes = JSON.stringify([previo.eventos || [], previo.recordatorios || [], previo.evaluaciones || []]);\n' +
        'const despues = JSON.stringify([eventos, recordatorios, evaluaciones]);\n' +
        '\n' +
        'if (antes === despues) {\n' +
        '  return [{ json: { cambio: false, motivo: "Sin novedades: auto.js queda igual, no se hace commit." } }];\n' +
        '}\n' +
        '\n' +
        'const cuerpo = {\n' +
        '  generado: new Date().toISOString(),\n' +
        '  eventos: eventos,\n' +
        '  recordatorios: recordatorios,\n' +
        '  evaluaciones: evaluaciones\n' +
        '};\n' +
        '\n' +
        'const cabecera = "/* GENERADO AUTOMATICAMENTE POR n8n - NO EDITAR A MANO." + NL +\n' +
        '  "   Lo reescribe el workflow Resumen diario correos Colegio Almenar." + NL +\n' +
        '  "   Lo que se edita a mano va en data.js, que n8n nunca toca. */" + NL + NL;\n' +
        '\n' +
        'const contenido = cabecera + "const PORTAL_AUTO = " + JSON.stringify(cuerpo, null, 2) + ";" + NL;\n' +
        '\n' +
        'return [{ json: {\n' +
        '  cambio: true,\n' +
        '  contenido: contenido,\n' +
        '  totales: { eventos: eventos.length, recordatorios: recordatorios.length, evaluaciones: evaluaciones.length }\n' +
        '} }];'
    },
    position: [1100, 420]
  },
  output: [{ cambio: false, motivo: 'Sin novedades: auto.js queda igual, no se hace commit.' }]
});

const soloSiHayCambios = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: 'Solo si hay cambios',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.cambio }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }
        ],
        combinator: 'and'
      }
    },
    position: [1320, 420]
  },
  output: [{ cambio: true, contenido: 'const PORTAL_AUTO = {};' }]
});

const publicarAuto = node({
  type: 'n8n-nodes-base.github',
  version: 1.1,
  config: {
    name: 'Publicar auto.js en GitHub',
    parameters: {
      resource: 'file',
      operation: 'edit',
      authentication: 'oAuth2',
      owner: { __rl: true, mode: 'name', value: 'keepsync-hub' },
      repository: { __rl: true, mode: 'name', value: 'ks-almenar' },
      filePath: 'docs/auto.js',
      binaryData: false,
      fileContent: expr('{{ $json.contenido }}'),
      commitMessage: expr('Portal: novedades del {{ $now.setZone("America/Santiago").toFormat("dd-MM-yyyy") }}'),
      additionalParameters: { branch: { branch: 'main' } }
    },
    credentials: { githubOAuth2Api: { id: 'RpMUyc4ecL1CPsy3', name: 'GitHub OAuth2 API' } },
    position: [1540, 420]
  },
  output: [{ commit: { sha: '816822d' } }]
});

const notaConfiguracion = sticky(
  '## Resumen diario de correos del colegio\n\n' +
  'Corre todos los dias a las 07:00 (zona horaria America/Santiago, definida en Settings del workflow).\n\n' +
  'Busca en Gmail los correos de **cynthiaargandona@almenar.cl** (Kinder A - Agustin) y **franbravo@almenar.cl** (4to B - Olivia) recibidos en las ultimas 26 horas, los resume con IA y envia el resultado a cristian0907@gmail.com.\n\n' +
  'Si no llego ningun correo de esos remitentes, el workflow termina sin enviar nada.\n\n' +
  '### Credencial\n' +
  'Usa **Gmail account** (`o7zgkcSK3TETNTZv`), verificada el 25-08-2026 como cristian0907@gmail.com.\n\n' +
  'OJO: la otra credencial de la instancia, `Gmail OAuth2 API`, apunta a cristian.molina@keepsync.ai. No usarla aqui.\n\n' +
  '### Dos ramas\n' +
  '1. **Correo**: genera el resumen y lo envia.\n' +
  '2. **Portal**: extrae novedades y reescribe `docs/auto.js` en GitHub, lo que republica GitHub Pages.\n\n' +
  'La rama del portal NUNCA toca `data.js`: eso es lo curado a mano. Si no hay novedades reales, no hace commit.\n\n' +
  '### Ajustes\n' +
  'Hora: Schedule Trigger. Destinatario: campo "To" del nodo de envio. Remitentes vigilados: parametro Search del nodo de busqueda.',
  [revisarDiario, buscarCorreos],
  { color: 4 }
);

export default workflow('resumen-colegio-almenar', 'Resumen diario correos Colegio Almenar')
  .add(revisarDiario)
  .to(buscarCorreos)
  .to(prepararCorreos)
  .to(generarResumen)
  .to(enviarResumen)
  .add(prepararCorreos)
  .to(leerAuto)
  .to(leerData)
  .to(extraerNovedades)
  .to(fusionarNovedades)
  .to(soloSiHayCambios)
  .to(publicarAuto)
  .add(notaConfiguracion);
