(() => {
  const dlg = document.getElementById('termDlg');
  const log = document.getElementById('termLog');
  const body = document.getElementById('termBody');
  const form = document.getElementById('termForm');
  const input = document.getElementById('termInput');
  const closeBtn = document.getElementById('termClose');
  const termTitleEl = document.getElementById('termTitle');
  const tui = document.getElementById('termTui');
  const confirmEl = document.getElementById('tuiConfirm');
  const confirmText = document.getElementById('tuiConfirmText');
  const confirmYes = document.getElementById('tuiConfirmYes');
  const confirmNo = document.getElementById('tuiConfirmNo');
  const tuiList = document.getElementById('tuiList');
  const tuiMeta = document.getElementById('tuiMeta');
  const manageList = document.getElementById('manageList');
  const manageStatus = document.getElementById('manageStatus');
  const manageMeta = document.getElementById('manageMeta');
  const managePathEl = document.getElementById('managePath');
  const manageUserEl = document.getElementById('manageUser');
  const managePreview = document.getElementById('managePreview');
  const manageLoginEl = document.getElementById('manageLogin');
  const manageLoginForm = document.getElementById('manageLoginForm');
  const manageUserNameInput = document.getElementById('manageUserName');
  const managePasswordInput = document.getElementById('managePassword');
  const manageLoginErr = document.getElementById('manageLoginErr');
  const manageLoginBtn = document.getElementById('manageLoginYes');
  const manageLoginCancel = document.getElementById('manageLoginNo');
  const manageQrEl = document.getElementById('manageQr');
  const manageQrName = document.getElementById('manageQrName');
  const manageQrBox = document.getElementById('manageQrBox');
  const manageQrUrl = document.getElementById('manageQrUrl');
  const manageQrClose = document.getElementById('manageQrClose');
  const link = document.querySelector('.mac-link');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const PROMPT = 'admin@sjdhqtl:~$';
  let opening = false;
  let navigating = false;

  function append(node) {
    log.append(node);
    while (log.childElementCount > 240) log.firstElementChild.remove();
    body.scrollTop = body.scrollHeight;
  }
  function line(text, cls) {
    const d = document.createElement('div');
    d.className = 'ln' + (cls ? ' ' + cls : '');
    d.textContent = text || '\u00a0';
    append(d);
  }
  function rich(parts) {
    const d = document.createElement('div');
    d.className = 'ln';
    for (const [text, cls] of parts) {
      const s = document.createElement('span');
      s.textContent = text;
      if (cls) s.className = cls;
      d.append(s);
    }
    append(d);
  }

  // ---------- /dl TUI ----------
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let tuiFiles = [];
  let tuiSel = 0;
  let tuiSeq = 0;
  let tuiPath = [];
  const tuiMarks = new Set();
  let manageFiles = [];
  let manageSel = 0;
  let manageSeq = 0;
  let managePath = [];
  const manageMarks = new Set();
  let manageDeleting = false;
  let manageAuth = null;
  let manageUserName = 'admin';
  let confirmAction = null;
  const tuiPathEl = document.getElementById('tuiPath');
  const tuiWhere = () => '/dl' + (tuiPath.length ? '/' + tuiPath.join('/') : '');
  const markPath = (f) => [...tuiPath, f.name].join('/');
  const hrefOf = (rel) => '/files/' + rel.split('/').map(encodeURIComponent).join('/');

  function fmtSize(n) {
    if (!n) return '0 B';
    if (n < 1024) return n + ' B';
    const u = ['KB', 'MB', 'GB', 'TB'];
    let i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return n.toFixed(1) + ' ' + u[i];
  }
  function fmtDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const p = (v) => String(v).padStart(2, '0');
    return `${MONTHS[d.getMonth()]} ${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function selectRow(i, scroll) {
    if (!tuiFiles.length) return;
    tuiSel = Math.max(0, Math.min(tuiFiles.length - 1, i));
    const rows = tuiList.querySelectorAll('.tui-row');
    rows.forEach((r, j) => {
      const on = j === tuiSel;
      r.classList.toggle('sel', on);
      r.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    tuiList.setAttribute('aria-activedescendant', 'tui-row-' + tuiSel);
    if (scroll && rows[tuiSel]) rows[tuiSel].scrollIntoView({ block: 'nearest' });
  }

  function downloadRow() {
    const f = tuiFiles[tuiSel];
    if (!f || f.type !== 'file') return;
    const rel = [...tuiPath, f.name].map(encodeURIComponent).join('/');
    location.href = '/files/' + rel;
  }

  function toggleMark(i) {
    const f = tuiFiles[i];
    if (!f || f.type !== 'file') return;
    const p = markPath(f);
    if (tuiMarks.has(p)) tuiMarks.delete(p); else tuiMarks.add(p);
    const row = tuiList.querySelector('.tui-row[data-i="' + i + '"]');
    if (row) {
      row.classList.toggle('marked', tuiMarks.has(p));
      const mk = row.querySelector('.mk');
      if (mk) mk.textContent = tuiMarks.has(p) ? '✓' : '';
    }
    updateTuiMeta();
  }

  function clearMarks() {
    tuiMarks.clear();
    tuiList.querySelectorAll('.tui-row.marked').forEach((r) => {
      r.classList.remove('marked');
      const mk = r.querySelector('.mk');
      if (mk) mk.textContent = '';
    });
    updateTuiMeta();
  }

  function openConfirm(text, label, onYes) {
    confirmText.textContent = text;
    confirmYes.innerHTML = '<b>y</b> ' + label;
    confirmAction = onYes;
    confirmEl.classList.add('on');
    (label === 'delete' ? confirmNo : confirmYes).focus({ preventScroll: true });
  }

  function closeConfirm(refocus = true) {
    confirmEl.classList.remove('on');
    confirmAction = null;
    if (!refocus) return;
    const target = dlg.classList.contains('manage') ? manageList : tuiList;
    if (target) target.focus({ preventScroll: true });
  }

  function askDownload() {
    const n = tuiMarks.size;
    if (!n) return;
    openConfirm('download ' + n + ' marked file' + (n > 1 ? 's' : '') + '?', 'download', downloadMarked);
  }

  function downloadMarked() {
    const paths = [...tuiMarks];
    if (!paths.length) return;
    clearMarks();
    tuiMeta.textContent = 'downloading ' + paths.length + ' file' + (paths.length > 1 ? 's' : '') + '…';
    paths.forEach((rel, i) => {
      setTimeout(() => {
        // 用隐藏 iframe 触发下载：比 <a download> 在无头/受限环境更可靠
        const f = document.createElement('iframe');
        f.style.display = 'none';
        f.src = hrefOf(rel);
        document.body.append(f);
        setTimeout(() => f.remove(), 30000);
      }, i * 600);
    });
    setTimeout(updateTuiMeta, paths.length * 600 + 1500);
  }

  function openSelected() {
    const f = tuiFiles[tuiSel];
    if (!f) return;
    if (f.type === 'up') {
      tuiPath.pop();
      loadTui();
      return;
    }
    if (f.type === 'directory') {
      tuiPath.push(f.name);
      loadTui();
      return;
    }
    downloadRow();
  }

  function updateTuiMeta() {
    if (!tuiFiles.length) { tuiMeta.textContent = '0 items'; return; }
    const dirs = tuiFiles.filter((f) => f.type === 'directory').length;
    const filesN = tuiFiles.filter((f) => f.type === 'file').length;
    const total = tuiFiles.reduce((a, f) => a + (f.type === 'file' ? (f.size || 0) : 0), 0);
    const parts = [];
    if (dirs) parts.push(dirs + ' dir' + (dirs > 1 ? 's' : ''));
    parts.push(filesN + ' file' + (filesN > 1 ? 's' : ''));
    if (tuiMarks.size) parts.push(tuiMarks.size + ' marked');
    tuiMeta.textContent = parts.join(' · ') + ' · ' + fmtSize(total);
  }

  function renderTui() {
    tuiList.replaceChildren();
    if (!tuiFiles.length) {
      const e = document.createElement('div');
      e.className = 'tui-empty';
      e.textContent = 'empty directory';
      tuiList.append(e);
      tuiMeta.textContent = '0 items';
      return;
    }
    updateTuiMeta();
    tuiFiles.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'tui-row' + (f.type === 'directory' ? ' dir' : '') + (f.type === 'up' ? ' up' : '');
      row.id = 'tui-row-' + i;
      row.dataset.i = i;
      row.setAttribute('role', 'option');
      const marked = f.type === 'file' && tuiMarks.has(markPath(f));
      const mk = document.createElement('span'); mk.className = 'mk';
      mk.textContent = marked ? '✓' : '';
      if (marked) row.classList.add('marked');
      const n = document.createElement('span'); n.className = 'n';
      n.textContent = f.type === 'directory' ? f.name + '/' : f.name;
      const z = document.createElement('span'); z.className = 's';
      z.textContent = f.type === 'directory' ? 'DIR' : f.type === 'file' ? fmtSize(f.size) : '';
      const d = document.createElement('span'); d.className = 'd';
      d.textContent = f.type === 'up' ? '' : fmtDate(f.mtime);
      row.append(mk, n, z, d);
      tuiList.append(row);
    });
    selectRow(tuiSel, true);
  }

  async function loadTui() {
    const seq = ++tuiSeq;
    const where = tuiWhere();
    tuiFiles = [];
    tuiSel = 0;
    tuiPathEl.textContent = where;
    tuiMeta.textContent = 'loading…';
    tuiList.replaceChildren();
    const e = document.createElement('div');
    e.className = 'tui-empty';
    e.textContent = 'loading…';
    tuiList.append(e);
    const sub = tuiPath.map(encodeURIComponent).join('/');
    try {
      const r = await fetch('/api/list/' + (sub ? sub + '/' : ''), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const arr = await r.json();
      if (seq !== tuiSeq) return;
      const items = arr
        .filter((x) => (x.type === 'file' || x.type === 'directory') && x.name !== 'index.html')
        .map((x) => ({ name: x.name, type: x.type, size: x.size, mtime: x.mtime }))
        .sort((a, b) => (a.type === b.type
          ? a.name.localeCompare(b.name, 'zh')
          : a.type === 'directory' ? -1 : 1));
      tuiFiles = tuiPath.length ? [{ name: '..', type: 'up' }, ...items] : items;
      tuiSel = 0;
      renderTui();
    } catch (err) {
      if (seq !== tuiSeq) return;
      tuiFiles = [];
      tuiSel = 0;
      tuiMeta.textContent = 'failed to load';
      e.textContent = 'failed to load ' + where + ' — ' + err.message;
    }
  }

  function enterTui() {
    if (dlg.classList.contains('tui')) return;
    dlg.classList.add('tui');
    tuiPath = [];
    tuiMarks.clear();
    closeConfirm(false);
    loadTui();
    tuiList.focus({ preventScroll: true });
  }

  function exitTui() {
    if (!dlg.classList.contains('tui')) return;
    dlg.classList.remove('tui');
    tuiSeq++;
    tuiFiles = [];
    tuiPath = [];
    tuiMarks.clear();
    closeConfirm(false);
    input.focus({ preventScroll: true });
    body.scrollTop = body.scrollHeight;
  }

  dlg.addEventListener('keydown', (e) => {
    if (!dlg.classList.contains('tui') || overlayOpen()) return;
    const onButton = !!e.target.closest('button');
    const ctrl = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    const k = e.key;
    if (e.altKey || e.metaKey || e.shiftKey || (e.ctrlKey && !ctrl)) return;
    if (ctrl && !['Enter', ' ', 'r', 'R', 'q', 'Q'].includes(k)) return;
    if (k === 'ArrowDown') { e.preventDefault(); selectRow(tuiSel + 1, true); }
    else if (k === 'ArrowUp') { e.preventDefault(); selectRow(tuiSel - 1, true); }
    else if (k === 'Home') { e.preventDefault(); selectRow(0, true); }
    else if (k === 'End') { e.preventDefault(); selectRow(tuiFiles.length - 1, true); }
    else if (k === 'PageDown') { e.preventDefault(); selectRow(tuiSel + 10, true); }
    else if (k === 'PageUp') { e.preventDefault(); selectRow(tuiSel - 10, true); }
    else if (k === 'Backspace' && tuiPath.length) {
      e.preventDefault();
      tuiPath.pop();
      loadTui();
    }
    else if (k === 'Enter') {
      if (onButton) return;
      e.preventDefault();
      if (ctrl && tuiMarks.size) askDownload(); else openSelected();
    }
    else if (ctrl && !e.shiftKey && !e.altKey && k === ' ') {
      if (onButton) return;
      e.preventDefault();
      toggleMark(tuiSel);
    }
    else if (ctrl && (k === 'r' || k === 'R')) { e.preventDefault(); loadTui(); }
    else if (ctrl && (k === 'q' || k === 'Q')) { e.preventDefault(); exitTui(); }
  });
  tuiList.addEventListener('click', (e) => {
    const row = e.target.closest('.tui-row');
    if (!row) return;
    const i = Number(row.dataset.i);
    const f = tuiFiles[i];
    if (!f) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      selectRow(i, false);
      toggleMark(i);
      tuiList.focus({ preventScroll: true });
      return;
    }
    if (f.type === 'directory' || f.type === 'up') {
      selectRow(i, false);
      openSelected();
      tuiList.focus({ preventScroll: true });
      return;
    }
    if (tuiMarks.size) clearMarks();
    if (i === tuiSel && f.type === 'file') { downloadRow(); return; }
    selectRow(i, false);
    tuiList.focus({ preventScroll: true });
  });

  // ---------- manage TUI ----------
  const manageWhere = () => '/dl' + (managePath.length ? '/' + managePath.join('/') : '');
  const manageRel = (f) => [...managePath, f.name].join('/');

  function basicAuth(user, pw) {
    const bytes = new TextEncoder().encode(user + ':' + pw);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return 'Basic ' + btoa(bin);
  }

  function randomToken() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch {}
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function overlayOpen() {
    return confirmEl.classList.contains('on') || manageLoginEl.classList.contains('on') || manageQrEl.classList.contains('on');
  }

  function setManageMeta(text) {
    manageMeta.textContent = text;
  }

  function selectManageRow(i, scroll) {
    if (!manageFiles.length) { renderManagePreview(); return; }
    manageSel = Math.max(0, Math.min(manageFiles.length - 1, i));
    const rows = manageList.querySelectorAll('.tui-row');
    rows.forEach((r, j) => {
      const on = j === manageSel;
      r.classList.toggle('sel', on);
      r.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    manageList.setAttribute('aria-activedescendant', 'manage-row-' + manageSel);
    if (scroll && rows[manageSel]) rows[manageSel].scrollIntoView({ block: 'nearest' });
    renderManagePreview();
  }

  function updateManageMeta() {
    if (!manageFiles.length) { setManageMeta(manageAuth ? '0 items' : 'login required'); return; }
    const dirs = manageFiles.filter((f) => f.type === 'directory').length;
    const filesN = manageFiles.filter((f) => f.type === 'file').length;
    const total = manageFiles.reduce((a, f) => a + (f.type === 'file' ? (f.size || 0) : 0), 0);
    const parts = [];
    if (dirs) parts.push(dirs + ' dir' + (dirs > 1 ? 's' : ''));
    parts.push(filesN + ' file' + (filesN > 1 ? 's' : ''));
    if (manageMarks.size) parts.push(manageMarks.size + ' marked');
    setManageMeta(parts.join(' · ') + ' · ' + fmtSize(total));
  }

  function pvRow(label, value, dim) {
    const row = document.createElement('div');
    row.className = 'pv-row';
    const k = document.createElement('span'); k.className = 'pv-k'; k.textContent = label;
    const v = document.createElement('span'); v.className = 'pv-v' + (dim ? ' dim' : ''); v.textContent = value;
    row.append(k, v);
    return row;
  }

  function renderManagePreview() {
    managePreview.replaceChildren();
    const f = manageFiles[manageSel];
    if (!f) {
      managePreview.append(pvRow('selection', '—', true));
      managePreview.append(pvRow('marked', String(manageMarks.size), true));
      return;
    }
    if (f.type === 'up') {
      managePreview.append(pvRow('type', 'parent directory', true));
      managePreview.append(pvRow('path', manageWhere(), true));
    } else if (f.type === 'directory') {
      managePreview.append(pvRow('type', 'directory', true));
      managePreview.append(pvRow('name', f.name + '/'));
      managePreview.append(pvRow('path', manageWhere()));
      managePreview.append(pvRow('modified', fmtDate(f.mtime) || '—', true));
    } else {
      const rel = manageRel(f);
      managePreview.append(pvRow('type', 'file', true));
      managePreview.append(pvRow('name', f.name));
      managePreview.append(pvRow('size', fmtSize(f.size)));
      managePreview.append(pvRow('modified', fmtDate(f.mtime) || '—'));
      managePreview.append(pvRow('path', rel));
      managePreview.append(pvRow('link', location.origin + hrefOf(rel)));
      if (manageMarks.has(rel)) managePreview.append(pvRow('marked', 'yes'));
    }
    managePreview.append(pvRow('marked files', String(manageMarks.size), true));
    if (f.type === 'file') {
      const hint = document.createElement('div');
      hint.className = 'pv-hint';
      hint.textContent = 'Ctrl+Space mark · Ctrl+Shift+Q qr · Ctrl+D delete';
      managePreview.append(hint);
    }
  }

  function renderManage() {
    manageList.replaceChildren();
    if (!manageFiles.length) {
      const e = document.createElement('div');
      e.className = 'tui-empty';
      e.textContent = manageAuth ? 'empty directory' : 'login required';
      manageList.append(e);
      updateManageMeta();
      renderManagePreview();
      return;
    }
    updateManageMeta();
    manageFiles.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'tui-row' + (f.type === 'directory' ? ' dir' : '') + (f.type === 'up' ? ' up' : '');
      row.id = 'manage-row-' + i;
      row.dataset.i = i;
      row.setAttribute('role', 'option');
      const rel = f.type === 'file' ? manageRel(f) : '';
      const marked = f.type === 'file' && manageMarks.has(rel);
      if (marked) row.classList.add('marked');
      const mk = document.createElement('span'); mk.className = 'mk'; mk.textContent = marked ? '✓' : '';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = f.type === 'directory' ? f.name + '/' : f.name;
      const z = document.createElement('span'); z.className = 's'; z.textContent = f.type === 'directory' ? 'DIR' : f.type === 'file' ? fmtSize(f.size) : '';
      const d = document.createElement('span'); d.className = 'd'; d.textContent = f.type === 'up' ? '' : fmtDate(f.mtime);
      row.append(mk, n, z, d);
      manageList.append(row);
    });
    selectManageRow(manageSel, true);
  }

  async function loadManage() {
    if (manageDeleting) return;
    const seq = ++manageSeq;
    const where = manageWhere();
    manageFiles = [];
    manageSel = 0;
    managePathEl.textContent = where;
    manageUserEl.textContent = manageAuth ? manageAuth.user : '';
    if (!manageAuth) {
      renderManage();
      return;
    }
    setManageMeta('loading…');
    manageList.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'tui-empty';
    loading.textContent = 'loading…';
    manageList.append(loading);
    const sub = managePath.map(encodeURIComponent).join('/');
    try {
      const r = await fetch('/api/list/' + (sub ? sub + '/' : ''), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const arr = await r.json();
      if (seq !== manageSeq) return;
      const items = arr
        .filter((x) => x.type === 'file' || x.type === 'directory')
        .map((x) => ({ name: x.name, type: x.type, size: x.size, mtime: x.mtime }))
        .sort((a, b) => (a.type === b.type
          ? a.name.localeCompare(b.name, 'zh')
          : a.type === 'directory' ? -1 : 1));
      manageFiles = managePath.length ? [{ name: '..', type: 'up' }, ...items] : items;
      manageSel = 0;
      renderManage();
    } catch (err) {
      if (seq !== manageSeq) return;
      manageFiles = [];
      manageSel = 0;
      setManageMeta('failed to load');
      loading.textContent = 'failed to load ' + where + ' — ' + err.message;
      renderManagePreview();
    }
  }

  function toggleManageMark(i) {
    const f = manageFiles[i];
    if (!f || f.type !== 'file') return;
    const rel = manageRel(f);
    if (manageMarks.has(rel)) manageMarks.delete(rel); else manageMarks.add(rel);
    const row = manageList.querySelector('.tui-row[data-i="' + i + '"]');
    if (row) {
      row.classList.toggle('marked', manageMarks.has(rel));
      const mk = row.querySelector('.mk');
      if (mk) mk.textContent = manageMarks.has(rel) ? '✓' : '';
    }
    updateManageMeta();
    renderManagePreview();
  }

  function clearManageMarks() {
    manageMarks.clear();
    manageList.querySelectorAll('.tui-row.marked').forEach((r) => {
      r.classList.remove('marked');
      const mk = r.querySelector('.mk');
      if (mk) mk.textContent = '';
    });
    updateManageMeta();
    renderManagePreview();
  }

  function markAllManage() {
    manageFiles.forEach((f) => { if (f.type === 'file') manageMarks.add(manageRel(f)); });
    renderManage();
  }

  function openManageSelected() {
    const f = manageFiles[manageSel];
    if (!f) return;
    if (f.type === 'up') { managePath.pop(); loadManage(); return; }
    if (f.type === 'directory') { managePath.push(f.name); loadManage(); return; }
    location.href = hrefOf(manageRel(f));
  }

  function downloadManageMarked() {
    if (!manageMarks.size || manageDeleting) return;
    const paths = [...manageMarks];
    openConfirm('download ' + paths.length + ' marked files?', 'download', () => {
      paths.forEach((rel, i) => setTimeout(() => {
        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.src = hrefOf(rel);
        document.body.append(frame);
        setTimeout(() => frame.remove(), 30000);
      }, i * 600));
    });
  }

  function showManageQr() {
    const f = manageFiles[manageSel];
    if (!f || f.type !== 'file') { setManageMeta('select a file'); return; }
    const rel = manageRel(f);
    const url = location.origin + hrefOf(rel);
    manageQrName.textContent = f.name;
    manageQrUrl.textContent = url;
    manageQrBox.replaceChildren();
    if (typeof QRCode === 'undefined') {
      manageQrBox.textContent = 'QR module not loaded';
    } else {
      new QRCode(manageQrBox, { text: url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    }
    manageQrEl.classList.add('on');
    manageQrClose.focus({ preventScroll: true });
  }

  function closeManageQr(refocus = true) {
    manageQrEl.classList.remove('on');
    manageQrBox.replaceChildren();
    if (refocus && dlg.classList.contains('manage')) manageList.focus({ preventScroll: true });
  }

  function requestManageDelete() {
    if (manageDeleting) return;
    let targets;
    if (manageMarks.size) {
      targets = [...manageMarks];
    } else {
      const f = manageFiles[manageSel];
      if (!f || f.type !== 'file') { setManageMeta('select a file to delete'); return; }
      targets = [manageRel(f)];
    }
    const shown = targets.map((p) => '  ' + p).join('\n');
    const text = (manageMarks.size ? '删除全部勾选文件' : '删除当前文件') + '（' + targets.length + ' 个）？\n' + shown + '\n此操作不可撤销。';
    openConfirm(text, 'delete', () => deleteManageFiles(targets));
  }

  async function deleteManageFiles(paths) {
    if (manageDeleting || !paths.length) return;
    if (!manageAuth) { showManageLogin(); return; }
    manageDeleting = true;
    manageSeq++; // Ignore list responses started before this deletion.
    manageList.setAttribute('aria-busy', 'true');
    const header = manageAuth.header;
    let ok = 0, authFailed = false;
    const failures = [];
    try {
      for (let i = 0; i < paths.length; i++) {
        const rel = paths[i];
        const progress = '正在删除 ' + (i + 1) + '/' + paths.length + '：' + rel;
        setManageMeta(progress);
        manageStatus.textContent = progress;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const r = await fetch(hrefOf(rel), { method: 'DELETE', headers: { Authorization: header }, signal: controller.signal });
          if (r.ok) { ok++; manageMarks.delete(rel); }
          else if (r.status === 401) {
            authFailed = true;
            for (const pending of paths.slice(i)) {
              manageMarks.add(pending);
              failures.push(pending + '：' + (pending === rel ? '认证失效' : '未执行（认证失效）'));
            }
            break;
          } else {
            manageMarks.add(rel);
            failures.push(rel + '：HTTP ' + r.status);
          }
        } catch (err) {
          manageMarks.add(rel);
          failures.push(rel + '：' + (err.name === 'AbortError' ? '请求超时，刷新确认文件状态后重试' : '网络异常，刷新确认文件状态后重试'));
        } finally { clearTimeout(timeout); }
      }
    } finally {
      manageDeleting = false;
      manageList.removeAttribute('aria-busy');
    }
    const summary = '删除成功 ' + ok + ' 个 · 失败/未执行 ' + failures.length + ' 个';
    if (authFailed) {
      manageAuth = null;
      manageUserEl.textContent = '';
      renderManage();
      showManageLogin('登录已失效，请重新输入密码；剩余文件需重新确认删除。');
    } else {
      await loadManage();
    }
    setManageMeta(summary);
    manageStatus.textContent = [summary, ...failures].join('\n');
  }

  function showManageLogin(message) {
    closeConfirm(false);
    manageLoginErr.textContent = message || '';
    if (!manageUserNameInput.value) manageUserNameInput.value = manageUserName;
    managePasswordInput.value = '';
    manageLoginEl.classList.add('on');
    managePasswordInput.focus({ preventScroll: true });
  }

  function closeManageLogin(refocus = true) {
    manageLoginEl.classList.remove('on');
    manageLoginErr.textContent = '';
    if (refocus && dlg.classList.contains('manage')) manageList.focus({ preventScroll: true });
  }

  function cancelManageLogin() {
    manageLoginEl.classList.remove('on');
    manageLoginErr.textContent = '';
    exitManage();
  }

  async function submitManageLogin() {
    const user = manageUserNameInput.value.trim() || 'admin';
    const pw = managePasswordInput.value;
    if (!user || !pw) { manageLoginErr.textContent = '请输入用户名和密码'; return; }
    manageLoginBtn.disabled = true;
    manageLoginErr.textContent = 'checking…';
    const header = basicAuth(user, pw);
    try {
      const r = await fetch(hrefOf('__auth_check_' + randomToken() + '__'), {
        method: 'DELETE',
        headers: { Authorization: header }
      });
      if (r.status === 401) { manageLoginErr.textContent = '用户名或密码错误'; return; }
      if (!(r.ok || r.status === 404)) { manageLoginErr.textContent = '验证失败: HTTP ' + r.status; return; }
      if (!dlg.classList.contains('manage') || !manageLoginEl.classList.contains('on')) return;
      manageAuth = { user, header };
      manageUserName = user;
      managePasswordInput.value = '';
      manageUserEl.textContent = user;
      closeManageLogin(false);
      manageList.focus({ preventScroll: true });
      loadManage();
    } catch (err) {
      manageLoginErr.textContent = '连接失败: ' + err.message;
    } finally {
      manageLoginBtn.disabled = false;
    }
  }

  function enterManage(sub = []) {
    dlg.classList.remove('tui');
    dlg.classList.add('manage');
    termTitleEl.textContent = 'sjdhqtl — manage';
    manageSeq++;
    manageFiles = [];
    manageSel = 0;
    managePath = sub.slice();
    manageMarks.clear();
    manageStatus.textContent = '';
    closeConfirm(false);
    managePathEl.textContent = manageWhere();
    manageUserEl.textContent = manageAuth ? manageAuth.user : '';
    if (!manageAuth) {
      renderManage();
      showManageLogin();
      return;
    }
    loadManage();
    manageList.focus({ preventScroll: true });
  }

  function exitManage(focus = true) {
    if (manageDeleting) return;
    if (!dlg.classList.contains('manage')) return;
    dlg.classList.remove('manage');
    termTitleEl.textContent = 'sjdhqtl — terminal';
    manageSeq++;
    manageFiles = [];
    manageSel = 0;
    managePath = [];
    manageMarks.clear();
    closeManageLogin(false);
    closeManageQr(false);
    closeConfirm(false);
    if (focus) {
      input.focus({ preventScroll: true });
      body.scrollTop = body.scrollHeight;
    }
  }

  function resetManage() {
    dlg.classList.remove('manage');
    termTitleEl.textContent = 'sjdhqtl — terminal';
    manageSeq++;
    manageAuth = null;
    manageFiles = [];
    manageSel = 0;
    managePath = [];
    manageMarks.clear();
    closeManageLogin(false);
    closeManageQr(false);
  }

  dlg.addEventListener('keydown', (e) => {
    if (!dlg.classList.contains('manage')) return;
    if (manageDeleting) { e.preventDefault(); return; }
    if (overlayOpen()) return;
    const onButton = !!e.target.closest('button');
    const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    const k = e.key;
    const letter = k.toLowerCase();
    if (ctrl && e.shiftKey && letter === 'q') { e.preventDefault(); showManageQr(); return; }
    if (ctrl && !e.shiftKey) {
      const actions = {
        a: markAllManage, c: clearManageMarks, d: requestManageDelete,
        r: loadManage, q: exitManage,
        ' ': () => toggleManageMark(manageSel),
        Enter: downloadManageMarked
      };
      const action = actions[k === 'Enter' ? k : letter];
      if (action) { e.preventDefault(); if (!e.repeat) action(); }
      return;
    }
    if (!plain) return;
    if (k === 'ArrowDown') { e.preventDefault(); selectManageRow(manageSel + 1, true); }
    else if (k === 'ArrowUp') { e.preventDefault(); selectManageRow(manageSel - 1, true); }
    else if (k === 'Home') { e.preventDefault(); selectManageRow(0, true); }
    else if (k === 'End') { e.preventDefault(); selectManageRow(manageFiles.length - 1, true); }
    else if (k === 'PageDown') { e.preventDefault(); selectManageRow(manageSel + 10, true); }
    else if (k === 'PageUp') { e.preventDefault(); selectManageRow(manageSel - 10, true); }
    else if (k === 'Backspace' && managePath.length) { e.preventDefault(); managePath.pop(); loadManage(); }
    else if (k === 'Enter' && !onButton) { e.preventDefault(); openManageSelected(); }
    else if (k === 'Escape') { e.preventDefault(); exitManage(); }
  });

  manageList.addEventListener('click', (e) => {
    if (manageDeleting) return;
    const row = e.target.closest('.tui-row');
    if (!row) return;
    const i = Number(row.dataset.i);
    const f = manageFiles[i];
    if (!f) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      selectManageRow(i, false);
      toggleManageMark(i);
      manageList.focus({ preventScroll: true });
      return;
    }
    if (f.type === 'directory' || f.type === 'up') {
      selectManageRow(i, false);
      openManageSelected();
      manageList.focus({ preventScroll: true });
      return;
    }
    selectManageRow(i, false);
    manageList.focus({ preventScroll: true });
  });

  manageLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitManageLogin();
  });
  manageLoginCancel.addEventListener('click', cancelManageLogin);
  manageQrClose.addEventListener('click', () => closeManageQr());
  manageQrEl.addEventListener('click', (e) => { if (e.target === manageQrEl) closeManageQr(); });

  dlg.addEventListener('keydown', (e) => {
    if (manageLoginEl.classList.contains('on')) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelManageLogin(); }
      return;
    }
    if (manageQrEl.classList.contains('on')) {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); closeManageQr(); }
      return;
    }
    if (!confirmEl.classList.contains('on')) return;
    const ck = e.key.toLowerCase();
    if (ck === 'y' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); if (!e.repeat) confirmYes.click(); }
    else if (ck === 'n' || e.key === 'Escape') { e.preventDefault(); closeConfirm(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) (document.activeElement === confirmNo ? confirmNo : confirmYes).click();
    }
    else if (e.key === 'Tab') {
      e.preventDefault();
      (document.activeElement === confirmYes ? confirmNo : confirmYes).focus();
    }
    e.stopPropagation();
  }, true);

  function help() {
    line('available commands:');
    const cmds = [
      ['--help', 'show this help'],
      ['ls', 'list directories'],
      ['pwd', 'print working directory'],
      ['cd /dl', 'enter the download center'],
      ['manage /dl', 'manage files (login required)'],
      ['cd /files', 'open the file list'],
      ['cd /', 'back to home (closes this window)'],
      ['exit', 'close this window'],
      ['clear', 'clear the screen'],
      ['↑ / ↓', 'browse command history'],
    ];
    for (const [c, d] of cmds) rich([['  ' + c.padEnd(11), 'cmd'], [d, 'dim']]);
  }

  function go(url, label) {
    if (navigating) return;
    navigating = true;
    line('opening ' + label + ' ...', 'ok');
    input.disabled = true;
    setTimeout(() => { location.href = url; }, 520);
  }

  const maxBtn = document.getElementById('termMax');
  let maximized = false;
  function setMax(on, focus = true) {
    maximized = on;
    dlg.classList.toggle('max', on);
    const label = on ? '还原' : '最大化';
    maxBtn.setAttribute('aria-label', label);
    maxBtn.title = label;
    if (focus && !overlayOpen()) {
      const target = dlg.classList.contains('manage') ? manageList : dlg.classList.contains('tui') ? tuiList : input;
      if (target) target.focus({ preventScroll: true });
      if (!dlg.classList.contains('tui') && !dlg.classList.contains('manage')) body.scrollTop = body.scrollHeight;
    }
  }

  function closeTerm() {
    if (manageDeleting) return;
    if (navigating || !dlg.open) return;
    document.documentElement.classList.remove('term-open');
    tuiSeq++;
    tuiFiles = [];
    tuiMarks.clear();
    resetManage();
    closeConfirm(false);
    if (reduce.matches) return dlg.close();
    dlg.classList.add('closing');
    setTimeout(() => { dlg.classList.remove('closing'); dlg.close(); }, 160);
  }

  function run(raw) {
    const text = raw.trim();
    if (!text) return line('', '');
    line(PROMPT + ' ' + text, 'cmd');
    const low = text.toLowerCase();

    if (low === '--help' || low === 'help') return help();
    if (low === 'exit') { line('logout', 'dim'); return closeTerm(); }
    if (low === 'ls') return line('/dl/   /files/', 'dim');
    if (low === 'pwd') return line('/', 'dim');
    if (low === 'clear') { log.replaceChildren(); return; }

    const mm = text.match(/^manage(?:\s+(.*))?$/i);
    if (mm) {
      const arg = (mm[1] || '').trim();
      if (!arg) return line('usage: manage /dl', 'dim');
      const p = arg.replace(/\/+$/, '');
      if (!/^\/dl(?:\/|$)/i.test(p)) return line('manage: only /dl is supported', 'err');
      const sub = p.length > 3 ? p.slice(4).split('/').filter((x) => x && x !== '.' && x !== '..') : [];
      return enterManage(sub);
    }

    const m = text.match(/^cd(?:\s+(.*))?$/i);
    if (m) {
      let raw2 = (m[1] || '').trim();
      if (!raw2) raw2 = '~';
      let p = raw2.toLowerCase();
      if (p === '~' || p === '/' || p === '/~' || p === '~/') {
        line('logout', 'dim');
        return closeTerm();
      }
      p = p.replace(/\/+$/, '');
      if (!p) p = '/';
      if (p[0] !== '/') p = '/' + p;
      if (p === '/dl') return enterTui();
      if (p === '/files') return go('/files/', '/files/');
      return line('cd: no such file or directory: ' + raw2, 'err');
    }

    line('command not found: ' + text.split(/\s+/)[0], 'err');
  }

  function openTerm() {
    if (dlg.open || opening) return;
    opening = true;
    navigating = false;
    setMax(false, false);
    dlg.classList.remove('tui');
    tuiSeq++;
    tuiFiles = [];
    tuiPath = [];
    tuiMarks.clear();
    resetManage();
    closeConfirm(false);
    log.replaceChildren();
    input.value = '';
    input.disabled = false;
    // 同步 showModal + focus：iOS 只允许用户手势内唤起软键盘
    dlg.showModal();
    document.documentElement.classList.add('term-open');
    line('SJDHQTL OS 1.0  (tty0)', 'dim');
    line('type --help for available commands', 'dim');
    line('', '');
    input.focus({ preventScroll: true });
    opening = false;
  }

  // 命令历史：↑ 往前翻、↓ 往后翻，未提交的草稿会被保留
  const history = [];
  let histIdx = 0;
  let draft = '';
  const caretEnd = () => {
    const n = input.value.length;
    try { input.setSelectionRange(n, n); } catch {}
  };
  input.addEventListener('keydown', (e) => {
    if (input.disabled) return;
    if (e.key === 'ArrowUp') {
      if (!history.length) return;
      e.preventDefault();
      if (histIdx === history.length) draft = input.value;
      if (histIdx > 0) histIdx--;
      input.value = history[histIdx];
      caretEnd();
    } else if (e.key === 'ArrowDown') {
      if (histIdx >= history.length) return;
      e.preventDefault();
      histIdx++;
      input.value = histIdx === history.length ? draft : history[histIdx];
      caretEnd();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.disabled) return;
    const v = input.value;
    input.value = '';
    if (v.trim()) {
      history.push(v);
      if (history.length > 100) history.shift();
    }
    histIdx = history.length;
    draft = '';
    run(v);
  });
  // 模态框内显式循环 Tab，避免落在遮罩后的元素上
  dlg.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !dlg.open) return;
    let els;
    if (manageLoginEl.classList.contains('on')) {
      els = [manageUserNameInput, managePasswordInput, manageLoginBtn, manageLoginCancel];
    } else if (manageQrEl.classList.contains('on')) {
      els = [manageQrClose];
    } else if (confirmEl.classList.contains('on')) {
      els = [confirmYes, confirmNo];
    } else {
      els = [closeBtn, maxBtn, tuiList, manageList, input];
    }
    els = els.filter((el) => el.offsetParent !== null && !el.disabled);
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !dlg.contains(active)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else if (active === last || !dlg.contains(active)) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  });
  confirmYes.addEventListener('click', () => {
    const fn = confirmAction;
    closeConfirm(false);
    if (fn) fn();
    const target = dlg.classList.contains('manage') ? manageList : tuiList;
    if (target) target.focus({ preventScroll: true });
  });
  confirmNo.addEventListener('click', () => closeConfirm());
  confirmEl.addEventListener('click', (e) => { if (e.target === confirmEl) closeConfirm(); });

  closeBtn.addEventListener('click', closeTerm);
  maxBtn.addEventListener('click', () => setMax(!maximized));
  dlg.querySelector('.term-bar').addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    setMax(!maximized);
  });
  // 点外部区域不关闭，只把焦点送回当前视图；退出只有「红点」或 exit / cd /
  dlg.addEventListener('click', (e) => {
    if (overlayOpen()) return;
    if (e.target === dlg || (body.contains(e.target) && !closeBtn.contains(e.target))) {
      const target = dlg.classList.contains('manage') ? manageList : dlg.classList.contains('tui') ? tuiList : input;
      if (target) target.focus({ preventScroll: true });
    }
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    if (manageDeleting) return;
    if (manageLoginEl.classList.contains('on')) return cancelManageLogin();
    if (manageQrEl.classList.contains('on')) return closeManageQr();
    if (confirmEl.classList.contains('on')) return closeConfirm();
    input.focus({ preventScroll: true });
  });
  // 静默聚焦：焦点回到图标，但不显示焦点框（否则键盘 exit 后会多一个方框）
  dlg.addEventListener('close', () => {
    document.documentElement.classList.add('quiet-focus');
    link.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') document.documentElement.classList.remove('quiet-focus');
  }, true);
  document.addEventListener('pointerdown', () => {
    document.documentElement.classList.remove('quiet-focus');
  }, true);
  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openTerm();
  });
})();
