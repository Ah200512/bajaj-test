const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

var user = {
  user_id: 'adithya_harish',
  email_id: 'ah6199@srmist.edu.in',
  college_roll_number: 'RA2311003020327'
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function getD(n, m) {
  let list = m.get(n) || [];
  if (list.length == 0) return 1;
  let max = 0;
  for (let x = 0; x < list.length; x++) {
    let d = getD(list[x], m);
    if (d > max) max = d;
  }
  return max + 1;
}

function findLoop(items, m) {
  let v = {};
  let s = new Set(items);
  let has = false;

  const trace = (curr) => {
    v[curr] = 1;
    let nxt = m.get(curr) || [];
    for (let k of nxt) {
      if (!s.has(k)) continue;
      if (v[k] === 1) { has = true; return; }
      if (!v[k]) trace(k);
      if (has) return;
    }
    v[curr] = 2;
  };

  for (let i = 0; i < items.length; i++) {
    if (!v[items[i]]) trace(items[i]);
    if (has) break;
  }
  return has;
}

function makeObj(n, m) {
  let kids = m.get(n) || [];
  let out = {};
  for (let k of kids) {
    out[k] = makeObj(k, m);
  }
  return out;
}

function runAnalysis(rawList) {
  let invalid = [];
  let dupes = [];
  let track = new Set();
  let seenEdges = new Set();
  let pairs = [];

  for (let item of rawList) {
    let t = (item || '').toString().trim();
    let bit = /^([A-Z])->([A-Z])$/.exec(t);

    if (!t || !bit) {
      invalid.push(t);
    } else if (bit[1] === bit[2]) {
      invalid.push(t);
    } else {
      if (seenEdges.has(t)) {
        if (!track.has(t)) {
          dupes.push(t);
          track.add(t);
        }
      } else {
        seenEdges.add(t);
        pairs.push({ from: bit[1], to: bit[2], str: t });
      }
    }
  }

  let nodeRank = new Map();
  pairs.forEach(p => {
    if (!nodeRank.has(p.from)) nodeRank.set(p.from, nodeRank.size);
    if (!nodeRank.has(p.to)) nodeRank.set(p.to, nodeRank.size);
  });

  let links = new Map();
  let bi = new Map();
  let childToParent = new Map();
  let allNodes = new Set();

  pairs.forEach(p => {
    if (childToParent.has(p.to)) return;
    childToParent.set(p.to, p.from);
    allNodes.add(p.from);
    allNodes.add(p.to);

    if (!links.has(p.from)) links.set(p.from, []);
    if (!links.has(p.to)) links.set(p.to, []);
    if (!bi.has(p.from)) bi.set(p.from, []);
    if (!bi.has(p.to)) bi.set(p.to, []);

    links.get(p.from).push(p.to);
    bi.get(p.from).push(p.to);
    bi.get(p.to).push(p.from);
  });

  let sorted = Array.from(allNodes).sort((a, b) => nodeRank.get(a) - nodeRank.get(b));
  let visited = new Set();
  let sets = [];

  for (let n of sorted) {
    if (visited.has(n)) continue;
    let stack = [n];
    let group = [];
    visited.add(n);
    while (stack.length) {
      let c = stack.pop();
      group.push(c);
      (bi.get(c) || []).forEach(nx => {
        if (!visited.has(nx)) {
          visited.add(nx);
          stack.push(nx);
        }
      });
    }
    group.sort((a, b) => nodeRank.get(a) - nodeRank.get(b));
    sets.push(group);
  }

  let trees = sets
    .sort((a, b) => nodeRank.get(a[0]) - nodeRank.get(b[0]))
    .map(g => {
      let heads = g.filter(n => !childToParent.has(n));
      let head = heads.length > 0 ? heads.sort()[0] : [...g].sort()[0];
      let cyclic = findLoop(g, links);

      if (cyclic) return { root: head, tree: {}, has_cycle: true };
      return {
        root: head,
        tree: { [head]: makeObj(head, links) },
        depth: getD(head, links)
      };
    });

  let top = '';
  let max = 0;
  let tC = 0, cC = 0;

  trees.forEach(t => {
    if (t.has_cycle) {
      cC++;
    } else {
      tC++;
      if (t.depth > max || (t.depth === max && (top === '' || t.root < top))) {
        max = t.depth;
        top = t.root;
      }
    }
  });

  return {
    ...user,
    hierarchies: trees,
    invalid_entries: invalid,
    duplicate_edges: dupes,
    summary: { total_trees: tC, total_cycles: cC, largest_tree_root: top }
  };
}

app.post('/bfhl', (req, res) => {
  let d = req.body.data;
  if (!d || !Array.isArray(d)) return res.status(400).send('error');
  res.json(runAnalysis(d));
});

app.get('/ping', (q, s) => s.send('ok'));
app.get('/', (q, s) => s.json({ status: 'ok' }));

const keeper = 'https://bajaj-test-backend-finq.onrender.com/ping';
setInterval(() => {
  https.get(keeper, (r) => {}).on('error', e => {});
}, 800000 + Math.random() * 50000);

app.listen(PORT, () => console.log('running'));
