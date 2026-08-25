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
    PORTAL.eventos.forEach(function (ev) {
      if (ev.fecha && visible(ev.curso) && diasHasta(ev.fecha) >= 0) {
        lista.push({ fecha: ev.fecha, titulo: ev.titulo, curso: ev.curso, clase: ev.tipo, hora: ev.hora || null });
      }
    });
    PORTAL.evaluaciones.items.forEach(function (ev) {
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

    var items = PORTAL.eventos.filter(function (ev) { return visible(ev.curso); });

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
    var items = PORTAL.recordatorios
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

    var items = PORTAL.evaluaciones.items
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
  }

  function pintarTodo() {
    pintarRegresiva();
    pintarAgenda();
    pintarRecordatorios();
    pintarEvaluaciones();
  }

  function iniciar() {
    pintarCabecera();
    pintarFuenteOficial();
    pintarTodo();

    Array.prototype.forEach.call(document.querySelectorAll('.filtro__boton'), function (b) {
      b.addEventListener('click', function () {
        aplicarFiltro(b.dataset.curso, b.textContent.trim());
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
