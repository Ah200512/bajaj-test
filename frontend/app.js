const examples = ["A->B", "A->C", "B->D", "C->E", "X->Y", "Y->Z", "Z->X"];

const urlInp = document.getElementById("api-base-url");
const textInp = document.getElementById("node-input");
const goBtn = document.getElementById("submit-button");
const clearBtn = document.getElementById("clear-button");
const sampleBtn = document.getElementById("fill-sample");
const banner = document.getElementById("status-banner");
const statusTxt = document.getElementById("request-state");
const emptyView = document.getElementById("response-empty");
const resBox = document.getElementById("response-content");
const userGrid = document.getElementById("identity-grid");
const sumGrid = document.getElementById("summary-grid");
const treeList = document.getElementById("hierarchy-list");
const listGrid = document.getElementById("lists-grid");

urlInp.value = window.APP_CONFIG?.apiBaseUrl || "";

function showMsg(m, type) {
  banner.textContent = m;
  banner.className = `status-banner ${type}`;
}

const clearMsg = () => {
  banner.textContent = "";
  banner.className = "status-banner hidden";
};

function makeCard(l, v, cls) {
  let d = document.createElement("article");
  d.className = cls;
  let p1 = document.createElement("p");
  p1.className = "card-label";
  p1.textContent = l;
  let p2 = document.createElement("p");
  p2.className = "card-value";
  p2.textContent = v;
  d.append(p1, p2);
  return d;
}

function buildTree(n, sub) {
  let li = document.createElement("li");
  let span = document.createElement("span");
  span.className = "tree-node";
  span.textContent = n;
  li.appendChild(span);

  let kids = Object.entries(sub);
  if (kids.length > 0) {
    let ul = document.createElement("ul");
    ul.className = "tree-list";
    kids.forEach(([k, v]) => ul.appendChild(buildTree(k, v)));
    li.appendChild(ul);
  }
  return li;
}

const renderGraph = (h, i) => {
  let box = document.createElement("article");
  box.className = "hierarchy-card";
  
  let h3 = document.createElement("h3");
  h3.textContent = `Graph ${i + 1}: Root ${h.root}`;

  let row = document.createElement("div");
  row.className = "badge-row";

  let b1 = document.createElement("span");
  b1.className = `badge ${h.has_cycle ? "cycle" : "tree"}`;
  b1.textContent = h.has_cycle ? "Cycle" : "Tree";
  row.appendChild(b1);

  if (!h.has_cycle) {
    let b2 = document.createElement("span");
    b2.className = "badge depth";
    b2.textContent = `Depth ${h.depth}`;
    row.appendChild(b2);
  }

  let shell = document.createElement("div");
  shell.className = "tree-shell";

  if (h.has_cycle) {
    shell.textContent = "Cycle found - no tree view";
  } else {
    let rootKey = Object.keys(h.tree)[0];
    if (rootKey) {
      let ul = document.createElement("ul");
      ul.className = "tree-list";
      ul.appendChild(buildTree(rootKey, h.tree[rootKey]));
      shell.appendChild(ul);
    }
  }

  box.append(h3, row, shell);
  return box;
};

function renderList(h, items) {
  let d = document.createElement("article");
  d.className = "list-card";
  let p = document.createElement("p");
  p.className = "card-label";
  p.textContent = h;
  d.appendChild(p);

  if (items.length === 0) {
    let p2 = document.createElement("p");
    p2.className = "list-empty";
    p2.textContent = "None";
    d.appendChild(p2);
  } else {
    let ul = document.createElement("ul");
    ul.className = "list-items";
    items.forEach(it => {
      let li = document.createElement("li");
      li.textContent = it;
      ul.appendChild(li);
    });
    d.appendChild(ul);
  }
  return d;
}

function parseInput(val) {
  let s = val.trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    let arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.map(String) : [];
  }
  return s.split(/[\n,]+/).map(x => x.trim()).filter(x => x.length > 0);
}

function draw(res) {
  emptyView.classList.add("hidden");
  resBox.classList.remove("hidden");

  userGrid.innerHTML = "";
  sumGrid.innerHTML = "";
  treeList.innerHTML = "";
  listGrid.innerHTML = "";

  userGrid.append(
    makeCard("User", res.user_id, "info-card"),
    makeCard("Contact", res.email_id, "info-card"),
    makeCard("Roll", res.college_roll_number, "info-card")
  );

  sumGrid.append(
    makeCard("Trees", res.summary.total_trees, "summary-card"),
    makeCard("Cycles", res.summary.total_cycles, "summary-card"),
    makeCard("Max Root", res.summary.largest_tree_root || "None", "summary-card")
  );

  res.hierarchies.forEach((h, i) => treeList.appendChild(renderGraph(h, i)));
  listGrid.append(
    renderList("Invalid", res.invalid_entries),
    renderList("Duplicates", res.duplicate_edges)
  );
}

goBtn.addEventListener("click", async () => {
  clearMsg();
  statusTxt.textContent = "working...";
  
  let data;
  try {
    data = parseInput(textInp.value);
  } catch (err) {
    statusTxt.textContent = "error";
    showMsg("Bad input format", "error");
    return;
  }

  let api = urlInp.value.trim().replace(/\/$/, "");
  if (!api) {
    statusTxt.textContent = "no url";
    showMsg("Where is the API URL?", "error");
    return;
  }

  goBtn.disabled = true;
  try {
    let r = await fetch(`${api}/bfhl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    let json = await r.json();
    if (!r.ok) throw new Error(json.error || "failed");
    draw(json);
    statusTxt.textContent = "done";
    showMsg("Success", "success");
  } catch (e) {
    statusTxt.textContent = "fail";
    showMsg(e.message, "error");
  } finally {
    goBtn.disabled = false;
  }
});

sampleBtn.onclick = () => {
  textInp.value = examples.join("\n");
  clearMsg();
  statusTxt.textContent = "sample in";
};

clearBtn.onclick = () => {
  textInp.value = "";
  userGrid.innerHTML = "";
  sumGrid.innerHTML = "";
  treeList.innerHTML = "";
  listGrid.innerHTML = "";
  resBox.classList.add("hidden");
  emptyView.classList.remove("hidden");
  statusTxt.textContent = "cleared";
  clearMsg();
};
