const CONFIG_PATH = "sheet-config.json";
const DATA_PATH = "data.json";

const defaultSystems = [
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    status: "green",
    note: "Alle diensten zijn beschikbaar."
  },
  {
    id: "teams-telefonie",
    name: "Teams Telefonie",
    status: "green",
    note: "Bellen en bereikbaarheidsfuncties werken normaal."
  },
  {
    id: "wifi-scholen",
    name: "Wifi scholen",
    status: "orange",
    note: "Op enkele locaties is de dekking verminderd. ICT onderzoekt dit."
  },
  {
    id: "topdesk",
    name: "TOPdesk",
    status: "green",
    note: "Meldingen kunnen normaal worden aangemaakt en gevolgd."
  },
  {
    id: "printen",
    name: "Printen",
    status: "red",
    note: "Printen is tijdelijk niet beschikbaar. Gebruik waar mogelijk digitaal delen."
  }
];

const statusMeta = {
  green: { label: "Groen", color: "var(--green)", bg: "var(--green-bg)" },
  orange: { label: "Oranje", color: "var(--orange)", bg: "var(--orange-bg)" },
  red: { label: "Rood", color: "var(--red)", bg: "var(--red-bg)" }
};

const monitorStatusOrder = {
  red: 0,
  orange: 1,
  green: 2
};

let currentSystems = defaultSystems;
let currentUpdatedAt = "";
let currentSource = "Voorbeelddata";

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (["rood", "red", "storing"].includes(status)) return "red";
  if (["oranje", "orange", "waarschuwing", "verstoring"].includes(status)) return "orange";
  return "green";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);
  return rows;
}

function rowsToSystems(rows) {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map(header => header.trim().toLowerCase());
  const indexOf = (...names) => headers.findIndex(header => names.includes(header));
  const idIndex = indexOf("id", "code");
  const nameIndex = indexOf("naam", "name", "systeem", "system");
  const statusIndex = indexOf("status");
  const noteIndex = indexOf("opmerking", "note", "toelichting", "commentaar");
  const visibleIndex = indexOf("zichtbaar", "visible", "tonen");

  return dataRows
    .filter(row => visibleIndex === -1 || !["nee", "no", "false", "0"].includes(String(row[visibleIndex] || "").trim().toLowerCase()))
    .map((row, index) => ({
      id: row[idIndex] || `system-${index + 1}`,
      name: row[nameIndex] || "Naam ontbreekt",
      status: normalizeStatus(row[statusIndex]),
      note: row[noteIndex] || "Geen opmerkingen."
    }))
    .filter(system => system.name.trim() !== "");
}

async function fetchJson(path) {
  const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} kon niet worden geladen.`);
  return response.json();
}

async function loadConfig() {
  if (location.protocol === "file:") return { csvUrl: "" };

  try {
    return await fetchJson(CONFIG_PATH);
  } catch {
    return { csvUrl: "" };
  }
}

async function loadStatusData() {
  const config = await loadConfig();

  if (config.csvUrl) {
    const response = await fetch(`${config.csvUrl}${config.csvUrl.includes("?") ? "&" : "?"}v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Google Sheet CSV kon niet worden geladen.");

    const csvText = await response.text();
    const systems = rowsToSystems(parseCsv(csvText));
    currentSystems = systems.length ? systems : defaultSystems;
    currentUpdatedAt = new Date().toISOString();
    currentSource = "Google Sheet";
    return;
  }

  try {
    const data = await fetchJson(DATA_PATH);
    currentSystems = Array.isArray(data.systems) ? data.systems : defaultSystems;
    currentUpdatedAt = data.updatedAt || "";
    currentSource = "data.json";
  } catch {
    currentSystems = defaultSystems;
    currentUpdatedAt = "";
    currentSource = "Voorbeelddata";
  }
}

function formatUpdated() {
  const date = currentUpdatedAt ? new Date(currentUpdatedAt) : new Date();
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStatusCard(system) {
  const meta = statusMeta[system.status] || statusMeta.green;
  const note = system.note?.trim() || "Geen opmerkingen.";

  return `
    <article class="status-card" style="--status-color: ${meta.color}; --status-bg: ${meta.bg}">
      <div class="status-top">
        <h3>${escapeHtml(system.name)}</h3>
        <span class="badge"><span class="dot"></span>${meta.label}</span>
      </div>
      <p class="note-label">Opmerking</p>
      <p class="note">${escapeHtml(note)}</p>
    </article>
  `;
}

async function renderMonitor() {
  const grid = document.querySelector("#status-grid");
  if (!grid) return;

  try {
    await loadStatusData();
  } catch (error) {
    console.error(error);
    currentSystems = defaultSystems;
    currentSource = "Voorbeelddata";
  }

  const sortedSystems = [...currentSystems].sort((a, b) => {
    const statusDiff = monitorStatusOrder[a.status] - monitorStatusOrder[b.status];
    return statusDiff || a.name.localeCompare(b.name, "nl-NL");
  });
  const empty = document.querySelector("#empty-state");
  grid.innerHTML = sortedSystems.map(renderStatusCard).join("");
  empty.hidden = currentSystems.length > 0;

  for (const status of Object.keys(statusMeta)) {
    const target = document.querySelector(`#count-${status}`);
    if (target) target.textContent = currentSystems.filter(system => system.status === status).length;
  }

  document.querySelector("#last-updated").textContent = `${formatUpdated()} (${currentSource})`;
}

async function renderSheetAdminInfo() {
  const configLink = document.querySelector("#config-status");
  if (!configLink) return;

  const config = await loadConfig();
  if (config.csvUrl) {
    configLink.textContent = "Google Sheet-koppeling is ingevuld.";
    configLink.classList.add("success-text");
    return;
  }

  configLink.textContent = "Nog geen Google Sheet CSV-link ingevuld in sheet-config.json.";
}

const refreshButton = document.querySelector("#refresh-button");
if (refreshButton) refreshButton.addEventListener("click", renderMonitor);

renderMonitor();
renderSheetAdminInfo();
