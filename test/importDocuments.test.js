const { test } = require('node:test');
const assert = require('node:assert');
const { parseFile } = require('../src/importers');

// PDF de exemplo (fictício) com três linhas de extrato.
const SAMPLE_PDF = Buffer.from(
  'JVBERi0xLjMKJf////8KNyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgovUmVzb3VyY2VzIDYgMCBSCi9Vc2VyVW5pdCAxCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9Qcm9jU2V0IFsvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJXQovRm9udCA8PAovRjEgOCAwIFIKPj4KL0NvbG9yU3BhY2UgPDwKPj4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCAyMjQKL0ZpbHRlciAvRmxhdGVEZWNvZGUKPj4Kc3RyZWFtCniclZAxTsQwEEV7n2IuQJj588dJpCgFEhR0SO4QBXJwt8Xev0HOhmK1W7DNSP7Ne34mKipPJirjDKmndE52s72UYzQZIaPZ4BOlnNLzm4lBSkufCyOmYIC2ikFlCa5ClYUNSjKgq8S+M8L7XUW/pLyn15I+/gHO8zhEx12DXR1obq5ojv7yDA2nsdICnHeD4BYa6Gwa1A0/Hq6uqPtV+qM+kw/5poOr+x0dParQLn9nhbKy8XuVyw7F5uZA7V6PuuR5GPN0R4aHjNLZjgYG5cYIsFdi7+PTX4kr8i+JQ3AACmVuZHN0cmVhbQplbmRvYmoKMTAgMCBvYmoKKFBERktpdCkKZW5kb2JqCjExIDAgb2JqCihQREZLaXQpCmVuZG9iagoxMiAwIG9iagooRDoyMDI2MTAyNTAyMDcwMVopCmVuZG9iago5IDAgb2JqCjw8Ci9Qcm9kdWNlciAxMCAwIFIKL0NyZWF0b3IgMTEgMCBSCi9DcmVhdGlvbkRhdGUgMTIgMCBSCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvSGVsdmV0aWNhCi9TdWJ0eXBlIC9UeXBlMQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKNCAwIG9iago8PAo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFIKL05hbWVzIDIgMCBSCj4+CmVuZG9iagoxIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovQ291bnQgMQovS2lkcyBbNyAwIFJdCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9EZXN0cyA8PAogIC9OYW1lcyBbCl0KPj4KPj4KZW5kb2JqCnhyZWYKMCAxMwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDA4NzUgMDAwMDAgbiAKMDAwMDAwMDkzMiAwMDAwMCBuIAowMDAwMDAwODEzIDAwMDAwIG4gCjAwMDAwMDA3OTIgMDAwMDAgbiAKMDAwMDAwMDIzOCAwMDAwMCBuIAowMDAwMDAwMTMxIDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDY5NSAwMDAwMCBuIAowMDAwMDAwNjIwIDAwMDAwIG4gCjAwMDAwMDA1MzQgMDAwMDAgbiAKMDAwMDAwMDU1OSAwMDAwMCBuIAowMDAwMDAwNTg0IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgMTMKL1Jvb3QgMyAwIFIKL0luZm8gOSAwIFIKL0lEIFs8NjE0Y2FkNDI5MjRiZWNhNmI3MWFhMjY4MGVkOTRkYmY+IDw2MTRjYWQ0MjkyNGJlY2E2YjcxYWEyNjgwZWQ5NGRiZj5dCj4+CnN0YXJ0eHJlZgo5NzkKJSVFT0YK',
  'base64',
);

test('lê um PDF com texto selecionável', async () => {
  const result = await parseFile({ originalname: 'extrato.pdf', buffer: SAMPLE_PDF }, {});
  assert.strictEqual(result.format, 'pdf');
  assert.strictEqual(result.rows.length, 3);
  assert.deepStrictEqual(
    [result.rows[0].date.slice(5), result.rows[0].amount, result.rows[0].type],
    ['10-02', 150000, 'income'],
  );
  assert.deepStrictEqual([result.rows[1].amount, result.rows[1].type], [1250, 'expense']);
  assert.ok(result.rows[2].flags.includes('tipo a confirmar'));
});

test('recusa PDF corrompido e arquivo disfarçado de PDF', async () => {
  await assert.rejects(
    parseFile({ originalname: 'a.pdf', buffer: Buffer.from('%PDF-1.4 lixo') }, {}),
    { status: 400 },
  );
  await assert.rejects(parseFile({ originalname: 'a.pdf', buffer: Buffer.from('PK..') }, {}), {
    status: 400,
  });
});

test('recusa documento Word inválido', async () => {
  await assert.rejects(
    parseFile({ originalname: 'a.docx', buffer: Buffer.from('PK\u0003\u0004lixo') }, {}),
    { status: 400 },
  );
});
