const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return jsFiles(full);
    }
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

// Pega cedo um erro de cópia e cola (barra invertida sobrando, arquivo cortado) antes de o servidor cair.
test('todo arquivo do back-end e dos testes tem sintaxe válida', () => {
  for (const dir of ['src', 'test']) {
    for (const file of jsFiles(path.join(root, dir))) {
      const name = path.relative(root, file);
      assert.doesNotThrow(
        () => new vm.Script(fs.readFileSync(file, 'utf8'), { filename: name }),
        name + ' tem erro de sintaxe',
      );
    }
  }
});
