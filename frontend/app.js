const defaultSamples = [
  "A->B",
  "A->C",
  "B->D",
  "C->E",
  "X->Y",
  "Y->Z",
  "Z->X"
];

const apiEndpointInput = document.getElementById("api-base-url");
const edgeInputArea = document.getElementById("node-input");
const btnProcess = document.getElementById("submit-button");
const btnReset = document.getElementById("clear-button");
const btnLoadSample = document.getElementById("fill-sample");
const alertBanner = document.getElementById("status-banner");
const progressText = document.getElementById("request-state");
const emptyView = document.getElementById("response-empty");
const resultsContainer = document.getElementById("response-content");
const userIdentityBox = document.getElementById("identity-grid");
const statsGrid = document.getElementById("summary-grid");
const treeView = document.getElementById("hierarchy-list");
const errorLists = document.getElementById("lists-grid");

apiEndpointInput.value = window.APP_CONFIG?.apiBaseUrl || "";

function updateAlert(msg, level) {
  alertBanner.textContent = msg;
  alertBanner.className = `status-banner ${level}`;
}

function resetAlert() {
  alertBanner.textContent = "";
  alertBanner.className = "status-banner hidden";
}

function createCardElement(lbl, val, styleClass) {
  const box = document.createElement("article");
  box.className = styleClass;

  const title = document.createElement("p");
  title.className = "card-label";
  title.textContent = lbl;

  const text = document.createElement("p");
  text.className = "card-value";
  text.textContent = val;

  box.append(title, text);
  return box;
}

function generateTreeNode(name, subTree) {
  const li = document.createElement("li");
  const nodeEl = document.createElement("span");
  nodeEl.className = "tree-node";
  nodeEl.textContent = name;
  li.appendChild(nodeEl);

  const entries = Object.entries(subTree);
  if (entries.length > 0) {
    const ul = document.createElement("ul");
    ul.className = "tree-list";
    for (const [key, val] of entries) {
      ul.appendChild(generateTreeNode(key, val));
    }
    li.appendChild(ul);
  }
  return li;
}

function createHierarchyView(data, idx) {
  const card = document.createElement("article");
  card.className = "hierarchy-card";

  const head = document.createElement("h3");
  head.textContent = `Graph ${idx + 1}: Root ${data.root}`;

  const tags = document.createElement("div");
  tags.className = "badge-row";

  const statusTag = document.createElement("span");
  statusTag.className = `badge ${data.has_cycle ? "cycle" : "tree"}`;
  statusTag.textContent = data.has_cycle ? "Cycle" : "Tree";
  tags.appendChild(statusTag);

  if (!data.has_cycle) {
    const dTag = document.createElement("span");
    dTag.className = "badge depth";
    dTag.textContent = `Depth ${data.depth}`;
    tags.appendChild(dTag);
  }

  const outputBox = document.createElement("div");
  outputBox.className = "tree-shell";

  if (data.has_cycle) {
    outputBox.textContent = "Cycle detected; tree structure suppressed.";
  } else {
    const entries = Object.entries(data.tree);
    if (entries.length > 0) {
      const [rootKey, rootVal] = entries[0];
      const list = document.createElement("ul");
      list.className = "tree-list";
      list.appendChild(generateTreeNode(rootKey, rootVal));
      outputBox.appendChild(list);
    }
  }

  card.append(head, tags, outputBox);
  return card;
}

function createListView(header, items) {
  const box = document.createElement("article");
  box.className = "list-card";

  const title = document.createElement("p");
  title.className = "card-label";
  title.textContent = header;
  box.appendChild(title);

  if (!items.length) {
    const noneText = document.createElement("p");
    noneText.className = "list-empty";
    noneText.textContent = "None";
    box.appendChild(noneText);
    return box;
  }

  const ul = document.createElement("ul");
  ul.className = "list-items";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}

function processRawInput(text) {
  const val = text.trim();
  if (!val) return [];

  if (val.startsWith("[")) {
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) throw new Error("Input must be a JSON array.");
    return parsed.map(String);
  }

  return val.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
}

function displayResults(res) {
  emptyView.classList.add("hidden");
  resultsContainer.classList.remove("hidden");

  userIdentityBox.innerHTML = "";
  statsGrid.innerHTML = "";
  treeView.innerHTML = "";
  errorLists.innerHTML = "";

  userIdentityBox.append(
    createCardElement("User", res.user_id, "info-card"),
    createCardElement("Contact", res.email_id, "info-card"),
    createCardElement("ID", res.college_roll_number, "info-card")
  );

  statsGrid.append(
    createCardElement("Trees", String(res.summary.total_trees), "summary-card"),
    createCardElement("Cycles", String(res.summary.total_cycles), "summary-card"),
    createCardElement("Max Root", res.summary.largest_tree_root || "N/A", "summary-card")
  );

  res.hierarchies.forEach((h, i) => {
    treeView.appendChild(createHierarchyView(h, i));
  });

  errorLists.append(
    createListView("Invalid", res.invalid_entries),
    createListView("Duplicates", res.duplicate_edges)
  );
}

async function handleSubmission() {
  resetAlert();
  progressText.textContent = "Processing...";

  let rawData;
  try {
    rawData = processRawInput(edgeInputArea.value);
  } catch (e) {
    progressText.textContent = "Error";
    updateAlert(e.message, "error");
    return;
  }

  const base = apiEndpointInput.value.trim().replace(/\/$/, "");
  if (!base) {
    progressText.textContent = "Missing URL";
    updateAlert("Please provide the API base URL.", "error");
    return;
  }

  btnProcess.disabled = true;

  try {
    const resp = await fetch(`${base}/bfhl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: rawData }),
    });

    const body = await resp.json();
    if (!resp.ok) throw new Error(body.error || "Request failed");

    displayResults(body);
    progressText.textContent = "Finished";
    updateAlert("Data processed successfully.", "success");
  } catch (err) {
    progressText.textContent = "Failed";
    updateAlert(err.message || "Connection error", "error");
  } finally {
    btnProcess.disabled = false;
  }
}

btnProcess.addEventListener("click", handleSubmission);

btnLoadSample.addEventListener("click", () => {
  edgeInputArea.value = defaultSamples.join("\n");
  resetAlert();
  progressText.textContent = "Sample loaded";
});

btnReset.addEventListener("click", () => {
  edgeInputArea.value = "";
  userIdentityBox.innerHTML = "";
  statsGrid.innerHTML = "";
  treeView.innerHTML = "";
  errorLists.innerHTML = "";
  resultsContainer.classList.add("hidden");
  emptyView.classList.remove("hidden");
  progressText.textContent = "Waiting for input";
  resetAlert();
});
