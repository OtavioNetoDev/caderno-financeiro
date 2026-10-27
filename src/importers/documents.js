const mammoth = require('mammoth');
const AppError = require('../utils/AppError');
const { parseDocumentText } = require('./statementLines');

const MAX_PAGES = 30;
const MAX_CHARS = 500000;

let pdfjsPromise;
const loadPdfjs = () => {
  pdfjsPromise = pdfjsPromise || import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
};

// Junta os trechos de texto da página em linhas, agrupando pela posição vertical.
function linesFromItems(items) {
  const rows = [];
  for (const item of items) {
    if (typeof item.str !== 'string' || !item.str.trim()) {
      continue;
    }
    const x = item.transform[4];
    const y = item.transform[5];
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, width: item.width || 0, text: item.str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((row) => {
    let text = '';
    let end = null;
    for (const part of row.parts.sort((a, b) => a.x - b.x)) {
      if (end !== null && part.x - end > 1) {
        text += ' ';
      }
      text += part.text;
      end = part.x + part.width;
    }
    return text.replace(/\s+/g, ' ').trim();
  });
}

async function parseDocx(buffer, options = {}) {
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch {
    throw new AppError(400, 'Não foi possível abrir o documento Word');
  }
  return parseDocumentText(result.value, options);
}

async function parsePdf(buffer, options = {}) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy().catch(() => {});
    if (err && err.name === 'PasswordException') {
      throw new AppError(400, 'O PDF está protegido por senha');
    }
    throw new AppError(400, 'Não foi possível ler o PDF');
  }

  try {
    const pages = Math.min(doc.numPages, MAX_PAGES);
    const lines = [];
    for (let number = 1; number <= pages; number += 1) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      lines.push(...linesFromItems(content.items));
    }
    const text = lines.join('\n');
    if (!text.trim()) {
      throw new AppError(
        400,
        'Este PDF não tem texto selecionável (parece escaneado). A leitura de imagens ainda não é suportada.',
      );
    }
    return parseDocumentText(text.slice(0, MAX_CHARS), options);
  } finally {
    await task.destroy();
  }
}

module.exports = { parseDocx, parsePdf };
