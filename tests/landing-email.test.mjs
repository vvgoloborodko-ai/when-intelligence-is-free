import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/scripts/landing.js', import.meta.url), 'utf8');
function setup({ clipboard, legacyCopy = true } = {}) {
  let click, selected, removed = false;
  const status = { textContent: '' };
  const link = {
    getAttribute: () => 'mailto:vlad@whenintelligenceisfree.com',
    addEventListener: (type, handler) => { assert.equal(type, 'click'); click = handler; },
    focus: () => {}
  };
  const document = {
    querySelector: selector => selector === '.email-link' ? link : status,
    createElement: () => ({ style: {}, setAttribute() {}, select() { selected = this.value; }, remove() { removed = true; } }),
    body: { append() {} },
    execCommand: command => { assert.equal(command, 'copy'); return legacyCopy; }
  };
  runInNewContext(source, { document, navigator: { clipboard }, setTimeout: () => 1, clearTimeout() {} });
  return { click, status, selected: () => selected, removed: () => removed };
}

test('Email click copies the address and announces success while retaining native mailto navigation', async () => {
  let copied;
  const ui = setup({ clipboard: { writeText: async text => { copied = text; } } });
  await ui.click({ preventDefault() { assert.fail('Native mailto action must remain available'); } });
  assert.equal(copied, 'vlad@whenintelligenceisfree.com');
  assert.equal(ui.status.textContent, 'Copied');
});

test('Email copy falls back when clipboard access is rejected or unavailable', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw Error('Denied'); } }]) {
    const ui = setup({ clipboard });
    await ui.click();
    assert.equal(ui.selected(), 'vlad@whenintelligenceisfree.com');
    assert.equal(ui.status.textContent, 'Copied');
    assert.ok(ui.removed());
  }
});

test('Email copy failure exposes the address without falsely reporting success', async () => {
  const ui = setup({ legacyCopy: false });
  await ui.click();
  assert.equal(ui.status.textContent, 'Copy manually: vlad@whenintelligenceisfree.com');
  assert.ok(ui.removed());
});
