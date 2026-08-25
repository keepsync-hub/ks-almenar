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
    EVALUACIONES.forEach(function (ev) {
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

  function pintarAgenda() {
    var cont = document.getElementById('listaAgenda');
    vaciar(cont);

    var items = EVENTOS.filter(function (ev) { return visible(ev.curso); });

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

  var CLAVE_ESTUDIO = 'portal-almenar:diasEstudio';
  var SEMANAS_VISIBLES = 3;
  var DIAS_CABECERA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  var desplazamiento = 0;

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

  function leerDiasEstudio() {
    try {
      var crudo = window.localStorage.getItem(CLAVE_ESTUDIO);
      return crudo ? JSON.parse(crudo) : {};
    } catch (e) {
      return {};
    }
  }

  function guardarDiasEstudio(mapa) {
    try {
      window.localStorage.setItem(CLAVE_ESTUDIO, JSON.stringify(mapa));
    } catch (e) {
      /* Modo privado: la marca vive solo mientras dure la pestaña. */
    }
  }

  var diasEstudio = leerDiasEstudio();

  function podarDiasEstudio() {
    var limite = claveFecha(sumarDias(hoy(), -60));
    var cambio = false;
    Object.keys(diasEstudio).forEach(function (k) {
      if (k < limite) { delete diasEstudio[k]; cambio = true; }
    });
    if (cambio) { guardarDiasEstudio(diasEstudio); }
  }

  function evaluacionesVisibles() {
    return EVALUACIONES.filter(function (ev) { return ev.fecha && visible(ev.curso); });
  }

  function diasEstudioSeleccionados() {
    var claveHoy = claveFecha(hoy());
    return Object.keys(diasEstudio).filter(function (k) { return k >= claveHoy; }).sort();
  }

  function evaluacionesPorDelante() {
    var claveHoy = claveFecha(hoy());
    return evaluacionesVisibles()
      .filter(function (ev) { return ev.estado !== 'realizada' && ev.fecha >= claveHoy; })
      .sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
  }

  // Días marcados que caen entre hoy y la fecha de la evaluación, inclusive.
  function estudioAntesDe(fecha, seleccionados) {
    return seleccionados.filter(function (k) { return k <= fecha; }).length;
  }

  function pintarCalendario() {
    var cont = document.getElementById('calendario');
    if (!cont) { return; }
    vaciar(cont);

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

  // En una celda de calendario "Historia, Geografia y C. Sociales" se parte a
  // mitad de palabra. Cortamos por la primera coma o " y ", que cubre todos los
  // nombres largos que usa el colegio.
  function asignaturaCorta(nombre) {
    return String(nombre || '').split(/,| y /i)[0].trim();
  }

  function celdaDia(fecha, indice, claveHoy, porDia) {
    var k = claveFecha(fecha);
    var celda = document.createElement('button');
    celda.type = 'button';
    celda.className = 'cal__dia' +
      (k < claveHoy ? ' cal__dia--pasado' : '') +
      (k === claveHoy ? ' cal__dia--hoy' : '');
    celda.setAttribute('aria-pressed', String(!!diasEstudio[k]));
    celda.setAttribute('aria-label', fechaLarga(k) + ': marcar como día de estudio');

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
      // En móvil la celda mide ~50px: no cabe ninguna palabra entera, así que
      // se muestran tres letras y el nombre completo queda en el title.
      chip.appendChild(el('span', 'cal__ev-largo', corta));
      chip.appendChild(el('span', 'cal__ev-corto', corta.slice(0, 3)));
      chip.title = ev.asignatura + ' — ' + ev.titulo;
      celda.appendChild(chip);
    });

    celda.addEventListener('click', function () {
      if (diasEstudio[k]) { delete diasEstudio[k]; } else { diasEstudio[k] = true; }
      guardarDiasEstudio(diasEstudio);
      celda.setAttribute('aria-pressed', String(!!diasEstudio[k]));
      pintarPlan();
    });

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

  function pintarPlan() {
    var cont = document.getElementById('plan');
    if (!cont) { return; }
    vaciar(cont);

    var seleccionados = diasEstudioSeleccionados();
    var proximas = evaluacionesPorDelante();

    var caja = el('div', 'plan');
    caja.appendChild(el('h3', 'plan__titulo', 'Plan de estudio'));

    var resumen = el('div', 'plan__resumen');
    resumen.appendChild(el('span', 'chip chip--menta',
      seleccionados.length + (seleccionados.length === 1 ? ' día marcado' : ' días marcados')));
    resumen.appendChild(el('span', 'chip chip--durazno',
      proximas.length + (proximas.length === 1 ? ' evaluación por delante' : ' evaluaciones por delante')));
    caja.appendChild(resumen);

    if (!proximas.length) {
      caja.appendChild(el('div', 'vacio', 'No hay evaluaciones próximas para este filtro.'));
      cont.appendChild(caja);
      return;
    }

    caja.appendChild(el('p', 'plan__aclaracion',
      '"X días antes" cuenta los días que marcaste entre hoy y esa fecha. Se avisa en rojo solo si una evaluación de las próximas dos semanas no tiene ninguno.'));

    var lista = el('ul', 'plan__lista');
    proximas.forEach(function (ev) {
      var antes = estudioAntesDe(ev.fecha, seleccionados);
      var dias = diasHasta(ev.fecha);
      // Marcar en rojo TODO lo que no tenga dias asignados convierte el plan en
      // un muro de alarma. Solo urge lo que esta a menos de dos semanas.
      var urgeSinEstudio = (antes === 0 && dias <= 14);

      var fila = el('li', 'plan__fila' + (urgeSinEstudio ? ' plan__fila--sinestudio' : ''));

      var izq = el('div');
      izq.appendChild(el('div', 'plan__que', ev.asignatura + ' — ' + ev.titulo));
      izq.appendChild(el('div', 'plan__cuando',
        fechaLarga(ev.fecha) + ' · ' + (dias === 0 ? 'es hoy' : 'en ' + dias + (dias === 1 ? ' día' : ' días'))));
      fila.appendChild(izq);

      var der = el('div', 'evento__chips');
      der.appendChild(chipCurso(ev.curso));
      if (antes) {
        der.appendChild(el('span', 'chip chip--menta', antes + (antes === 1 ? ' día antes' : ' días antes')));
      } else {
        der.appendChild(el('span', 'chip ' + (urgeSinEstudio ? 'chip--rosa' : ''), 'sin días marcados'));
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
    var seleccionados = diasEstudioSeleccionados();
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
      thead.appendChild(filaTabla('th', ['Fecha', 'Curso', 'Asignatura', 'Evaluación', 'Faltan', 'Días marcados antes']));
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
          String(estudioAntesDe(ev.fecha, seleccionados))
        ]));
      });
      tabla.appendChild(tbody);
      cont.appendChild(tabla);
    } else {
      cont.appendChild(el('p', null, 'No hay evaluaciones próximas.'));
    }

    cont.appendChild(el('h2', null, 'Días marcados para estudiar'));
    if (seleccionados.length) {
      var ul = document.createElement('ul');
      seleccionados.forEach(function (k) {
        ul.appendChild(el('li', null, fechaLarga(k)));
      });
      cont.appendChild(ul);
    } else {
      cont.appendChild(el('p', null, 'Todavía no hay días marcados.'));
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
    pintarCalendario();
    pintarPlan();
  }

  function iniciar() {
    podarDiasEstudio();
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
