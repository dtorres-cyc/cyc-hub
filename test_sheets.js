const { getSheetData } = require('./shared/googleSheets');
async function test() {
    try {
        const data = await getSheetData('1C_bqGiH_oMtSB2dhw4AAzDMSrtcSPi7deUqnBwor5AE', "'BBDD Facturas Venta'!A1:Z5");
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}
test();
