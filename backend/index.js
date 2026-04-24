const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const identity = {
  user_id: process.env.USER_ID || "yourname_ddmmyyyy",
  email_id: process.env.EMAIL_ID || "your.college@email.com",
  college_roll_number: process.env.COLLEGE_ROLL_NUMBER || "YOURROLLNUMBER",
};

app.use(cors());
app.use(express.json());

function normalizeEntry(rawEntry) {
  if (typeof rawEntry !== "string") {
    return "";
  }

  return rawEntry.trim();
}

function parseEntries(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const duplicateTracker = new Set();
  const seenEdges = new Set();
  const validEdges = [];

  for (const rawEntry of data) {
    const entry = normalizeEntry(rawEntry);
    const match = /^([A-Z])->([A-Z])$/.exec(entry);

    if (!entry || !match) {
      invalidEntries.push(entry);
      continue;
    }

    const [, parent, child] = match;

    if (parent === child) {
      invalidEntries.push(entry);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicateTracker.has(entry)) {
        duplicateEdges.push(entry);
        duplicateTracker.add(entry);
      }
      continue;
    }

    seenEdges.add(entry);
    validEdges.push({ parent, child, edge: entry });
  }

  return {
    validEdges,
    invalidEntries,
    duplicateEdges,
  };
}

function buildHierarchyTree(root, childrenMap) {
  const nodeChildren = childrenMap.get(root) || [];
  const branch = {};

  for (const child of nodeChildren) {
    branch[child] = buildHierarchyTree(child, childrenMap);
  }

  return branch;
}

function calculateDepth(root, childrenMap) {
  const nodeChildren = childrenMap.get(root) || [];

  if (nodeChildren.length === 0) {
    return 1;
  }

  let maxChildDepth = 0;

  for (const child of nodeChildren) {
    maxChildDepth = Math.max(maxChildDepth, calculateDepth(child, childrenMap));
  }

  return maxChildDepth + 1;
}

function detectCycle(componentNodes, childrenMap) {
  const colors = new Map();
  const componentSet = new Set(componentNodes);

  function visit(node) {
    colors.set(node, 1);

    for (const child of childrenMap.get(node) || []) {
      if (!componentSet.has(child)) {
        continue;
      }

      const color = colors.get(child) || 0;

      if (color === 1) {
        return true;
      }

      if (color === 0 && visit(child)) {
        return true;
      }
    }

    colors.set(node, 2);
    return false;
  }

  for (const node of componentNodes) {
    if ((colors.get(node) || 0) === 0 && visit(node)) {
      return true;
    }
  }

  return false;
}

function buildResponse(data) {
  const { validEdges, invalidEntries, duplicateEdges } = parseEntries(data);
  const nodeOrder = new Map();

  for (const { parent, child } of validEdges) {
    if (!nodeOrder.has(parent)) {
      nodeOrder.set(parent, nodeOrder.size);
    }

    if (!nodeOrder.has(child)) {
      nodeOrder.set(child, nodeOrder.size);
    }

  }

  const childrenMap = new Map();
  const undirectedMap = new Map();
  const parentByChild = new Map();
  const allNodes = new Set();

  for (const { parent, child } of validEdges) {
    if (parentByChild.has(child)) {
      continue;
    }

    parentByChild.set(child, parent);
    allNodes.add(parent);
    allNodes.add(child);

    if (!childrenMap.has(parent)) {
      childrenMap.set(parent, []);
    }

    if (!childrenMap.has(child)) {
      childrenMap.set(child, []);
    }

    if (!undirectedMap.has(parent)) {
      undirectedMap.set(parent, []);
    }

    if (!undirectedMap.has(child)) {
      undirectedMap.set(child, []);
    }

    childrenMap.get(parent).push(child);
    undirectedMap.get(parent).push(child);
    undirectedMap.get(child).push(parent);
  }

  const orderedNodes = Array.from(allNodes).sort(
    (left, right) => nodeOrder.get(left) - nodeOrder.get(right)
  );

  const visited = new Set();
  const components = [];

  for (const startNode of orderedNodes) {
    if (visited.has(startNode)) {
      continue;
    }

    const stack = [startNode];
    const componentNodes = [];
    visited.add(startNode);

    while (stack.length > 0) {
      const current = stack.pop();
      componentNodes.push(current);

      for (const neighbour of undirectedMap.get(current) || []) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          stack.push(neighbour);
        }
      }
    }

    componentNodes.sort((left, right) => nodeOrder.get(left) - nodeOrder.get(right));
    components.push(componentNodes);
  }

  const hierarchies = components
    .sort((left, right) => nodeOrder.get(left[0]) - nodeOrder.get(right[0]))
    .map((componentNodes) => {
      const roots = componentNodes.filter((node) => !parentByChild.has(node));
      const root =
        roots.length > 0
          ? roots.sort()[0]
          : [...componentNodes].sort()[0];

      const hasCycle = detectCycle(componentNodes, childrenMap);

      if (hasCycle) {
        return {
          root,
          tree: {},
          has_cycle: true,
        };
      }

      return {
        root,
        tree: {
          [root]: buildHierarchyTree(root, childrenMap),
        },
        depth: calculateDepth(root, childrenMap),
      };
    });

  let largestTreeRoot = "";
  let largestTreeDepth = 0;
  let totalTrees = 0;
  let totalCycles = 0;

  for (const hierarchy of hierarchies) {
    if (hierarchy.has_cycle) {
      totalCycles += 1;
      continue;
    }

    totalTrees += 1;

    if (
      hierarchy.depth > largestTreeDepth ||
      (hierarchy.depth === largestTreeDepth &&
        (largestTreeRoot === "" || hierarchy.root < largestTreeRoot))
    ) {
      largestTreeDepth = hierarchy.depth;
      largestTreeRoot = hierarchy.root;
    }
  }

  return {
    ...identity,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  };
}

app.get("/", (request, response) => {
  response.json({
    message: "BFHL hierarchy API is running.",
    endpoint: "/bfhl",
  });
});

app.post("/bfhl", (request, response) => {
  const { data } = request.body || {};

  if (!Array.isArray(data)) {
    return response.status(400).json({
      error: "Request body must include a `data` array.",
    });
  }

  return response.json(buildResponse(data));
});

app.listen(PORT, () => {
  console.log(`BFHL API listening on port ${PORT}`);
});
