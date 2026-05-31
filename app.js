const STORAGE_KEY = "ict-statusmonitor-items-v1";
const UPDATED_KEY = "ict-statusmonitor-updated-v1";
const ADMIN_PASSWORD = "ICT2026!";

const defaultSystems = [
  {
    id: crypto.randomUUID(),
    name: "Microsoft 365",
    status: "green",
    note: "Alle diensten zijn beschikbaar."
  },
  {
    id: crypto.randomUUID(),
    name: "Teams Telefonie",
    status: "green",
    note: "Bellen en bereikbaarheidsfuncties werken normaal."
  },
  {
    id: crypto.randomUUID(),
    name: "Wifi scholen",
    status: "orange",
    note: "Op enkele locaties is de dekking verminderd. ICT onderzoekt dit."
  },
  {
    id: crypto.randomUUID(),
    name: "TOPdesk",
    status: "green",
    note: "Meldingen kunnen normaal worden aangemaakt en gevolgd."
  },
  {
    id: crypto.randomUUID(),
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

function getSystems() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    saveSystems(defaultSystems);
    return defaultSystems;
  }

  try {
    const systems = JSON.parse(stored);
    return Array.isArray(systems) ? systems : defaultSystems;
  } catch {
    return defaultSystems;
  }
}

function saveSystems(systems) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
  localStorage.setItem(UPDATED_KEY, new Date().toISOString());
}

function formatUpdated() {
  const value = localStorage.getItem(UPDATED_KEY);
  const date = value ? new Date(value) : new Date();
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

function renderMonitor() {
  const grid = document.querySelector("#status-grid");
  if (!grid) return;

  const systems = getSystems();
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
  document.querySelector("#refresh-button").addEventListener("click", renderMonitor);
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

  const systems = getSystems();
  const empty = document.querySelector("#admin-empty-state");
  list.innerHTML = systems.map(system => {
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
  empty.hidden = systems.length > 0;
}

function setupAdmin() {
  const form = document.querySelector("#system-form");
  if (!form) return;

  renderAdminList();

  form.addEventListener("submit", event => {
    event.preventDefault();
    const id = document.querySelector("#system-id").value || crypto.randomUUID();
    const name = document.querySelector("#system-name").value.trim();
    const status = document.querySelector("#system-status").value;
    const note = document.querySelector("#system-note").value.trim();

    const systems = getSystems();
    const existingIndex = systems.findIndex(system => system.id === id);
    const nextSystem = { id, name, status, note };

    if (existingIndex >= 0) {
      systems[existingIndex] = nextSystem;
    } else {
      systems.push(nextSystem);
    }

    saveSystems(systems);
    resetForm();
    renderAdminList();
  });

  document.querySelector("#admin-list").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const systems = getSystems();
    const id = button.dataset.id;
    const system = systems.find(item => item.id === id);

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
      saveSystems(systems.filter(item => item.id !== id));
      resetForm();
      renderAdminList();
    }
  });

  document.querySelector("#cancel-edit").addEventListener("click", resetForm);
  document.querySelector("#reset-data").addEventListener("click", () => {
    saveSystems(defaultSystems.map(system => ({ ...system, id: crypto.randomUUID() })));
    resetForm();
    renderAdminList();
  });
}

function setupAdminLogin() {
  const loginForm = document.querySelector("#login-form");
  const adminContent = document.querySelector("#admin-content");
  const loginScreen = document.querySelector("#login-screen");
  if (!loginForm || !adminContent || !loginScreen) return;

  const unlockAdmin = () => {
    loginScreen.hidden = true;
    adminContent.hidden = false;
    setupAdmin();
  };

  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const password = document.querySelector("#admin-password").value;
    const error = document.querySelector("#login-error");

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("ict-statusmonitor-admin", "true");
      unlockAdmin();
      return;
    }

    error.hidden = false;
    document.querySelector("#admin-password").select();
  });

  if (sessionStorage.getItem("ict-statusmonitor-admin") === "true") {
    unlockAdmin();
  }
}

renderMonitor();
setupAdminLogin();
