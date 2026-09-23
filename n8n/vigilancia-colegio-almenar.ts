import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// Dos avisos para el workflow "Resumen diario correos Colegio Almenar":
//  1. Error Trigger: corre cuando una ejecucion de produccion falla (el
//     workflow principal lo tiene como errorWorkflow en sus settings).
//  2. Schedule 09:00: lee docs/estado.js y avisa si la corrida de las 07:00
//     no dejo latido hoy. Cubre lo que el Error Trigger no ve: un cron que
//     no disparo, un workflow despublicado o n8n caido.

const alFallar = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Cuando falla el resumen', position: [0, 0] },
  output: [{ execution: { id: '663', url: 'https://example/execution/663', lastNodeExecuted: 'Extraer novedades', error: { message: "Model output doesn't fit required format" }, mode: 'trigger' }, workflow: { id: 'p0lab0hPbBHFoLgR', name: 'Resumen diario correos Colegio Almenar' } }]
});

const avisarFalla = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Avisar la falla por correo',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'cristian0907@gmail.com',
      subject: expr('FALLA: Resumen colegio Almenar - {{ $now.setZone("America/Santiago").toFormat("dd-MM-yyyy") }}'),
      emailType: 'html',
      message: expr('<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222">\n<p><strong>La revision diaria de los correos del colegio fallo.</strong></p>\n<ul>\n<li>Workflow: {{ $json.workflow.name }}</li>\n<li>Ejecucion: {{ $json.execution.id }} ({{ $json.execution.mode }})</li>\n<li>Nodo que fallo: <strong>{{ $json.execution.lastNodeExecuted }}</strong></li>\n<li>Error: {{ $json.execution.error.message }}</li>\n</ul>\n<p>Que significa:</p>\n<ul>\n<li>Si fallo un nodo de la rama del portal (Leer auto.js, Leer data.js, Preparar contexto, Extraer novedades, Fusionar novedades, Publicar auto.js), el resumen por correo probablemente salio igual, pero <strong>el portal no quedo con los correos de hoy</strong>. La corrida de manana busca solo desde hoy temprano, asi que esos correos no se van a recuperar solos.</li>\n<li>Si fallo Buscar correos del colegio o Generar resumen, hoy no hubo resumen.</li>\n</ul>\n<p>Revisar la ejecucion: <a href="{{ $json.execution.url }}">{{ $json.execution.url }}</a></p>\n</div>'),
      options: { appendAttribution: false, senderName: 'Vigilancia Colegio Almenar' }
    },
    credentials: { gmailOAuth2: { id: 'o7zgkcSK3TETNTZv', name: 'Gmail account' } },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    position: [260, 0]
  },
  output: [{ id: 'x' }]
});

const revisarLatido = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Comprobar a las 09:00 que corrio',
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 0 }] } },
    position: [0, 300]
  },
  output: [{}]
});

const leerEstado = node({
  type: 'n8n-nodes-base.github',
  version: 1.1,
  config: {
    name: 'Leer estado.js del repo',
    parameters: {
      resource: 'file',
      operation: 'get',
      authentication: 'oAuth2',
      owner: { __rl: true, mode: 'name', value: 'keepsync-hub' },
      repository: { __rl: true, mode: 'name', value: 'ks-almenar' },
      filePath: 'docs/estado.js',
      asBinaryProperty: false,
      additionalParameters: { reference: 'main' }
    },
    credentials: { githubOAuth2Api: { id: 'RpMUyc4ecL1CPsy3', name: 'GitHub OAuth2 API' } },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    onError: 'continueRegularOutput',
    position: [260, 300]
  },
  output: [{ content: 'base64', sha: 'abc' }]
});

const evaluarLatido = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ver si corrio hoy',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `// Devuelve un item solo si hay que avisar. Sin items, no se envia nada.
function decodificar(b64) {
  const limpio = String(b64 || "").replace(/\\s+/g, "");
  if (!limpio) { return ""; }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(limpio, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(limpio)));
}

const j = $input.first() ? $input.first().json : {};
const zona = "America/Santiago";
const hoy = $now.setZone(zona).toFormat("yyyy-MM-dd");

let problema = null;
let revisado = null;

if (j.error || !j.content) {
  problema = "No se pudo leer docs/estado.js desde GitHub" + (j.error ? ": " + (j.error.message || j.error) : ".") + " No se sabe si la revision de las 07:00 corrio.";
} else {
  const texto = decodificar(j.content);
  let estado = null;
  try {
    estado = JSON.parse(texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1));
  } catch (e) {
    problema = "docs/estado.js no se pudo leer: " + e.message;
  }
  if (estado) {
    revisado = estado.revisado || null;
    if (!revisado) {
      problema = "docs/estado.js no tiene ninguna revision registrada.";
    } else {
      const r = DateTime.fromISO(revisado).setZone(zona);
      if (!r.isValid) {
        problema = "docs/estado.js tiene una fecha de revision invalida: " + revisado;
      } else if (r.toFormat("yyyy-MM-dd") !== hoy) {
        problema = "La ultima revision registrada es del " + r.toFormat("dd-MM-yyyy HH:mm") + ". Hoy la revision de las 07:00 no corrio, o no alcanzo a escribir el latido.";
      }
    }
  }
}

if (!problema) { return []; }
return [{ json: { problema: problema, revisado: revisado } }];`
    },
    position: [520, 300]
  },
  output: [{ problema: 'La ultima revision registrada es del 22-09-2026 07:01.', revisado: '2026-09-22T07:01:00-03:00' }]
});

const avisarSinCorrida = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Avisar que no corrio',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'cristian0907@gmail.com',
      subject: expr('SIN REVISION: Resumen colegio Almenar - {{ $now.setZone("America/Santiago").toFormat("dd-MM-yyyy") }}'),
      emailType: 'html',
      message: expr('<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222">\n<p><strong>La revision diaria de los correos del colegio no corrio hoy.</strong></p>\n<p>{{ $json.problema }}</p>\n<p>Revisar en n8n que el workflow <em>Resumen diario correos Colegio Almenar</em> siga publicado y activo, y mirar su ultima ejecucion. Si no corrio, ejecutarlo a mano: busca las ultimas 26 horas.</p>\n</div>'),
      options: { appendAttribution: false, senderName: 'Vigilancia Colegio Almenar' }
    },
    credentials: { gmailOAuth2: { id: 'o7zgkcSK3TETNTZv', name: 'Gmail account' } },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    position: [780, 300]
  },
  output: [{ id: 'x' }]
});

export default workflow('vigilancia-colegio-almenar', 'Vigilancia resumen Colegio Almenar')
  .add(alFallar)
  .to(avisarFalla)
  .add(revisarLatido)
  .to(leerEstado)
  .to(evaluarLatido)
  .to(avisarSinCorrida);
