/* Valida docs/data.js y docs/auto.js antes de publicar el portal.
   Existe porque auto.js lo escribe n8n sin supervision humana: si una corrida
   produce algo malformado, esto detiene el deploy en vez de romper el sitio. */

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const errores = [];
const avisos = [];

const CURSOS_VALIDOS = ['kinder', 'cuartob'];
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

let PORTAL, AUTO;

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

if (!PORTAL || typeof PORTAL !== 'object') { errores.push('data.js: PORTAL no es un objeto'); }
if (!AUTO || typeof AUTO !== 'object')     { errores.push('auto.js: PORTAL_AUTO no es un objeto'); }

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
