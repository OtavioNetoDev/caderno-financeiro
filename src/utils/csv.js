const BOM = '\uFEFF';
const SEPARATOR = ';';

function escapeCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Evita que planilhas executem fórmulas (CSV injection).
  if (/^[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }
  return /[";\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR));
  return BOM + lines.join('\r\n') + '\r\n';
}

module.exports = { escapeCell, toCsv };
