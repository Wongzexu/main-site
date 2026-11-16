const USER = 'admin';
const KEY = 'dl_pass';
const rows = document.getElementById('rows');

function basicAuth(user, pw){
  const bytes = new TextEncoder().encode(user + ':' + pw);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'Basic ' + btoa(bin);
}

function fmt(n){
  if(!n) return '0 B';
  if(n < 1024) return n + ' B';
  const u = ['KB','MB','GB','TB']; let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return n.toFixed(1) + ' ' + u[i];
}

async function load(){
  rows.innerHTML = '<tr><td colspan="4" class="muted">加载中…</td></tr>';
  try {
    const r = await fetch('/api/list/', {headers:{'Accept':'application/json'}});
    const arr = await r.json();
    const files = arr.filter(x => x.type === 'file' && x.name !== 'index.html');
    if (!files.length) {
      rows.innerHTML = '<tr><td colspan="4" class="muted">（暂无文件）</td></tr>';
      return;
    }
    rows.innerHTML = '';
    for (const f of files) {
      const tr = document.createElement('tr');

      const td1 = document.createElement('td');
      td1.className = 'n';
      const a = document.createElement('a');
      a.href = '/files/' + encodeURIComponent(f.name);
      a.textContent = f.name;
      td1.appendChild(a);

      const td2 = document.createElement('td');
      td2.className = 'muted';
      td2.textContent = fmt(f.size);

      const td3 = document.createElement('td');
      td3.className = 'muted';
      td3.textContent = (f.mtime || '').replace(' GMT','');

      const td4 = document.createElement('td');
      td4.className = 'actions';
      const qbtn = document.createElement('button');
      qbtn.textContent = '二维码';
      qbtn.onclick = () => showQR(f.name);
      const btn = document.createElement('button');
      btn.className = 'del';
      btn.textContent = '删除';
      btn.onclick = () => del(f.name);
      td4.append(qbtn, btn);

      tr.append(td1, td2, td3, td4);
      rows.appendChild(tr);
    }
  } catch (e) {
    rows.innerHTML = '<tr><td colspan="4" class="muted">加载失败</td></tr>';
  }
}

function showQR(name){
  const url = location.origin + '/files/' + encodeURIComponent(name);
  document.getElementById('qrname').textContent = name;
  document.getElementById('qrurl').textContent = url;
  const box = document.getElementById('qrimg');
  box.innerHTML = '';
  new QRCode(box, {text: url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M});
  document.getElementById('qrbox').classList.add('on');
}

function closeQR(){
  document.getElementById('qrbox').classList.remove('on');
}

let deleting = false;
async function del(name){
  if (deleting) return;
  let pw = sessionStorage.getItem(KEY);
  if (!pw) {
    pw = prompt('输入删除密码：');
    if (!pw) return;
    sessionStorage.setItem(KEY, pw);
  }
  if (!confirm('确定删除 ' + name + ' ?')) return;
  deleting = true;
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(button => button.disabled = true);
  const status = document.getElementById('deleteStatus');
  status.textContent = '正在删除：' + name;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const r = await fetch('/files/' + encodeURIComponent(name), {
      method: 'DELETE', headers: {Authorization: basicAuth(USER, pw)}, signal: controller.signal
    });
    if (r.ok) {
      await load();
      status.textContent = '已删除：' + name;
    } else if (r.status === 401) {
      sessionStorage.removeItem(KEY);
      status.textContent = '密码已失效，请重新输入密码并确认删除。';
    } else {
      status.textContent = '删除失败：HTTP ' + r.status + '（' + name + '）';
    }
  } catch (err) {
    status.textContent = (err.name === 'AbortError' ? '请求超时' : '网络异常') + '，请刷新确认文件状态后重试。';
  } finally {
    clearTimeout(timeout);
    deleting = false;
    buttons.forEach(button => button.disabled = false);
  }
}

document.getElementById('save').onclick = () => {
  const v = document.getElementById('pw').value.trim();
  if (!v) { alert('请输入密码'); return; }
  sessionStorage.setItem(KEY, v);
  document.getElementById('pw').value = '';
  alert('已保存（本标签页有效）');
};
document.getElementById('refresh').onclick = load;
load();
