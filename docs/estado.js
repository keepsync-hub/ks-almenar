/* GENERADO AUTOMATICAMENTE POR n8n - NO EDITAR A MANO.
   Lo reescribe el workflow Resumen diario correos Colegio Almenar en CADA
   corrida, tambien en los dias sin correos del colegio. Es el latido que
   permite distinguir "reviso y no habia nada" de "lleva dias sin correr".

   - revisado:     instante en que corrio el proceso.
   - ventanaDesde: desde que momento busco correos esa corrida. Dice hasta
                   donde alcanza de verdad la revision automatica, en vez de
                   dejarlo escrito a mano en data.js.
   - correos:      cuantos correos del colegio encontro. 0 es un dia tranquilo;
                   null es "no se pudo saber", que no es lo mismo.

   Lo que se edita a mano va en data.js, que n8n nunca toca. */

const PORTAL_ESTADO = {
  "revisado": null,
  "ventanaDesde": null,
  "correos": null
};
