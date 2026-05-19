const { buildEmailHtml } = require('./modules/flota/email.js');
const equipos = [
  { tipoMaquinaria: 'Excavadora', marca: 'CAT', modelo: '320', anio: '2020', horometro: '1500', tarifa: '3.5 UF/h' }
];
const html = buildEmailHtml('Juan', 'Empresa', equipos, false, 'Hola', true, {});
require('fs').writeFileSync('test.html', html);
console.log('done');
