/* Valida docs/data.js, docs/auto.js y docs/estado.js antes de publicar el
   portal. Existe porque los dos ultimos los escribe n8n sin supervision
   humana: si una corrida produce algo malformado, esto detiene el deploy en
   vez de romper el sitio. */

import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const errores = [];
const avisos = [];

// 'colegio' es lo que vale para todo el establecimiento: feriados, actos y
// reuniones. No tiene profesora jefe ni boton de filtro propio.
const CURSOS_VALIDOS = ['kinder', 'cuartob', 'colegio'];
const PRIORIDADES = ['urgente', 'alta', 'media', 'habito'];
const ESTADOS = ['proxima', 'realizada'];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function cargar(ruta, variable) {
  const ctx = {};
  vm.createContext(ctx);
  const fuente = readFileSync(ruta, 'utf8');
  // Las declaraciones const de un script vm no quedan en el contexto, asi que
  // la exponemos a mano.
  vm.runInContext(fuente + '\n;globalThis.__salida = ' + variable + ';', ctx);
  return ctx.__salida;
}

function fechaValida(f, donde) {
  if (f === null || f === undefined) { return; }
  if (typeof f !== 'string' || !RE_FECHA.test(f)) {
    errores.push(donde + ': fecha "' + f + '" no tiene formato AAAA-MM-DD');
    return;
  }
  const [a, m, d] = f.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  if (fecha.getFullYear() !== a || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) {
    errores.push(donde + ': fecha "' + f + '" no existe en el calendario');
  }
}

