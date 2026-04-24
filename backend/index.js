const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

var me = {
  user_id: "adithya_harish",
  email_id: "ah6199@srmist.edu.in",
  college_roll_number: "RA2311003020327"
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function clean(str) {
  if (typeof str !== 'string') return "";
  return str.trim();
}

function parse(list) {
  let bad = [];
  let dups = [];
  let dupSet = new Set();
  let seen = new Set();
  let ok = [];

  for (let i = 0; i < list.length; i++) {
    let raw = list[i];
    let s = clean(raw);
    let check = /^([A-Z])->([A-Z])$/.exec(s);

    if (!s || !check) {
      bad.push(s);
      continue;
    }

    let p = check[1];
    let c = check[2];

    if (p === c) {
      bad.push(s);
      continue;
    }

    if (seen.has(s)) {
      if (!dupSet.has(s)) {
        dups.push(s);
        dupSet.add(s);
      }
      continue;
    }

    seen.add(s);
    ok.push({ p, c, val: s });
  }
  return { ok, bad, dups };
}

function build(n, m) {
  let kids = m.get(n) || [];
  let res = {};
  kids.forEach(k => {
    res[k] = build(k, m);
  });
  return res;
}

function depth(n, m) {
  let kids = m.get(n) || [];
  if (kids.length === 0) return 1;
  let d = 0;
  for (let k of kids) {
    let cur = depth(k, m);
    if (cur > d) d = cur;
  }
  return d + 1;
}

function cyclic(arr, m) {
  let state = {}; 
  let nodes = new Set(arr);

  function go(v) {
    state[v] = 1;
    let next = m.get(v) || [];
    for (let n of next) {
      if (!nodes.has(n)) continue;
      if (state[n] === 1) return true;
      if (!state[n] && go(n)) return true;
    }
    state[v] = 2;
    return false;
  }

  for (let n of arr) {
    if (!state[n] && go(n)) return true;
  }
  return false;
}

function solve(input) {
  let { ok, bad, dups } = parse(input);
  let order = new Map();

  ok.forEach(e => {
    if (!order.has(e.p)) order.set(e.p, order.size);
    if (!order.has(e.c)) order.set(e.c, order.size);
  });

  let adj = new Map();
  let full = new Map();
  let parentMap = new Map();
  let all = new Set();

  ok.forEach(e => {
    if (parentMap.has(e.c)) return;
    parentMap.set(e.c, e.p);
    all.add(e.p);
    all.add(e.c);

    if (!adj.has(e.p)) adj.set(e.p, []);
    if (!adj.has(e.c)) adj.set(e.c, []);
    if (!full.has(e.p)) full.set(e.p, []);
    if (!full.has(e.c)) full.set(e.c, []);

    adj.get(e.p).push(e.c);
    full.get(e.p).push(e.c);
    full.get(e.c).push(e.p);
  });

  let sortedNodes = Array.from(all).sort((a, b) => order.get(a) - order.get(b));
  let done = new Set();
  let components = [];

  for (let startNode of sortedNodes) {
    if (done.has(startNode)) continue;
    let stack = [startNode];
    let comp = [];
    done.add(startNode);
    while (stack.length > 0) {
      let curr = stack.pop();
      comp.push(curr);
      (full.get(curr) || []).forEach(nbr => {
        if (!done.has(nbr)) {
          done.add(nbr);
          stack.push(nbr);
        }
      });
    }
    comp.sort((a, b) => order.get(a) - order.get(b));
    components.push(comp);
  }

  let finalTrees = components
    .sort((a, b) => order.get(a[0]) - order.get(b[0]))
    .map(comp => {
      let roots = comp.filter(n => !parentMap.has(n));
      let root = roots.length > 0 ? roots.sort()[0] : [...comp].sort()[0];
      let isCyclic = cyclic(comp, adj);

      if (isCyclic) return { root, tree: {}, has_cycle: true };

      return {
        root,
        tree: { [root]: build(root, adj) },
        depth: depth(root, adj)
      };
    });

  let bigRoot = "";
  let maxD = 0;
  let tCount = 0;
  let cCount = 0;

  finalTrees.forEach(t => {
    if (t.has_cycle) {
      cCount++;
    } else {
      tCount++;
      if (t.depth > maxD || (t.depth === maxD && (bigRoot === "" || t.root < bigRoot))) {
        maxD = t.depth;
        bigRoot = t.root;
      }
    }
  });

  return {
    ...me,
    hierarchies: finalTrees,
    invalid_entries: bad,
    duplicate_edges: dups,
    summary: {
      total_trees: tCount,
      total_cycles: cCount,
      largest_tree_root: bigRoot
    }
  };
}

app.get('/', (req, res) => {
  res.json({ msg: "api online" });
});

app.get('/ping', (req, res) => {
  res.send('alive');
});

app.post('/bfhl', (req, res) => {
  let data = req.body.data;
  if (!Array.isArray(data)) {
    return res.status(400).send("bad data");
  }
  console.log("processing request...");
  res.json(solve(data));
});

let url = "https://bajaj-test-backend-finq.onrender.com/ping";
setInterval(() => {
  https.get(url, (r) => {
    // console.log("keepalive ok");
  }).on('error', e => console.log("ping fail"));
}, 840000);

app.listen(PORT, () => {
  console.log("app started on " + PORT);
});
