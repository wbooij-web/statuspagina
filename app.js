const STORAGE_KEY = "ict-statusmonitor-items-v1";
const UPDATED_KEY = "ict-statusmonitor-updated-v1";
const ADMIN_PASSWORD = "ICT2026!";
const GITHUB_TOKEN_KEY = "ict-statusmonitor-github-token";
const DATA_PATH = "data.json";
const GITHUB_CONFIG = {
  owner: "wbooij-web",
  repo: "statuspagina",
  branch: "main"
};

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

let currentSystems = [];
let currentUpdatedAt = "";
let adminReady = false;

function defaultData() {
  return {
    updatedAt: new Date().toISOString(),
    systems: defaultSystems
  };
}

function readLocalData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultData();

  try {
    return {
      updatedAt: localStorage.getItem(UPDATED_KEY) || new Date().toISOString(),
      systems: JSON.parse(stored)
    };
  } catch {
    return defaultData();
  }
}

function writeLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.systems));
  localStorage.setItem(UPDATED_KEY, data.updatedAt);
}

async function loadStatusData() {
  if (location.protocol === "file:") {
    const data = readLocalData();
    currentSystems = data.systems;
    currentUpdatedAt = data.updatedAt;
    return data;
  }

  try {
    const response = await fetch(`./${DATA_PATH}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Statusbestand kon niet worden geladen.");

    const data = await response.json();
    currentSystems = Array.isArray(data.systems) ? data.systems : defaultSystems;
    currentUpdatedAt = data.updatedAt || new Date().toISOString();
    return { systems: currentSystems, updatedAt: currentUpdatedAt };
  } catch (error) {
    console.warn(error);
    const data = readLocalData();
    currentSystems = data.systems;
    currentUpdatedAt = data.updatedAt;
    return data;
  }
}

async function getGitHubFile(token) {
  const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${DATA_PATH}?ref=${GITHUB_CONFIG.branch}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error("GitHub kon data.json niet lezen. Controleer repository en tokenrechten.");
  }

  return response.json();
}

function encodeBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

async function saveSystems(systems) {
  const data = {
    updatedAt: new Date().toISOString(),
    systems
  };

  currentSystems = systems;
  currentUpdatedAt = data.updatedAt;
  writeLocalData(data);

  if (location.protocol === "file:") return;

  const token = sessionStorage.getItem(GITHUB_TOKEN_KEY);
  if (!token) {
    throw new Error("Geen GitHub token gevonden. Log opnieuw in op beheer.");
  }

  const file = await getGitHubFile(token);
  const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${DATA_PATH}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      message: `Statusmonitor bijgewerkt op ${new Intl.DateTimeFormat("nl-NL", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date())}`,
      content: encodeBase64(`${JSON.stringify(data, null, 2)}\n`),
      sha: file.sha,
      branch: GITHUB_CONFIG.branch
    })
  });

  if (!response.ok) {
    throw new Error("Opslaan naar GitHub is mislukt. Controleer of het token Contents: Read and write heeft.");
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

  const { systems } = await loadStatusData();
  const sortedSystems = [...systems].sort((a, b) => {
    const statusDiff = monitorStatusOrder[a.status] - monitorStatusOrder[b.status];
    return statusDiff || a.name.localeCompare(b.name, "nl-NL");
  });
  const empty = document.querySelector("#empty-state");
  grid.innerHTML = sortedSystems.map(renderStatusCard).join("");
  empty.hidden = systems.length > 0;

  for (const status of Object.keys(statusMeta)) {
    const target = document.querySelector(`#count-${status}`);
    if (target) target.textContent = systems.filter(system => system.status === status).length;
  }

  document.querySelector("#last-updated").textContent = formatUpdated();
}

function resetForm() {
  document.querySelector("#system-id").value = "";
  document.querySelector("#system-form").reset();
  document.querySelector("#form-title").textContent = "Nieuw onderdeel";
  document.querySelector("#cancel-edit").hidden = true;
}

function renderAdminList() {
  const list = document.querySelector("#admin-list");
  if (!list) return;

  const empty = document.querySelector("#admin-empty-state");
  list.innerHTML = currentSystems.map(system => {
    const meta = statusMeta[system.status] || statusMeta.green;
    return `
      <article class="admin-item" style="--status-color: ${meta.color}; --status-bg: ${meta.bg}">
        <div>
          <h3>${escapeHtml(system.name)}</h3>
          <span class="badge"><span class="dot"></span>${meta.label}</span>
          <p class="note">${escapeHtml(system.note?.trim() || "Geen opmerkingen.")}</p>
        </div>
        <div class="admin-actions">
          <button class="ghost-button compact" type="button" data-action="edit" data-id="${system.id}">Bewerken</button>
          <button class="ghost-button compact danger" type="button" data-action="delete" data-id="${system.id}">Verwijderen</button>
        </div>
      </article>
    `;
  }).join("");
  empty.hidden = currentSystems.length > 0;
}

async function persistAndRender(systems) {
  await saveSystems(systems);
  resetForm();
  renderAdminList();
}

async function setupAdmin() {
  if (adminReady) return;
  adminReady = true;

  const form = document.querySelector("#system-form");
  if (!form) return;

  await loadStatusData();
  renderAdminList();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Opslaan...";

    try {
      const id = document.querySelector("#system-id").value || crypto.randomUUID();
      const name = document.querySelector("#system-name").value.trim();
      const status = document.querySelector("#system-status").value;
      const note = document.querySelector("#system-note").value.trim();

      const systems = [...currentSystems];
      const existingIndex = systems.findIndex(system => system.id === id);
      const nextSystem = { id, name, status, note };

      if (existingIndex >= 0) {
        systems[existingIndex] = nextSystem;
      } else {
        systems.push(nextSystem);
      }

      await persistAndRender(systems);
    } catch (error) {
      alert(error.message);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Opslaan";
    }
  });

  document.querySelector("#admin-list").addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const system = currentSystems.find(item => item.id === id);

    if (button.dataset.action === "edit" && system) {
      document.querySelector("#system-id").value = system.id;
      document.querySelector("#system-name").value = system.name;
      document.querySelector("#system-status").value = system.status;
      document.querySelector("#system-note").value = system.note || "";
      document.querySelector("#form-title").textContent = "Onderdeel bewerken";
      document.querySelector("#cancel-edit").hidden = false;
      document.querySelector("#system-name").focus();
    }

    if (button.dataset.action === "delete") {
      try {
        await persistAndRender(currentSystems.filter(item => item.id !== id));
      } catch (error) {
        alert(error.message);
      }
    }
  });

  document.querySelector("#cancel-edit").addEventListener("click", resetForm);
  document.querySelector("#reset-data").addEventListener("click", async () => {
    try {
      await persistAndRender(defaultSystems.map(system => ({ ...system })));
    } catch (error) {
      alert(error.message);
    }
  });
}