function texto(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function normalizar(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clave(x) {
  return [x.curso || '', x.fecha || '', normalizar(x.titulo || x.texto)].join('|');
}

function revisarEventos(lista, origen) {
  lista.forEach((ev, i) => {
    const donde = origen + '.eventos[' + i + '] (' + (ev.titulo || 'sin titulo') + ')';
    if (!texto(ev.titulo))  { errores.push(donde + ': falta "titulo"'); }
    if (!texto(ev.detalle)) { errores.push(donde + ': falta "detalle"'); }
    if (!CURSOS_VALIDOS.includes(ev.curso)) {
      errores.push(donde + ': curso "' + ev.curso + '" no es ' + CURSOS_VALIDOS.join(' ni '));
    }
    if (!texto(ev.tipo)) { avisos.push(donde + ': sin "tipo"'); }
    fechaValida(ev.fecha, donde);
    fechaValida(ev.fechaFin || null, donde + ' [fechaFin]');
    if (ev.fechaFin && ev.fecha && ev.fechaFin < ev.fecha) {
      errores.push(donde + ': "fechaFin" (' + ev.fechaFin + ') es anterior a "fecha" (' + ev.fecha + ')');
    }
    if (ev.fechaFin && !ev.fecha) {
      errores.push(donde + ': tiene "fechaFin" pero no "fecha"');
    }
  });
}

function revisarRecordatorios(lista, origen) {
  lista.forEach((r, i) => {
    const donde = origen + '.recordatorios[' + i + '] (' + (r.texto || 'sin texto') + ')';
    if (!texto(r.texto)) { errores.push(donde + ': falta "texto"'); }
    if (!CURSOS_VALIDOS.includes(r.curso)) {
      errores.push(donde + ': curso "' + r.curso + '" invalido');
    }
    if (!PRIORIDADES.includes(r.prioridad)) {
      errores.push(donde + ': prioridad "' + r.prioridad + '" no es una de ' + PRIORIDADES.join(', '));
    }
    fechaValida(r.vence || null, donde + ' [vence]');
    // Un recordatorio sin "vence" no caduca nunca: el portal lo muestra para
    // siempre. Es lo correcto para una regla permanente del curso y un descuido
    // en cualquier otro caso, asi que se avisa sin detener el deploy.
    if (!r.vence) {
      avisos.push(donde + ': sin "vence", no caduca. Confirma que es una regla permanente.');
    }
  });
}

function revisarEvaluaciones(lista, origen) {
  lista.forEach((ev, i) => {
    const donde = origen + '.evaluaciones[' + i + '] (' + (ev.titulo || 'sin titulo') + ')';
    if (!texto(ev.titulo))     { errores.push(donde + ': falta "titulo"'); }
    if (!texto(ev.asignatura)) { errores.push(donde + ': falta "asignatura"'); }
    if (!CURSOS_VALIDOS.includes(ev.curso)) {
      errores.push(donde + ': curso "' + ev.curso + '" invalido');
    }
    // El portal deduce si una evaluacion ya paso mirando la fecha. Escribirlo a
    // mano en data.js solo sirve para que quede viejo, asi que se rechaza. En
    // auto.js se tolera: lo emite el prompt de n8n y rechazarlo cortaria la
    // publicacion diaria sin que nadie pueda arreglarlo desde el repo.
    if (ev.estado && origen === 'data.js') {
      errores.push(donde + ': no lleva "estado", se deduce de la fecha. Quitar el campo.');
    }
    if (ev.estado && !ESTADOS.includes(ev.estado)) {
      errores.push(donde + ': estado "' + ev.estado + '" no es ' + ESTADOS.join(' ni '));
    }
    fechaValida(ev.fecha, donde);
  });
}

function revisarDuplicados(lista, donde) {
  const vistos = new Set();
  lista.forEach((x) => {
    const k = clave(x);
    if (vistos.has(k)) {
      errores.push(donde + ': item duplicado dentro del mismo archivo -> ' + k);
    }
    vistos.add(k);
  });
}

let PORTAL, AUTO, ESTADO;

try {
  PORTAL = cargar('docs/data.js', 'PORTAL');
} catch (e) {
  console.error('No se pudo cargar docs/data.js: ' + e.message);
  process.exit(1);
}

try {
  AUTO = cargar('docs/auto.js', 'PORTAL_AUTO');
} catch (e) {
  console.error('No se pudo cargar docs/auto.js: ' + e.message);
  console.error('Este archivo lo escribe n8n. Revisar la ultima corrida del workflow.');
  process.exit(1);
}

// estado.js es el latido del workflow. Puede no existir todavia (nace con la
// primera corrida que lo escriba), pero si esta y viene roto se detiene igual
// que auto.js: la cabecera del portal lo lee.
if (existsSync('docs/estado.js')) {
  try {
    ESTADO = cargar('docs/estado.js', 'PORTAL_ESTADO');
  } catch (e) {
    console.error('No se pudo cargar docs/estado.js: ' + e.message);
    console.error('Este archivo lo escribe n8n. Revisar la ultima corrida del workflow.');
    process.exit(1);
  }
}

if (!PORTAL || typeof PORTAL !== 'object') { errores.push('data.js: PORTAL no es un objeto'); }
if (!AUTO || typeof AUTO !== 'object')     { errores.push('auto.js: PORTAL_AUTO no es un objeto'); }

if (ESTADO !== undefined) {
  if (!ESTADO || typeof ESTADO !== 'object') {
    errores.push('estado.js: PORTAL_ESTADO no es un objeto');
  } else if (ESTADO.revisado !== null && ESTADO.revisado !== undefined) {
    const marca = new Date(ESTADO.revisado);
    if (typeof ESTADO.revisado !== 'string' || isNaN(marca.getTime())) {
      errores.push('estado.js: "revisado" ("' + ESTADO.revisado + '") no es una fecha que se pueda leer');
    }
  }
}

const evCur = (PORTAL.eventos || []);
const reCur = (PORTAL.recordatorios || []);
const evaCur = ((PORTAL.evaluaciones || {}).items || []);

const evAuto = (AUTO.eventos || []);
const reAuto = (AUTO.recordatorios || []);
const evaAuto = (AUTO.evaluaciones || []);

revisarEventos(evCur, 'data.js');
revisarRecordatorios(reCur, 'data.js');
revisarEvaluaciones(evaCur, 'data.js');
revisarDuplicados(evCur, 'data.js.eventos');
revisarDuplicados(reCur, 'data.js.recordatorios');

revisarEventos(evAuto, 'auto.js');
revisarRecordatorios(reAuto, 'auto.js');
revisarEvaluaciones(evaAuto, 'auto.js');

// Los ids de recordatorio son la llave del "listo" guardado en el navegador:
// si se repiten, dos recordatorios comparten estado.
const ids = new Set();
[...reCur, ...reAuto].forEach((r) => {
  if (!r.id) { return; }
  if (ids.has(r.id)) { errores.push('recordatorio con id repetido: "' + r.id + '"'); }
  ids.add(r.id);
});

console.log('Curado   (data.js): ' + evCur.length + ' eventos, ' + reCur.length + ' recordatorios, ' + evaCur.length + ' evaluaciones');
console.log('Automatico (auto.js): ' + evAuto.length + ' eventos, ' + reAuto.length + ' recordatorios, ' + evaAuto.length + ' evaluaciones');
console.log('Ultima novedad automatica: ' + (AUTO.generado || 'todavia ninguna'));
console.log('Ultima revision automatica: ' + ((ESTADO || {}).revisado || 'sin latido todavia'));

if (avisos.length) {
  console.log('\nAvisos (no detienen la publicacion):');
  avisos.forEach((a) => console.log('  - ' + a));
}

if (errores.length) {
  console.error('\nLa publicacion se detuvo por ' + errores.length + ' error(es):');
  errores.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log('\nDatos validos. Se puede publicar.');
