const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const publicDir = path.join(__dirname, '..', 'public');
const jsDir = path.join(publicDir, 'js');

test('todo arquivo de public/js tem sintaxe válida', () => {
  for (const name of fs.readdirSync(jsDir).filter((file) => file.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(jsDir, name), 'utf8');
    assert.doesNotThrow(
      () => new vm.Script(source, { filename: name }),
      name + ' tem erro de sintaxe',
    );
  }
});

test('todo script do index.html existe e está no lugar', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const sources = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(sources.length > 0);
  for (const src of sources) {
    assert.ok(fs.existsSync(path.join(publicDir, src)), src + ' está no index.html mas não existe');
  }
});

test('todo arquivo de public/js está carregado no index.html', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  for (const name of fs.readdirSync(jsDir).filter((file) => file.endsWith('.js'))) {
    assert.ok(html.includes('/js/' + name), name + ' existe mas não é carregado no index.html');
  }
});
