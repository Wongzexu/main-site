const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/assets/js/home.js', 'utf8');
function section(start, end, offset = 0) {
  const a = source.indexOf(start, offset);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a);
  return source.slice(a, b);
}

test('management shortcuts require exact Ctrl combinations', () => {
  const calls = [];
  let handler;
  const context = {
    dlg: { classList: { contains: () => true }, addEventListener: (_, fn) => handler = fn },
    manageDeleting: false, overlayOpen: () => false, managePath: [], manageFiles: [], manageSel: 0,
  };
  const actions = ['selectManageRow', 'loadManage', 'exitManage', 'openManageSelected',
    'markAllManage', 'clearManageMarks', 'requestManageDelete', 'showManageQr',
    'toggleManageMark', 'downloadManageMarked'];
  for (const name of actions) context[name] = () => calls.push(name);
  vm.runInNewContext(section("  dlg.addEventListener('keydown', (e) => {", '  manageList.addEventListener', source.indexOf('  function resetManage()')), context);
  function press(key, modifiers = {}) {
    calls.length = 0;
    handler({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      target: { closest: () => null }, preventDefault() {}, ...modifiers });
    return [...calls];
  }
  for (const key of ['a', 'c', 'd', 'q', ' ', 'Delete']) assert.deepEqual(press(key), []);
  for (const [key, action] of [['a', 'markAllManage'], ['c', 'clearManageMarks'],
    ['d', 'requestManageDelete'], ['q', 'exitManage'], ['r', 'loadManage'],
    [' ', 'toggleManageMark'], ['Enter', 'downloadManageMarked']]) {
    assert.deepEqual(press(key, { ctrlKey: true }), [action]);
    assert.deepEqual(press(key, { ctrlKey: true, altKey: true }), []);
  }
  assert.deepEqual(press('Q', { ctrlKey: true, shiftKey: true }), ['showManageQr']);
  assert.deepEqual(press('D', { ctrlKey: true, shiftKey: true }), []);
  assert.deepEqual(press('d', { metaKey: true }), []);
  assert.deepEqual(press('d', { ctrlKey: true, repeat: true }), []);
  context.manageDeleting = true;
  for (const key of ['a', 'd', 'q', 'Enter', 'ArrowDown', 'Escape']) {
    assert.deepEqual(press(key, { ctrlKey: key.length === 1 }), []);
  }
});

function deletionContext(fetch) {
  const context = {
    manageDeleting: false, manageSeq: 0, manageAuth: { header: 'Basic test' }, manageMarks: new Set(['a', 'b', 'c']),
    manageList: { setAttribute() {}, removeAttribute() {} },
    manageStatus: { textContent: '' }, manageUserEl: { textContent: 'admin' },
    hrefOf: path => path, setManageMeta() {}, showManageLogin() {}, renderManage() {},
    loadManage: async () => {}, AbortController, setTimeout, clearTimeout, fetch,
  };
  vm.createContext(context);
  vm.runInContext(section('  async function deleteManageFiles(paths)', '  function showManageLogin'), context);
  return context;
}

test('deletion preserves failures, reports reasons and clears successful marks', async () => {
  const c = deletionContext(async path => {
    if (path === 'c') throw Error('offline');
    return { ok: path === 'a', status: path === 'a' ? 204 : 403 };
  });
  await c.deleteManageFiles(['a', 'b', 'c']);
  assert.deepEqual([...c.manageMarks], ['b', 'c']);
  assert.match(c.manageStatus.textContent, /删除成功 1 个/);
  assert.match(c.manageStatus.textContent, /b：HTTP 403/);
  assert.match(c.manageStatus.textContent, /c：网络异常/);
  assert.equal(c.manageDeleting, false);
});

test('authentication failure stops batch and requires a new confirmation after login', async () => {
  const requests = [];
  let login = 0;
  const c = deletionContext(async path => {
    requests.push(path);
    return { ok: false, status: 401 };
  });
  c.showManageLogin = () => login++;
  await c.deleteManageFiles(['a', 'b', 'c']);
  assert.deepEqual(requests, ['a']);
  assert.equal(c.manageAuth, null);
  assert.equal(login, 1);
  assert.equal(c.manageMarks.size, 3);
  assert.match(c.manageStatus.textContent, /未执行（认证失效）/);
});

