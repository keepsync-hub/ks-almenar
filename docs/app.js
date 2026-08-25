/* Portal Almenar — render y estado. Sin dependencias.
   Todo se calcula contra la fecha real del navegador, así que las cuentas
   regresivas nunca quedan obsoletas aunque data.js no se toque. */

(function () {
  'use strict';

  var CLAVE_ALMACEN = 'portal-almenar:recordatorios';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  var cursoActivo = 'todos';

  /* ---------- utilidades de fecha ---------- */

  function hoy() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // 'AAAA-MM-DD' -> Date local. Evita el corrimiento de un día que produce
  // new Date('2026-08-28'), que se interpreta como UTC.
  function aFecha(texto) {
    if (!texto) { return null; }
    var p = texto.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function diasHasta(texto) {
    var f = aFecha(texto);
    if (!f) { return null; }
    return Math.round((f - hoy()) / 86400000);
  }

  function etiquetaDias(dias) {
    if (dias === 0) { return { numero: 'HOY', unidad: '' }; }
    if (dias === 1) { return { numero: '1', unidad: 'día' }; }
    if (dias < 0)   { return { numero: String(Math.abs(dias)), unidad: Math.abs(dias) === 1 ? 'día atrás' : 'días atrás' }; }
    return { numero: String(dias), unidad: 'días' };
  }

  function fechaLarga(texto) {
    var f = aFecha(texto);
    if (!f) { return 'Fecha por confirmar'; }
    return SEMANA[f.getDay()] + ' ' + f.getDate() + ' de ' + MESES[f.getMonth()] + '. ' + f.getFullYear();
  }

  /* ---------- utilidades varias ---------- */

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) { n.className = clase; }
    if (texto !== undefined && texto !== null) { n.textContent = texto; }
    return n;
  }

  function chipCurso(claveCurso) {
    var c = PORTAL.cursos[claveCurso];
    if (!c) { return el('span', 'chip', 'Sin curso'); }
    return el('span', 'chip chip--' + c.tono, c.nombre);
  }

  function visible(claveCurso) {
    return cursoActivo === 'todos' || cursoActivo === claveCurso;
  }

  /* ---------- fusión con lo que detecta n8n ----------
     data.js lo mantiene una persona; auto.js lo reescribe el workflow diario.
     Ante la misma clave gana SIEMPRE lo curado a mano: así una corrida
     automática no puede pisar el calendario de evaluaciones ni una fecha
     corregida a mano. */

  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function claveItem(x) {
    return [x.curso || '', x.fecha || '', normalizar(x.titulo || x.texto)].join('|');
  }

  function fusionar(curados, automaticos) {
    var vistos = {};
    var salida = [];
    (curados || []).forEach(function (x) {
      vistos[claveItem(x)] = true;
      salida.push(x);
    });
    (automaticos || []).forEach(function (x) {
      var k = claveItem(x);
      if (vistos[k]) { return; }
      vistos[k] = true;
      x.auto = true;
      salida.push(x);
    });
    return salida;
  }

  // Una evaluación con el mismo `ref` que un evento es la misma cosa (la Feria
  // Científica es actividad y evaluación a la vez): en la agenda se muestra solo
  // el evento. Sin `ref`, la evaluación se muestra por derecho propio.
  function evaluacionesFueraDeAgenda(eventos, evaluaciones) {
    var refs = {};
    (eventos || []).forEach(function (e) { if (e.ref) { refs[e.ref] = true; } });
    return (evaluaciones || []).filter(function (ev) { return !(ev.ref && refs[ev.ref]); });
  }

  // Una evaluación pintada con la forma de una tarjeta de agenda.
  function comoEvento(ev) {
    return {
      fecha: ev.fecha,
      curso: ev.curso,
      titulo: ev.asignatura + ' — ' + ev.titulo,
      tipo: 'Evaluación',
      detalle: ev.detalle || ev.formato || '',
      accion: null,
      origen: ev.origen,
      esEvaluacion: true,
      realizada: ev.estado === 'realizada'
    };
  }

  var AUTO = (typeof PORTAL_AUTO !== 'undefined' && PORTAL_AUTO) ? PORTAL_AUTO : {};
  var EVENTOS       = fusionar(PORTAL.eventos, AUTO.eventos);
  var RECORDATORIOS = fusionar(PORTAL.recordatorios, AUTO.recordatorios);
  var EVALUACIONES  = fusionar(PORTAL.evaluaciones.items, AUTO.evaluaciones);

  function vaciar(nodo) {
    while (nodo.firstChild) { nodo.removeChild(nodo.firstChild); }
  }

  function mensajeVacio(texto) {
    var li = el('li');
    li.appendChild(el('div', 'vacio', texto));
    return li;
  }

  /* ---------- almacenamiento local ---------- */

  function leerMarcados() {
    try {
      var crudo = window.localStorage.getItem(CLAVE_ALMACEN);
      return crudo ? JSON.parse(crudo) : {};
    } catch (e) {
      return {};
    }
  }

  function guardarMarcado(id, valor) {
    try {
      var actual = leerMarcados();
      if (valor) { actual[id] = true; } else { delete actual[id]; }
      window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(actual));
    } catch (e) {
      /* Modo privado o almacenamiento bloqueado: el portal sigue funcionando,
         solo que la marca no sobrevive a la recarga. */
    }
  }

  /* ---------- cuenta regresiva ---------- */

  // Lo que viene incluye actividades Y evaluaciones: si la prueba del jueves es
  // lo mas cercano, tiene que salir arriba aunque viva en otra seccion.
  function proximosCombinados(limite) {
    var lista = [];
    EVENTOS.forEach(function (ev) {
      if (ev.fecha && visible(ev.curso) && diasHasta(ev.fecha) >= 0) {
        lista.push({ fecha: ev.fecha, titulo: ev.titulo, curso: ev.curso, clase: ev.tipo, hora: ev.hora || null });
      }
    });
    evaluacionesFueraDeAgenda(EVENTOS, EVALUACIONES).forEach(function (ev) {
      if (ev.fecha && visible(ev.curso) && ev.estado !== 'realizada' && diasHasta(ev.fecha) >= 0) {
        lista.push({ fecha: ev.fecha, titulo: ev.asignatura + ': ' + ev.titulo, curso: ev.curso, clase: 'Evaluación', hora: null });
      }
    });
    lista.sort(function (a, b) { return aFecha(a.fecha) - aFecha(b.fecha); });
    return lista.slice(0, limite);
  }

  function pintarRegresiva() {
    var cont = document.getElementById('listaRegresiva');
    vaciar(cont);

    var proximos = proximosCombinados(4);

    if (!proximos.length) {
      cont.appendChild(el('div', 'vacio', 'No hay actividades próximas para este filtro.'));
      return;
    }

    proximos.forEach(function (ev) {
      var dias = diasHasta(ev.fecha);
      var etiqueta = etiquetaDias(dias);
      var curso = PORTAL.cursos[ev.curso];

      var tarjeta = el('article', 'regresiva__tarjeta');
      tarjeta.style.background = 'var(--' + (curso ? curso.tono : 'papel') + ')';

      tarjeta.appendChild(el('div', 'regresiva__dias', etiqueta.numero));
      if (etiqueta.unidad) { tarjeta.appendChild(el('div', 'regresiva__unidad', etiqueta.unidad)); }
      tarjeta.appendChild(el('div', 'regresiva__titulo', ev.titulo));
      tarjeta.appendChild(el('div', 'regresiva__fecha', fechaLarga(ev.fecha) + (ev.hora ? ' · ' + ev.hora : '')));

      var chipsR = el('div', 'evento__chips');
      chipsR.appendChild(chipCurso(ev.curso));
      chipsR.appendChild(el('span', 'chip', ev.clase));
      tarjeta.appendChild(chipsR);

      cont.appendChild(tarjeta);
    });
  }

  /* ---------- agenda ---------- */

  function tarjetaEvento(ev) {
    var dias = ev.fecha ? diasHasta(ev.fecha) : null;
    var pasado = dias !== null && dias < 0;

    var li = el('li');
    var art = el('article', 'evento' + (pasado ? ' evento--pasado' : '') + (ev.fecha ? '' : ' evento--sinfecha'));

    var curso = PORTAL.cursos[ev.curso];
    var caja = el('div', 'evento__fecha');
    caja.style.background = 'var(--' + (curso ? curso.tono : 'papel-hueso') + ')';

    if (ev.fecha) {
      var f = aFecha(ev.fecha);
      caja.appendChild(el('span', 'evento__dia', String(f.getDate())));
      caja.appendChild(el('span', 'evento__mes', MESES[f.getMonth()]));
      caja.appendChild(el('span', 'evento__semana', SEMANA[f.getDay()]));
    } else {
      caja.appendChild(el('span', 'evento__dia', '?'));
      caja.appendChild(el('span', 'evento__mes', 'por confirmar'));
    }

    var cuerpo = el('div', 'evento__cuerpo');

    var chips = el('div', 'evento__chips');
    chips.appendChild(chipCurso(ev.curso));
    chips.appendChild(el('span', 'chip', ev.tipo));
    if (ev.auto) { chips.appendChild(el('span', 'chip chip--lila', 'Detectado automáticamente')); }
    if (ev.esEvaluacion && !pasado) {
      var enlace = el('a', 'chip chip--menta', 'Planificar estudio');
      enlace.href = '#evaluaciones';
      chips.appendChild(enlace);
    }
    if (dias !== null && dias >= 0 && dias <= 7) {
      chips.appendChild(el('span', 'chip chip--rosa', dias === 0 ? 'Es hoy' : 'En ' + dias + (dias === 1 ? ' día' : ' días')));
    }
    cuerpo.appendChild(chips);

    cuerpo.appendChild(el('h3', 'evento__titulo', ev.titulo));

    if (ev.hora || ev.lugar) {
      var cuando = [];
      if (ev.hora)  { cuando.push(ev.hora); }
      if (ev.lugar) { cuando.push(ev.lugar); }
      cuerpo.appendChild(el('div', 'evento__cuando', cuando.join(' · ')));
    }

    cuerpo.appendChild(el('p', 'evento__detalle', ev.detalle));

    if (ev.nota) {
      cuerpo.appendChild(el('div', 'evento__nota', 'Ojo: ' + ev.nota));
    }

    if (ev.accion && !pasado) {
      cuerpo.appendChild(el('div', 'evento__accion', '→ ' + ev.accion));
    }

    cuerpo.appendChild(el('div', 'evento__origen', 'Fuente: ' + ev.origen));

    art.appendChild(caja);
    art.appendChild(cuerpo);
    li.appendChild(art);
    return li;
  }

  function agendaCompleta() {
    var evaluaciones = evaluacionesFueraDeAgenda(EVENTOS, EVALUACIONES).map(comoEvento);
    return EVENTOS.concat(evaluaciones);
  }

  function pintarAgenda() {
    var cont = document.getElementById('listaAgenda');
    vaciar(cont);

    var items = agendaCompleta().filter(function (ev) { return visible(ev.curso); });

    var futuros = items
      .filter(function (ev) { return ev.fecha && diasHasta(ev.fecha) >= 0; })
      .sort(function (a, b) { return aFecha(a.fecha) - aFecha(b.fecha); });

    var sinFecha = items.filter(function (ev) { return !ev.fecha; });

    var pasados = items
      .filter(function (ev) { return ev.fecha && diasHasta(ev.fecha) < 0; })
      .sort(function (a, b) { return aFecha(b.fecha) - aFecha(a.fecha); });

    var ordenados = futuros.concat(sinFecha).concat(pasados);

    document.getElementById('conteoAgenda').textContent = futuros.length + sinFecha.length;

    if (!ordenados.length) {
      cont.appendChild(mensajeVacio('No hay actividades para este filtro.'));
      return;
    }
    ordenados.forEach(function (ev) { cont.appendChild(tarjetaEvento(ev)); });
  }

  /* ---------- recordatorios ---------- */

  var PESO = { urgente: 0, alta: 1, media: 2, habito: 3 };

  // Ojo: PESO.urgente es 0, que es falsy. Un "|| 9" mandaría lo urgente al
  // final de la lista, justo al revés de lo que se quiere.
  function peso(prioridad) {
    return Object.prototype.hasOwnProperty.call(PESO, prioridad) ? PESO[prioridad] : 9;
  }

  function tarjetaRecordatorio(r, marcados) {
    var li = el('li');
    var label = el('label', 'recordatorio recordatorio--' + r.prioridad);

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'recordatorio__caja';
    input.checked = !!marcados[r.id];
    input.addEventListener('change', function () {
      guardarMarcado(r.id, input.checked);
    });

    var contenido = el('div', 'recordatorio__contenido');
    contenido.appendChild(el('div', 'recordatorio__texto', r.texto));
    if (r.nota) { contenido.appendChild(el('div', 'recordatorio__nota', r.nota)); }

    var meta = el('div', 'recordatorio__meta');
    meta.appendChild(chipCurso(r.curso));
    if (r.prioridad === 'urgente') { meta.appendChild(el('span', 'chip chip--rosa', 'Urgente')); }
    if (r.prioridad === 'habito')  { meta.appendChild(el('span', 'chip chip--menta', 'Hábito diario')); }
    if (r.auto) { meta.appendChild(el('span', 'chip chip--lila', 'Detectado automáticamente')); }
    if (r.vence) {
      var d = diasHasta(r.vence);
      var txt = d < 0 ? 'Venció' : (d === 0 ? 'Vence hoy' : 'Vence en ' + d + (d === 1 ? ' día' : ' días'));
      meta.appendChild(el('span', 'chip chip--durazno', txt));
    }
    contenido.appendChild(meta);
    contenido.appendChild(el('div', 'recordatorio__origen', 'Fuente: ' + r.origen));

    label.appendChild(input);
    label.appendChild(contenido);
    li.appendChild(label);
    return li;
  }

  function pintarRecordatorios() {
    var cont = document.getElementById('listaRecordatorios');
    vaciar(cont);

    var marcados = leerMarcados();
    var items = RECORDATORIOS
      .filter(function (r) { return visible(r.curso); })
      .sort(function (a, b) { return peso(a.prioridad) - peso(b.prioridad); });

    var pendientes = items.filter(function (r) { return !marcados[r.id]; }).length;
    document.getElementById('conteoRecordatorios').textContent = pendientes;

    if (!items.length) {
      cont.appendChild(mensajeVacio('No hay recordatorios para este filtro.'));
      return;
    }
    items.forEach(function (r) { cont.appendChild(tarjetaRecordatorio(r, marcados)); });
  }

  /* ---------- evaluaciones ---------- */

  function pintarFuenteOficial() {
    var cont = document.getElementById('fuenteOficial');
    var f = PORTAL.evaluaciones.fuenteOficial;
    vaciar(cont);

    cont.appendChild(el('h3', 'fuente__titulo', 'El calendario oficial está en ' + f.plataforma));
    cont.appendChild(el('p', null, f.descripcion));

    var p = el('p');
    p.appendChild(document.createTextNode('La tabla de abajo solo recoge lo que apareció explícito en los correos, así que no la uses como calendario completo. '));
    var a = el('a', null, 'Tutorial para revisar el calendario en ' + f.plataforma);
    a.href = f.tutorial;
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));
    cont.appendChild(p);

    if (f.advertencia) {
      cont.appendChild(el('div', 'evento__nota', f.advertencia));
    }

    cont.appendChild(el('div', 'evento__origen', 'Fuente: ' + f.origen));
  }

  function pintarEvaluaciones() {
    var cuerpo = document.getElementById('cuerpoEvaluaciones');
    vaciar(cuerpo);

    var items = EVALUACIONES
      .filter(function (ev) { return visible(ev.curso); })
      .sort(function (a, b) {
        var da = diasHasta(a.fecha), db = diasHasta(b.fecha);
        var fa = da >= 0 ? 0 : 1, fb = db >= 0 ? 0 : 1;
        if (fa !== fb) { return fa - fb; }
        return fa === 0 ? (aFecha(a.fecha) - aFecha(b.fecha)) : (aFecha(b.fecha) - aFecha(a.fecha));
      });

    var proximas = items.filter(function (ev) { return diasHasta(ev.fecha) >= 0; }).length;
    document.getElementById('conteoEvaluaciones').textContent = proximas;

    if (!items.length) {
      var trv = el('tr');
      var tdv = el('td', null, 'No hay evaluaciones registradas para este filtro.');
      tdv.colSpan = 6;
      trv.appendChild(tdv);
      cuerpo.appendChild(trv);
      return;
    }

    items.forEach(function (ev) {
      var realizada = ev.estado === 'realizada';
      var tr = el('tr', realizada ? 'evaluacion--realizada' : '');

      var tdFecha = el('td');
      tdFecha.appendChild(el('strong', null, fechaLarga(ev.fecha)));
      tr.appendChild(tdFecha);

      var tdCurso = el('td');
      tdCurso.appendChild(chipCurso(ev.curso));
      tr.appendChild(tdCurso);

      tr.appendChild(el('td', null, ev.asignatura));

      var tdTitulo = el('td');
      tdTitulo.appendChild(el('strong', null, ev.titulo));
      if (ev.detalle) { tdTitulo.appendChild(el('div', 'recordatorio__nota', ev.detalle)); }
      tdTitulo.appendChild(el('div', 'evento__origen', 'Fuente: ' + ev.origen));
      tr.appendChild(tdTitulo);

      tr.appendChild(el('td', null, ev.formato));

      var tdEstado = el('td');
      tdEstado.appendChild(el('span', 'chip ' + (realizada ? 'chip--menta' : 'chip--durazno'), realizada ? 'Realizada' : 'Próxima'));
      tr.appendChild(tdEstado);

      cuerpo.appendChild(tr);
    });
  }

  /* ---------- calendario de evaluaciones y plan de estudio ---------- */

  var CLAVE_PLAN = 'portal-almenar:planEstudio';
  var SEMANAS_VISIBLES = 3;
  var DIAS_CABECERA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  var desplazamiento = 0;
  var evalActiva = null;

  function claveFecha(d) {
    var m = String(d.getMonth() + 1);
    var dia = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dia.length < 2 ? '0' + dia : dia);
  }

  // Semana chilena: parte el lunes. getDay() devuelve 0 para domingo.
  function lunesDe(fecha) {
    var d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    var dia = d.getDay();
    d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
    return d;
  }

  function sumarDias(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }

  function fechaCorta(iso) {
    var f = aFecha(iso);
    return f ? f.getDate() + ' ' + MESES[f.getMonth()] : iso;
  }

  /* ---------- estado: qué días se estudia para cada evaluación ----------
     planEstudio = { 'AAAA-MM-DD': ['claveEval', ...] }
     Un mismo día puede servir a más de una evaluación, que es lo que pasa
     de verdad cuando hay dos pruebas seguidas. */

  function leerPlanEstudio() {
    try {
      var crudo = window.localStorage.getItem(CLAVE_PLAN);
      return crudo ? JSON.parse(crudo) : {};
    } catch (e) {
      return {};
    }
  }

  function guardarPlanEstudio(mapa) {
    try {
      window.localStorage.setItem(CLAVE_PLAN, JSON.stringify(mapa));
    } catch (e) {
      /* Modo privado: la asignación vive solo mientras dure la pestaña. */
    }
  }

  var planEstudio = leerPlanEstudio();

  function claveEval(ev) {
    return [ev.curso || '', ev.fecha || '', normalizar(ev.titulo)].join('|');
  }

  // La fecha va dentro de la clave, así que se puede podar sin buscar la
  // evaluación original (que quizá ya no existe en los datos).
  function fechaDeClave(clave) {
    return String(clave).split('|')[1] || '';
  }

  function podarPlanEstudio() {
    var limite = claveFecha(sumarDias(hoy(), -60));
    var cambio = false;
    Object.keys(planEstudio).forEach(function (dia) {
      if (dia < limite) {
        delete planEstudio[dia];
        cambio = true;
        return;
      }
      var vivas = planEstudio[dia].filter(function (k) { return fechaDeClave(k) >= limite; });
      if (vivas.length !== planEstudio[dia].length) {
        cambio = true;
        if (vivas.length) { planEstudio[dia] = vivas; } else { delete planEstudio[dia]; }
      }
    });
    if (cambio) { guardarPlanEstudio(planEstudio); }
  }

  function diasDeEvaluacion(clave) {
    return Object.keys(planEstudio)
      .filter(function (dia) { return planEstudio[dia].indexOf(clave) !== -1; })
      .sort();
  }

  function alternarAsignacion(dia, clave) {
    var lista = planEstudio[dia] ? planEstudio[dia].slice() : [];
    var i = lista.indexOf(clave);
    if (i === -1) { lista.push(clave); } else { lista.splice(i, 1); }
    if (lista.length) { planEstudio[dia] = lista; } else { delete planEstudio[dia]; }
    guardarPlanEstudio(planEstudio);
  }

  function totalDiasMarcados() {
    var claveHoy = claveFecha(hoy());
    return Object.keys(planEstudio).filter(function (d) { return d >= claveHoy; }).length;
  }

  function evaluacionesVisibles() {
    return EVALUACIONES.filter(function (ev) { return ev.fecha && visible(ev.curso); });
  }

  function evaluacionesPorDelante() {
    var claveHoy = claveFecha(hoy());
    return evaluacionesVisibles()
      .filter(function (ev) { return ev.estado !== 'realizada' && ev.fecha >= claveHoy; })
      .sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
  }

  function evaluacionPorClave(clave) {
    var encontrada = null;
    EVALUACIONES.forEach(function (ev) {
      if (claveEval(ev) === clave) { encontrada = ev; }
    });
    return encontrada;
  }

  /* ---------- selector de evaluación ---------- */

  function pintarSelectorEvaluaciones() {
    var cont = document.getElementById('selectorEval');
    if (!cont) { return; }
    vaciar(cont);

    var proximas = evaluacionesPorDelante();
    if (!proximas.length) {
      evalActiva = null;
      cont.appendChild(el('div', 'vacio', 'No hay evaluaciones próximas para este filtro.'));
      return;
    }

    var claves = proximas.map(claveEval);
    // Si la activa dejó de existir (cambió el filtro de curso, o ya pasó),
    // se toma la más cercana para que el calendario nunca quede inerte.
    if (!evalActiva || claves.indexOf(evalActiva) === -1) { evalActiva = claves[0]; }

    proximas.forEach(function (ev) {
      var k = claveEval(ev);
      var curso = PORTAL.cursos[ev.curso];
      var n = diasDeEvaluacion(k).length;

      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'sel__ev' + (curso ? ' sel__ev--' + curso.tono : '');
      boton.setAttribute('aria-pressed', String(k === evalActiva));

      boton.appendChild(el('span', 'sel__asig', asignaturaCorta(ev.asignatura)));
      boton.appendChild(el('span', 'sel__fecha', fechaCorta(ev.fecha)));
      boton.appendChild(el('span', 'sel__conteo' + (n ? '' : ' sel__conteo--cero'),
        n ? n + (n === 1 ? ' día' : ' días') : 'sin días'));

      boton.title = ev.asignatura + ' — ' + ev.titulo;
      boton.addEventListener('click', function () {
        evalActiva = k;
        pintarSelectorEvaluaciones();
        pintarCalendario();
        pintarPlan();
      });

      cont.appendChild(boton);
    });
  }

  function pintarEncabezadoAsignacion() {
    var cont = document.getElementById('asignandoPara');
    if (!cont) { return; }
    vaciar(cont);

    var ev = evalActiva ? evaluacionPorClave(evalActiva) : null;
    if (!ev) {
      cont.hidden = true;
      return;
    }
    cont.hidden = false;
    cont.appendChild(document.createTextNode('Asignando días de estudio para: '));
    cont.appendChild(el('strong', null, ev.asignatura + ' — ' + ev.titulo));
    cont.appendChild(document.createTextNode(' (' + fechaLarga(ev.fecha) + ').'));
  }

  /* ---------- calendario ---------- */

  // En una celda de calendario "Historia, Geografia y C. Sociales" se parte a
  // mitad de palabra. Cortamos por la primera coma o " y ", que cubre todos los
  // nombres largos que usa el colegio.
  function asignaturaCorta(nombre) {
    return String(nombre || '').split(/,| y /i)[0].trim();
  }

  function pintarCalendario() {
    var cont = document.getElementById('calendario');
    if (!cont) { return; }
    vaciar(cont);
    pintarEncabezadoAsignacion();

    var inicio = sumarDias(lunesDe(hoy()), desplazamiento * SEMANAS_VISIBLES * 7);
    var claveHoy = claveFecha(hoy());

    var porDia = {};
    evaluacionesVisibles().forEach(function (ev) {
      if (!porDia[ev.fecha]) { porDia[ev.fecha] = []; }
      porDia[ev.fecha].push(ev);
    });

    DIAS_CABECERA.forEach(function (d) {
      cont.appendChild(el('div', 'cal__cabecera', d));
    });

    var total = SEMANAS_VISIBLES * 7;
    for (var i = 0; i < total; i++) {
      cont.appendChild(celdaDia(sumarDias(inicio, i), i, claveHoy, porDia));
    }

    var fin = sumarDias(inicio, total - 1);
    document.getElementById('calRango').textContent =
      fechaLarga(claveFecha(inicio)) + ' al ' + fechaLarga(claveFecha(fin));

    avisarEvaluacionesFuera(claveFecha(fin));
  }

  function celdaDia(fecha, indice, claveHoy, porDia) {
    var k = claveFecha(fecha);
    var activa = evalActiva ? evaluacionPorClave(evalActiva) : null;
    var asignadas = planEstudio[k] || [];
    var esDeLaActiva = evalActiva ? asignadas.indexOf(evalActiva) !== -1 : false;

    // Solo tiene sentido estudiar entre hoy y el día de la prueba.
    var asignable = !!activa && k >= claveHoy && k <= activa.fecha;

    var celda = document.createElement('button');
    celda.type = 'button';
    celda.className = 'cal__dia' +
      (k < claveHoy ? ' cal__dia--pasado' : '') +
      (k === claveHoy ? ' cal__dia--hoy' : '') +
      (asignable ? '' : ' cal__dia--bloqueado');
    celda.disabled = !asignable;
    celda.setAttribute('aria-pressed', String(esDeLaActiva));
    celda.setAttribute('aria-label', activa
      ? fechaLarga(k) + ': asignar como día de estudio para ' + activa.asignatura
      : fechaLarga(k));

    var linea = el('div');
    linea.appendChild(el('span', 'cal__num', String(fecha.getDate())));
    if (fecha.getDate() === 1 || indice === 0) {
      linea.appendChild(document.createTextNode(' '));
      linea.appendChild(el('span', 'cal__mes', MESES[fecha.getMonth()]));
    }
    celda.appendChild(linea);

    (porDia[k] || []).forEach(function (ev) {
      var curso = PORTAL.cursos[ev.curso];
      var corta = asignaturaCorta(ev.asignatura);
      var chip = el('span',
        'cal__ev cal__ev--' + (curso ? curso.tono : 'papel') +
        (ev.estado === 'realizada' ? ' cal__ev--realizada' : ''));
      chip.appendChild(el('span', 'cal__ev-largo', corta));
      chip.appendChild(el('span', 'cal__ev-corto', corta.slice(0, 3)));
      chip.title = ev.asignatura + ' — ' + ev.titulo;
      celda.appendChild(chip);
    });

    // Días asignados a OTRAS evaluaciones: se muestran como marcas pequeñas
    // para no perder de vista el plan completo mientras se edita una sola.
    var otras = asignadas.filter(function (c) { return c !== evalActiva; });
    if (otras.length) {
      var fila = el('div', 'cal__asignaciones');
      otras.forEach(function (c) {
        var ev = evaluacionPorClave(c);
        var marca = el('span', 'cal__marca', ev ? asignaturaCorta(ev.asignatura).slice(0, 3) : '?');
        marca.title = ev ? ('Día de estudio para ' + ev.asignatura + ' — ' + ev.titulo) : 'Día de estudio';
        fila.appendChild(marca);
      });
      celda.appendChild(fila);
    }

    if (asignable) {
      celda.addEventListener('click', function () {
        alternarAsignacion(k, evalActiva);
        pintarSelectorEvaluaciones();
        pintarCalendario();
        pintarPlan();
      });
    }

    return celda;
  }

  // Con una ventana de 3 semanas es fácil no ver una prueba de octubre.
  function avisarEvaluacionesFuera(claveFin) {
    var aviso = document.getElementById('calFuera');
    if (!aviso) { return; }
    var claveHoy = claveFecha(hoy());
    var fuera = evaluacionesVisibles()
      .filter(function (ev) {
        return ev.estado !== 'realizada' && ev.fecha > claveFin && ev.fecha >= claveHoy;
      })
      .sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });

    if (!fuera.length) { aviso.hidden = true; return; }
    aviso.hidden = false;
    aviso.textContent = 'Fuera de estas tres semanas quedan ' + fuera.length +
      (fuera.length === 1 ? ' evaluación más. Es el ' : ' evaluaciones más. La siguiente es el ') +
      fechaLarga(fuera[0].fecha) + ', ' + fuera[0].asignatura + '.';
  }

  /* ---------- plan ---------- */

  function pintarPlan() {
    var cont = document.getElementById('plan');
    if (!cont) { return; }
    vaciar(cont);

    var proximas = evaluacionesPorDelante();

    var caja = el('div', 'plan');
    caja.appendChild(el('h3', 'plan__titulo', 'Plan de estudio'));

    var resumen = el('div', 'plan__resumen');
    var total = totalDiasMarcados();
    resumen.appendChild(el('span', 'chip chip--menta',
      total + (total === 1 ? ' día con estudio' : ' días con estudio')));
    resumen.appendChild(el('span', 'chip chip--durazno',
      proximas.length + (proximas.length === 1 ? ' evaluación por delante' : ' evaluaciones por delante')));
    caja.appendChild(resumen);

    if (!proximas.length) {
      caja.appendChild(el('div', 'vacio', 'No hay evaluaciones próximas para este filtro.'));
      cont.appendChild(caja);
      return;
    }

    caja.appendChild(el('p', 'plan__aclaracion',
      'Cada día se asigna a una evaluación concreta. Se avisa en rojo solo si una evaluación de las próximas dos semanas no tiene ningún día asignado.'));

    var lista = el('ul', 'plan__lista');
    proximas.forEach(function (ev) {
      var k = claveEval(ev);
      var dias = diasDeEvaluacion(k);
      var faltan = diasHasta(ev.fecha);
      var urge = (dias.length === 0 && faltan <= 14);

      var fila = el('li', 'plan__fila' + (urge ? ' plan__fila--sinestudio' : '') +
        (k === evalActiva ? ' plan__fila--activa' : ''));

      var izq = el('div');
      izq.appendChild(el('div', 'plan__que', ev.asignatura + ' — ' + ev.titulo));
      izq.appendChild(el('div', 'plan__cuando',
        fechaLarga(ev.fecha) + ' · ' + (faltan === 0 ? 'es hoy' : 'en ' + faltan + (faltan === 1 ? ' día' : ' días'))));
      if (dias.length) {
        izq.appendChild(el('div', 'plan__dias', 'Estudio: ' + dias.map(fechaCorta).join(' · ')));
      }
      fila.appendChild(izq);

      var der = el('div', 'evento__chips');
      der.appendChild(chipCurso(ev.curso));
      if (dias.length) {
        der.appendChild(el('span', 'chip chip--menta',
          dias.length + (dias.length === 1 ? ' día asignado' : ' días asignados')));
      } else {
        der.appendChild(el('span', 'chip ' + (urge ? 'chip--rosa' : ''), 'sin días asignados'));
      }
      fila.appendChild(der);

      lista.appendChild(fila);
    });
    caja.appendChild(lista);
    cont.appendChild(caja);
  }

  /* ---------- versión para imprimir / guardar como PDF ---------- */

  function filaTabla(tag, valores) {
    var tr = document.createElement('tr');
    valores.forEach(function (v) {
      var celda = document.createElement(tag);
      celda.textContent = v;
      tr.appendChild(celda);
    });
    return tr;
  }

  function construirPlanImprimible() {
    var cont = document.getElementById('planImprimible');
    if (!cont) { return; }
    vaciar(cont);

    var claveHoy = claveFecha(hoy());
    var proximas = evaluacionesPorDelante();
    var curso = PORTAL.cursos[cursoActivo];

    cont.appendChild(el('h1', null, 'Plan de estudio'));
    cont.appendChild(el('div', 'sub',
      (cursoActivo === 'todos' ? 'Kínder A y 4° B' : (curso ? curso.nombre : cursoActivo)) +
      ' · generado el ' + fechaLarga(claveHoy)));

    var calendario = document.getElementById('calendario');
    if (calendario) {
      cont.appendChild(el('h2', null, 'Calendario'));
      cont.appendChild(calendario.cloneNode(true));
    }

    cont.appendChild(el('h2', null, 'Evaluaciones por delante'));
    if (proximas.length) {
      var tabla = document.createElement('table');
      var thead = document.createElement('thead');
      thead.appendChild(filaTabla('th', ['Fecha', 'Curso', 'Asignatura', 'Evaluación', 'Faltan', 'Días asignados']));
      tabla.appendChild(thead);

      var tbody = document.createElement('tbody');
      proximas.forEach(function (ev) {
        var dias = diasHasta(ev.fecha);
        tbody.appendChild(filaTabla('td', [
          fechaLarga(ev.fecha),
          (PORTAL.cursos[ev.curso] || {}).nombre || ev.curso,
          ev.asignatura,
          ev.titulo,
          dias === 0 ? 'es hoy' : dias + (dias === 1 ? ' día' : ' días'),
          String(diasDeEvaluacion(claveEval(ev)).length)
        ]));
      });
      tabla.appendChild(tbody);
      cont.appendChild(tabla);
    } else {
      cont.appendChild(el('p', null, 'No hay evaluaciones próximas.'));
    }

    cont.appendChild(el('h2', null, 'Días de estudio por evaluación'));
    var conDias = proximas.filter(function (ev) { return diasDeEvaluacion(claveEval(ev)).length; });
    if (conDias.length) {
      var ul = document.createElement('ul');
      conDias.forEach(function (ev) {
        var dias = diasDeEvaluacion(claveEval(ev));
        var li = document.createElement('li');
        li.appendChild(el('strong', null, ev.asignatura + ' — ' + ev.titulo));
        li.appendChild(document.createTextNode(' (' + fechaLarga(ev.fecha) + '): '));
        li.appendChild(document.createTextNode(dias.map(fechaLarga).join(' · ')));
        ul.appendChild(li);
      });
      cont.appendChild(ul);
    } else {
      cont.appendChild(el('p', null, 'Todavía no hay días asignados a ninguna evaluación.'));
    }

    cont.appendChild(el('p', 'nota',
      'El calendario oficial de evaluaciones vive en Lirmi. Este plan es una ayuda para organizarse; ante cualquier diferencia manda Lirmi y la agenda escolar.'));
  }

  function imprimirPlan() {
    construirPlanImprimible();
    document.body.classList.add('modo-plan');

    function limpiar() {
      document.body.classList.remove('modo-plan');
      window.removeEventListener('afterprint', limpiar);
    }
    window.addEventListener('afterprint', limpiar);
    window.print();
  }

  function aplicarVista(v) {
    var cal = document.getElementById('vistaCalendario');
    var lis = document.getElementById('vistaLista');
    if (cal) { cal.hidden = (v !== 'calendario'); }
    if (lis) { lis.hidden = (v !== 'lista'); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-vista]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.vista === v));
    });
  }

  /* ---------- filtro ---------- */

  function aplicarFiltro(curso, etiquetaTexto) {
    cursoActivo = curso;
    Array.prototype.forEach.call(document.querySelectorAll('.filtro__boton'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.curso === curso));
    });
    document.getElementById('anuncioFiltro').textContent = 'Mostrando: ' + etiquetaTexto;
    pintarTodo();
  }

  /* ---------- arranque ---------- */

  function pintarCabecera() {
    var d = hoy();
    document.getElementById('placaHoy').textContent =
      'Hoy: ' + SEMANA[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + '. ' + d.getFullYear();
    document.getElementById('placaActualizado').textContent =
      'Datos al ' + fechaLarga(PORTAL.actualizado);
    var ventana = document.getElementById('placaVentana');
    if (ventana && PORTAL.ventanaRevisada) { ventana.textContent = PORTAL.ventanaRevisada; }

    var sync = document.getElementById('placaSync');
    if (sync) {
      if (AUTO.generado) {
        var f = new Date(AUTO.generado);
        sync.textContent = 'Última novedad automática: ' +
          SEMANA[f.getDay()] + ' ' + f.getDate() + ' de ' + MESES[f.getMonth()] + '. ' +
          String(f.getHours()).padStart(2, '0') + ':' + String(f.getMinutes()).padStart(2, '0');
      } else {
        sync.textContent = 'Sin novedades automáticas todavía';
      }
    }
  }

  function pintarTodo() {
    pintarRegresiva();
    pintarAgenda();
    pintarRecordatorios();
    pintarEvaluaciones();
    // El selector define la evaluación activa, así que va antes del calendario.
    pintarSelectorEvaluaciones();
    pintarCalendario();
    pintarPlan();
  }

  function iniciar() {
    podarPlanEstudio();
    pintarCabecera();
    pintarFuenteOficial();
    pintarTodo();

    Array.prototype.forEach.call(document.querySelectorAll('.filtro__boton[data-curso]'), function (b) {
      b.addEventListener('click', function () {
        aplicarFiltro(b.dataset.curso, b.textContent.trim());
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-vista]'), function (b) {
      b.addEventListener('click', function () { aplicarVista(b.dataset.vista); });
    });

    document.getElementById('calAtras').addEventListener('click', function () {
      desplazamiento = desplazamiento - 1;
      pintarCalendario();
    });
    document.getElementById('calAdelante').addEventListener('click', function () {
      desplazamiento = desplazamiento + 1;
      pintarCalendario();
    });
    document.getElementById('calHoy').addEventListener('click', function () {
      desplazamiento = 0;
      pintarCalendario();
    });
    document.getElementById('botonPdf').addEventListener('click', imprimirPlan);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
