const router = require('../modules/informe/router');

async function test() {
    const data = await router.getReportDataInternal();
    console.log(data.flota.operatividad);
}

test().catch(console.error);
