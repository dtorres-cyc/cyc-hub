const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`
  <table><tbody id="table-equipos-body">
    <tr>
      <td>ABC-123</td>
      <td>Excavadora</td>
      <td>Norte</td>
      <td>Contrato</td>
      <td>Constructora XYZ</td>
      <td>CYC</td>
      <td>100</td>
      <td>2026-05-01</td>
      <td>2026-05-01</td>
      <td>2026-05-01</td>
      <td>2026-05-01</td>
    </tr>
  </tbody></table>
`);
const row = dom.window.document.querySelector("tr");
const filters = [ [], [], [], [], ["Constructora XYZ"], [], [], [], [], [], [] ];

let show = true;
filters.forEach((selectedValues, index) => {
    if (selectedValues && selectedValues.length > 0) {
        const valArray = Array.isArray(selectedValues) ? selectedValues : (typeof selectedValues === 'string' ? selectedValues.split(',') : [selectedValues]);
        const cellText = row.cells[index] ? row.cells[index].textContent.trim().toLowerCase() : '';
        const matches = valArray.some(val => cellText.includes(String(val).toLowerCase().trim()));
        if (!matches) {
            show = false;
        }
    }
});
console.log("Show is:", show);
