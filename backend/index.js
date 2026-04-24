const express = require("express");
const cors = require("cors");
const path = require("path");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

const identity = {
  user_id: "adithya_harish",
  email_id: "ah6199@srmist.edu.in",
  college_roll_number: "RA2311003020327",
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

function normalize(input) {
  if (typeof input !== "string") return "";
  return input.trim();
}

function processData(list) {
  const bad = [];
  const dups = [];
  const dupCheck = new Set();
  const seen = new Set();
  const valid = [];

  for (const raw of list) {
    const entry = normalize(raw);
    const parts = /^([A-Z])->([A-Z])$/.exec(entry);

    if (!entry || !parts) {
      bad.push(entry);
      continue;
    }

    const [, p, c] = parts;

    if (p === c) {
      bad.push(entry);
      continue;
    }

    if (seen.has(entry)) {
      if (!dupCheck.has(entry)) {
        dups.push(entry);
        dupCheck.add(entry);
      }
      continue;
    }

    seen.add(entry);
    valid.push({ p, c, full: entry });
  }

  return { valid, bad, dups };
}

function getTree(node, map) {
  const children = map.get(node) || [];
  const obj = {};
  for (const child of children) {
    obj[child] = getTree(child, map);
  }
  return obj;
}

function getDepth(node, map) {
  const children = map.get(node) || [];
  if (children.length === 0) return 1;
  let max = 0;
  for (const child of children) {
    max = Math.max(max, getDepth(child, map));
  }
  return max + 1;
}

function hasCycle(nodes, map) {
  const status = new Map();
  const set = new Set(nodes);

  function walk(n) {
    status.set(n, 1);
    for (const child of map.get(n) || []) {
      if (!set.has(child)) continue;
      const s = status.get(child) || 0;
      if (s === 1) return true;
      if (s === 0 && walk(child)) return true;
    }
    status.set(n, 2);
    return false;
  }

  for (const n of nodes) {
    if ((status.get(n) || 0) === 0 && walk(n)) return true;
  }
  return false;
}

function createFinalOutput(data) {
  const { valid, bad, dups } = processData(data);
  const order = new Map();

  for (const { p, c } of valid) {
    if (!order.has(p)) order.set(p, order.size);
    if (!order.has(c)) order.set(c, order.size);
  }

  const adj = new Map();
  const graph = new Map();
  const parents = new Map();
  const nodes = new Set();

  for (const { p, c } of valid) {
    if (parents.has(c)) continue;
    parents.set(c, p);
    nodes.add(p);
    nodes.add(c);

    if (!adj.has(p)) adj.set(p, []);
    if (!adj.has(c)) adj.set(c, []);
    if (!graph.has(p)) graph.set(p, []);
    if (!graph.has(c)) graph.set(c, []);

    adj.get(p).push(c);
    graph.get(p).push(c);
    graph.get(c).push(p);
  }

  const sorted = Array.from(nodes).sort((a, b) => order.get(a) - order.get(b));
  const visited = new Set();
  const groups = [];

  for (const start of sorted) {
    if (visited.has(start)) continue;
    const q = [start];
    const group = [];
    visited.add(start);
    while (q.length > 0) {
      const cur = q.pop();
      group.push(cur);
      for (const next of graph.get(cur) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          q.push(next);
        }
      }
    }
    group.sort((a, b) => order.get(a) - order.get(b));
    groups.push(group);
  }

  const results = groups
    .sort((a, b) => order.get(a[0]) - order.get(b[0]))
    .map((g) => {
      const roots = g.filter((n) => !parents.has(n));
      const root = roots.length > 0 ? roots.sort()[0] : [...g].sort()[0];
      const cyclic = hasCycle(g, adj);

      if (cyclic) {
        return { root, tree: {}, has_cycle: true };
      }

      return {
        root,
        tree: { [root]: getTree(root, adj) },
        depth: getDepth(root, adj),
      };
    });

  let topRoot = "";
  let topDepth = 0;
  let treeCount = 0;
  let cycleCount = 0;

  for (const r of results) {
    if (r.has_cycle) {
      cycleCount++;
      continue;
    }
    treeCount++;
    if (r.depth > topDepth || (r.depth === topDepth && (topRoot === "" || r.root < topRoot))) {
      topDepth = r.depth;
      topRoot = r.root;
    }
  }

  return {
    ...identity,
    hierarchies: results,
    invalid_entries: bad,
    duplicate_edges: dups,
    summary: {
      total_trees: treeCount,
      total_cycles: cycleCount,
      largest_tree_root: topRoot,
    },
  };
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    info: "BFHL API running",
  });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.post("/bfhl", (req, res) => {
  const { data } = req.body || {};
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid input" });
  }
  res.json(createFinalOutput(data));
});

const BOT_URL = "https://bajaj-test-backend-finq.onrender.com/ping";
setInterval(() => {
  https.get(BOT_URL, (res) => {
    console.log("Ping sent: " + res.statusCode);
  }).on("error", (e) => {
    console.log("Ping error: " + e.message);
  });
}, 14 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});