test('pending deletion blocks repeated submissions and exposes progress', async () => {
  let release;
  let count = 0;
  const c = deletionContext(() => { count++; return new Promise(resolve => release = resolve); });
  const pending = c.deleteManageFiles(['a']);
  assert.equal(c.manageDeleting, true);
  assert.match(c.manageStatus.textContent, /1\/1：a/);
  await c.deleteManageFiles(['a']);
  assert.equal(count, 1);
  release({ ok: true, status: 204 });
  await pending;
  assert.equal(c.manageDeleting, false);
});

test('confirmation identifies selection scope and includes every path', () => {
  let text;
  const paths = Array.from({ length: 9 }, (_, i) => `dir/file${i}`);
  const c = { manageDeleting: false, manageMarks: new Set(paths), manageFiles: [], manageSel: 0,
    manageRel: f => f.name, openConfirm: value => text = value, setManageMeta() {} };
  vm.runInNewContext(section('  function requestManageDelete()', '  async function deleteManageFiles'), c);
  c.requestManageDelete();
  assert.match(text, /全部勾选文件（9 个）/);
  paths.forEach(path => assert.ok(text.includes(path)));
  c.manageMarks.clear();
  c.manageFiles = [{ type: 'file', name: 'current.txt' }];
  c.requestManageDelete();
  assert.match(text, /当前文件（1 个）/);
  assert.match(text, /current.txt/);
});

function terminalCloseContext({ reduceMotion = false } = {}) {
  const classes = new Set();
  const htmlClasses = new Set();
  const listeners = {};
  const timers = [];
  const context = {
    manageDeleting: false, navigating: false, tuiSeq: 0, tuiFiles: [], tuiMarks: new Set(['x']),
    reduce: { matches: reduceMotion }, resetManage() {}, closeConfirm() {},
    document: { documentElement: { classList: {
      add: value => htmlClasses.add(value),
      remove: value => htmlClasses.delete(value),
      contains: value => htmlClasses.has(value),
    } } },
    link: { focus() {} },
    setTimeout: fn => timers.push(fn),
    dlg: {
      open: true,
      classList: {
        contains: value => classes.has(value),
        add: value => classes.add(value),
        remove: value => classes.delete(value),
      },
      addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
      close() {
        this.open = false;
        classes.delete('closing');
        (listeners.close || []).forEach(fn => fn());
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(section('  function closeTerm() {', '  function run(raw) {'), context);
  vm.runInContext(section("  dlg.addEventListener('close', () => {", "  document.addEventListener('keydown'"), context);
  return { context, classes, htmlClasses, timers };
}

test('terminal close keeps hover effects suppressed until the dialog closes', () => {
  const c = terminalCloseContext();
  c.htmlClasses.add('term-open');
  c.context.closeTerm();
  assert.equal(c.context.dlg.open, true);
  assert.ok(c.classes.has('closing'));
  assert.ok(c.htmlClasses.has('term-open'));
  const seq = c.context.tuiSeq;
  c.context.closeTerm();
  assert.equal(c.timers.length, 1);
  assert.equal(c.context.tuiSeq, seq);
  c.timers[0]();
  assert.equal(c.context.dlg.open, false);
  assert.equal(c.classes.has('closing'), false);
  assert.equal(c.htmlClasses.has('term-open'), false);
  assert.ok(c.htmlClasses.has('quiet-focus'));
});

test('terminal close under reduced motion clears term-open without waiting', () => {
  const c = terminalCloseContext({ reduceMotion: true });
  c.htmlClasses.add('term-open');
  c.context.closeTerm();
  assert.equal(c.timers.length, 0);
  assert.equal(c.context.dlg.open, false);
  assert.equal(c.htmlClasses.has('term-open'), false);
});

test('mock deletion resolves nested files and never removes directories', { skip: !fs.existsSync('dev-server.mjs') }, () => {
  const files = [{ name: 'dir', type: 'directory', children: [{ name: 'file', type: 'file' }] }];
  let status;
  const c = { files, checkAuth: () => true, console: { log() {} },
    text: (_, code) => status = code,
    findDir: parts => parts.length ? files[0].children : files };
  vm.runInNewContext(fs.readFileSync('dev-server.mjs', 'utf8').split('function handleFileDelete')[1].split('function handleStatic')[0].replace(/^\(req, res, name\)/, 'function handleFileDelete(req, res, name)'), c);
  const res = { writeHead: code => status = code, end() {} };
  c.handleFileDelete({}, res, 'dir/file');
  assert.equal(status, 204);
  assert.equal(files[0].children.length, 0);
  c.handleFileDelete({}, res, 'dir');
  assert.equal(status, 404);
  assert.equal(files.length, 1);
});
