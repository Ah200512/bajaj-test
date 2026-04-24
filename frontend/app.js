const samples = ['A->B', 'A->C', 'B->D', 'C->E', 'X->Y', 'Y->Z', 'Z->X'];

const apiFld = document.getElementById('inpApi');
const area = document.getElementById('txtData');
const startBtn = document.getElementById('btnRun');
const resetBtn = document.getElementById('btnReset');
const loadBtn = document.getElementById('btnLoad');
const note = document.getElementById('msgBox');
const stat = document.getElementById('lblStatus');
const boxWait = document.getElementById('viewWait');
const boxRes = document.getElementById('viewResults');
const uGrid = document.getElementById('gridUser');
const sGrid = document.getElementById('gridStat');
const gList = document.getElementById('listGraphs');
const eGrid = document.getElementById('gridErr');

apiFld.value = window.APP_CONFIG?.apiBaseUrl || '';

const log = (m, c) => {
  note.textContent = m;
  note.className = `status-banner ${c}`;
};

const hideLog = () => {
  note.textContent = '';
  note.className = 'status-banner hidden';
};

function addCard(t, v, cls) {
  let el = document.createElement('article');
  el.className = cls;
  let l = document.createElement('p');
  l.className = 'card-label';
  l.textContent = t;
  let val = document.createElement('p');
  val.className = 'card-value';
  val.textContent = v;
  el.append(l, val);
  return el;
}

function walk(n, obj) {
  let i = document.createElement('li');
  let s = document.createElement('span');
  s.className = 'tree-node';
  s.textContent = n;
  i.appendChild(s);

  let keys = Object.keys(obj);
  if (keys.length > 0) {
    let u = document.createElement('ul');
    u.className = 'tree-list';
    for (let k of keys) {
      u.appendChild(walk(k, obj[k]));
    }
    i.appendChild(u);
  }
  return i;
}

function showGraph(h, idx) {
  let c = document.createElement('article');
  c.className = 'hierarchy-card';
  let t = document.createElement('h3');
  t.textContent = `Graph ${idx + 1}: Root ${h.root}`;
  let r = document.createElement('div');
  r.className = 'badge-row';

  let b1 = document.createElement('span');
  b1.className = `badge ${h.has_cycle ? 'cycle' : 'tree'}`;
  b1.textContent = h.has_cycle ? 'Cycle' : 'Tree';
  r.appendChild(b1);

  if (!h.has_cycle) {
    let b2 = document.createElement('span');
    b2.className = 'badge depth';
    b2.textContent = `Depth ${h.depth}`;
    r.appendChild(b2);
  }

  let out = document.createElement('div');
  out.className = 'tree-shell';
  if (h.has_cycle) {
    out.textContent = 'Cyclic - no tree';
  } else {
    let k = Object.keys(h.tree)[0];
    if (k) {
      let list = document.createElement('ul');
      list.className = 'tree-list';
      list.appendChild(walk(k, h.tree[k]));
      out.appendChild(list);
    }
  }

  c.append(t, r, out);
  return c;
}

function buildList(h, data) {
  let b = document.createElement('article');
  b.className = 'list-card';
  let t = document.createElement('p');
  t.className = 'card-label';
  t.textContent = h;
  b.appendChild(t);

  if (data.length === 0) {
    let p = document.createElement('p');
    p.className = 'list-empty';
    p.textContent = 'Empty';
    b.appendChild(p);
  } else {
    let list = document.createElement('ul');
    list.className = 'list-items';
    data.forEach(x => {
      let li = document.createElement('li');
      li.textContent = x;
      list.appendChild(li);
    });
    b.appendChild(list);
  }
  return b;
}

async function start() {
  hideLog();
  stat.textContent = 'working...';
  
  let list;
  try {
    let val = area.value.trim();
    if (!val) list = [];
    else if (val.startsWith('[')) list = JSON.parse(val);
    else list = val.split(/[\n,]+/).map(s => s.trim()).filter(x => x);
  } catch (e) {
    stat.textContent = 'error';
    log('Check input format', 'error');
    return;
  }

  let base = apiFld.value.trim().replace(/\/$/, '');
  if (!base) {
    stat.textContent = 'no-url';
    log('API URL is missing', 'error');
    return;
  }

  startBtn.disabled = true;
  try {
    let res = await fetch(`${base}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: list })
    });
    let body = await res.json();
    if (!res.ok) throw new Error(body.error || 'failed');

    boxWait.classList.add('hidden');
    boxRes.classList.remove('hidden');
    uGrid.innerHTML = '';
    sGrid.innerHTML = '';
    gList.innerHTML = '';
    eGrid.innerHTML = '';

    uGrid.append(
      addCard('User', body.user_id, 'info-card'),
      addCard('Contact', body.email_id, 'info-card'),
      addCard('Roll', body.college_roll_number, 'info-card')
    );

    sGrid.append(
      addCard('Trees', body.summary.total_trees, 'summary-card'),
      addCard('Cycles', body.summary.total_cycles, 'summary-card'),
      addCard('Max Root', body.summary.largest_tree_root || 'N/A', 'summary-card')
    );

    body.hierarchies.forEach((h, i) => gList.appendChild(showGraph(h, i)));
    eGrid.append(
      buildList('Invalid', body.invalid_entries),
      buildList('Duplicates', body.duplicate_edges)
    );

    stat.textContent = 'finished';
    log('Done', 'success');
  } catch (err) {
    stat.textContent = 'failed';
    log(err.message, 'error');
  } finally {
    startBtn.disabled = false;
  }
}

startBtn.onclick = start;

loadBtn.onclick = () => {
  area.value = samples.join('\n');
  hideLog();
  stat.textContent = 'ready';
};

resetBtn.onclick = () => {
  area.value = '';
  uGrid.innerHTML = '';
  sGrid.innerHTML = '';
  gList.innerHTML = '';
  eGrid.innerHTML = '';
  boxRes.classList.add('hidden');
  boxWait.classList.remove('hidden');
  stat.textContent = 'reset';
  hideLog();
};