function setupAdminLogin() {
  const loginForm = document.querySelector("#login-form");
  const adminContent = document.querySelector("#admin-content");
  const loginScreen = document.querySelector("#login-screen");
  if (!loginForm || !adminContent || !loginScreen) return;

  const unlockAdmin = async () => {
    loginScreen.hidden = true;
    adminContent.hidden = false;
    await setupAdmin();
  };

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.querySelector("#admin-password").value;
    const token = document.querySelector("#github-token").value.trim();
    const error = document.querySelector("#login-error");

    if (password !== ADMIN_PASSWORD) {
      error.textContent = "Onjuist wachtwoord. Probeer het opnieuw.";
      error.hidden = false;
      document.querySelector("#admin-password").select();
      return;
    }

    if (location.protocol !== "file:" && !token) {
      error.textContent = "Vul ook een GitHub token in om wijzigingen te kunnen opslaan.";
      error.hidden = false;
      document.querySelector("#github-token").focus();
      return;
    }

    sessionStorage.setItem("ict-statusmonitor-admin", "true");
    if (token) sessionStorage.setItem(GITHUB_TOKEN_KEY, token);
    await unlockAdmin();
  });

  if (sessionStorage.getItem("ict-statusmonitor-admin") === "true") {
    unlockAdmin();
  }
}

const refreshButton = document.querySelector("#refresh-button");
if (refreshButton) refreshButton.addEventListener("click", renderMonitor);

renderMonitor();
setupAdminLogin();
