import { workflow, node, trigger, sticky, languageModel, expr } from '@n8n/workflow-sdk';

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

const notaConfiguracion = sticky(
  '## Resumen diario de correos del colegio\n\n' +
  'Corre todos los dias a las 07:00 (zona horaria America/Santiago, definida en Settings del workflow).\n\n' +
  'Busca en Gmail los correos de **cynthiaargandona@almenar.cl** (Kinder A - Agustin) y **franbravo@almenar.cl** (4to B - Olivia) recibidos en las ultimas 26 horas, los resume con IA y envia el resultado a cristian0907@gmail.com.\n\n' +
  'Si no llego ningun correo de esos remitentes, el workflow termina sin enviar nada.\n\n' +
  '### Credencial\n' +
  'Usa **Gmail account** (`o7zgkcSK3TETNTZv`), verificada el 25-08-2026 como cristian0907@gmail.com.\n\n' +
  'OJO: la otra credencial de la instancia, `Gmail OAuth2 API`, apunta a cristian.molina@keepsync.ai. No usarla aqui.\n\n' +
  '### Ajustes\n' +
  'Hora: Schedule Trigger. Destinatario: campo "To" del ultimo nodo. Remitentes vigilados: parametro Search del nodo de busqueda.',
  [revisarDiario, buscarCorreos],
  { color: 4 }
);

export default workflow('resumen-colegio-almenar', 'Resumen diario correos Colegio Almenar')
  .add(revisarDiario)
  .to(buscarCorreos)
  .to(prepararCorreos)
  .to(generarResumen)
  .to(enviarResumen)
  .add(notaConfiguracion)
  .group('Resumen diario', [buscarCorreos, prepararCorreos, generarResumen, modeloResumen, enviarResumen], {
    description: 'Busca los correos del colegio, los resume con IA y envia el digest diario'
  });
