"use strict";

const engines = {
  google: { label: "Google", template: "https://www.google.com/search?q=%s" },
  duckduckgo: { label: "DuckDuckGo", template: "https://duckduckgo.com/?q=%s" },
  bing: { label: "Bing", template: "https://www.bing.com/search?q=%s" },
  brave: { label: "Brave Search", template: "https://search.brave.com/search?q=%s" },
};
const starters = [
  { id: "wikipedia", label: "Wikipedia", url: "https://wikipedia.org" },
  { id: "archive", label: "Internet Archive", url: "https://archive.org" },
  { id: "weather", label: "Weather", url: "https://weather.com" },
  { id: "school", label: "FCPS", url: "https://www.fcps.edu" },
];
const themeDefaults = {
  fire: { background: "embers", accent: "#ff7a36" },
  soot: { background: "charcoal", accent: "#f2b84b" },
  parchment: { background: "paper", accent: "#c96934" },
  midnight: { background: "ash", accent: "#54b8ff" },
};
const cloakPresets = {
  kin: { title: "Kin", color: "#ff7a36", letter: "K", nativeIcon: true },
  schoology: { title: "Home | Schoology", color: "#1677c8", letter: "S" },
  drive: { title: "My Drive - Google Drive", color: "#159455", letter: "D" },
  classroom: { title: "Classes", color: "#1e8e5a", letter: "C" },
  blank: { title: "New Tab", color: "#74787f", letter: "●" },
};

const form = document.querySelector("#kin-form");
const address = document.querySelector("#kin-address");
const homeForm = document.querySelector("#home-form");
const homeAddress = document.querySelector("#home-address");
const searchEngine = document.querySelector("#kin-search-engine");
const frameHost = document.querySelector("#frame-host");
const error = document.querySelector("#kin-error");
const errorCode = document.querySelector("#kin-error-code");
const tabsNode = document.querySelector("#tabs");
const newTab = document.querySelector("#new-tab");
const kinMenuButton = document.querySelector("#kin-menu-button");
const kinMenu = document.querySelector("#kin-menu");
const smokescreenButton = document.querySelector("#smokescreen-button");
const detailsButton = document.querySelector("#details-button");

let bookmarks = readArray("kin-bookmarks");
let historyEntries = readArray("kin-history");
let engineKey = localStorage.getItem("kin-search-engine") || "bing";
let showStarters = localStorage.getItem("kin-show-starters") !== "false";
let appearance = readObject("kin-appearance", { theme: "fire", background: "embers", accent: "#ff7a36", cursive: false, cloak: "kin" });
let selectedId;
let seq = 0;
let onboardingStep = 0;
const tabState = [];

if (!engines[engineKey]) engineKey = "bing";
if (localStorage.getItem("kin-search-engine") === "google" && !localStorage.getItem("kin-bing-default-v1")) engineKey = "bing";
localStorage.setItem("kin-bing-default-v1", "1");

const bonfireController = initBonfire();

async function initBonfire() {
  await registerSW();
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active || navigator.serviceWorker.controller;
  if (!worker) throw new Error("Bonfire background worker did not activate");
  const relay = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/relay/`;
  const transport = new HttpEngineTransport.HttpEngineClient({ relay });
  const { Controller, config } = $runtimekitController;
  config.runtimekitPath = "/runtime/runtimekit.js";
  config.wasmPath = "/runtime/runtimekit.wasm";
  config.injectPath = "/controller/controller.inject.js";
  const controller = new Controller({ serviceworker: worker, transport });
  await controller.wait();
  return controller;
}

function readArray(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || "null"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function readObject(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value && typeof value === "object" && !Array.isArray(value) ? { ...fallback, ...value } : { ...fallback }; } catch { return { ...fallback }; }
}
function host(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "New tab"; } }
function normalize(value) {
  const text = value.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w-]+(?:\.[\w-]+)+(?:[/:?#].*)?$/i.test(text)) return `https://${text}`;
  return engines[engineKey].template.replace("%s", encodeURIComponent(text));
}
function hexToRgb(hex) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ff7a36";
  return `${parseInt(normalized.slice(1, 3), 16)}, ${parseInt(normalized.slice(3, 5), 16)}, ${parseInt(normalized.slice(5, 7), 16)}`;
}
function faviconData(color, letter) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${color}"/><text x="32" y="43" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="white">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
function applyCloak(key) {
  const preset = cloakPresets[key] || cloakPresets.kin;
  document.title = preset.title;
  document.querySelector('link[rel="icon"]').href = preset.nativeIcon ? "/kin-mark-tab.png" : faviconData(preset.color, preset.letter);
}
function applyAppearance(save = true) {
  if (!themeDefaults[appearance.theme]) appearance.theme = "fire";
  if (!/^#[0-9a-f]{6}$/i.test(appearance.accent)) appearance.accent = themeDefaults[appearance.theme].accent;
  document.body.dataset.theme = appearance.theme;
  document.body.dataset.background = appearance.background;
  document.body.style.setProperty("--accent", appearance.accent);
  document.body.style.setProperty("--accent-rgb", hexToRgb(appearance.accent));
  document.body.classList.toggle("cursive-headings", Boolean(appearance.cursive));
  applyCloak(appearance.cloak);
  document.querySelectorAll("[data-theme]").forEach((button) => button.classList.toggle("active", button.dataset.theme === appearance.theme));
  document.querySelectorAll("[data-background]").forEach((button) => button.classList.toggle("active", button.dataset.background === appearance.background));
  document.querySelectorAll("[data-accent]").forEach((button) => button.classList.toggle("active", button.dataset.accent.toLowerCase() === appearance.accent.toLowerCase()));
  document.querySelector("#custom-accent").value = appearance.accent;
  document.querySelector("#cursive-toggle").checked = Boolean(appearance.cursive);
  document.querySelector("#cloak-select").value = cloakPresets[appearance.cloak] ? appearance.cloak : "kin";
  if (save) localStorage.setItem("kin-appearance", JSON.stringify(appearance));
}

function createTab(view = "home") {
  const tab = { id: `tab-${Date.now()}-${++seq}`, view, url: "", raw: "", frame: null };
  tabState.push(tab);
  return tab;
}
function current() { return tabState.find((tab) => tab.id === selectedId) || tabState[0]; }
function renderTabs() {
  tabsNode.querySelectorAll(".tab").forEach((node) => node.remove());
  tabState.forEach((tab) => {
    const node = document.createElement("button");
    node.className = `tab${tab.id === selectedId ? " active" : ""}`;
    node.type = "button";
    node.setAttribute("role", "tab");
    node.innerHTML = '<img src="/kin-mark-tab.png" alt=""><span></span><i aria-label="Close tab">×</i>';
    node.querySelector("span").textContent = tab.view === "bookmarks" ? "Bookmarks" : tab.view === "history" ? "History" : tab.url ? host(tab.url) : "New tab";
    node.addEventListener("click", (event) => event.target.closest("i") ? closeTab(tab.id) : selectTab(tab.id));
    tabsNode.insertBefore(node, newTab);
  });
}
function selectTab(id) {
  selectedId = id;
  const tab = current();
  address.value = tab.url;
  homeAddress.value = tab.raw;
  document.querySelectorAll(".view").forEach((node) => node.classList.toggle("active", node.id === `${tab.view}-view`));
  frameHost.classList.toggle("active", tab.view === "browser");
  tabState.forEach((candidate) => { if (candidate.frame) candidate.frame.element.style.display = candidate.id === id && tab.view === "browser" ? "block" : "none"; });
  renderTabs();
}
function closeTab(id) {
  const index = tabState.findIndex((tab) => tab.id === id);
  if (index < 0) return;
  const [closed] = tabState.splice(index, 1);
  if (closed.frame) closed.frame.element.remove();
  if (!tabState.length) { const tab = createTab(); selectedId = tab.id; }
  else if (selectedId === id) selectedId = tabState[Math.max(0, index - 1)].id;
  selectTab(selectedId);
}
function setEngine(key) {
  engineKey = engines[key] ? key : "bing";
  localStorage.setItem("kin-search-engine", engineKey);
  searchEngine.value = engines[engineKey].template;
  document.querySelector("#engine-label").textContent = engines[engineKey].label;
  homeAddress.placeholder = `Search with ${engines[engineKey].label} or enter an address`;
  document.querySelector("#engine-select").value = engineKey;
}
function showError(message, detail = "") {
  error.textContent = message;
  error.classList.add("show");
  errorCode.textContent = detail;
  setTimeout(() => error.classList.remove("show"), 6000);
}
async function openAddress(raw) {
  const url = normalize(raw);
  if (!url) return;
  const tab = current(); tab.url = url; tab.raw = raw; addHistory(url);
  try {
    const controller = await bonfireController;
    if (!tab.frame) {
      const iframe = document.createElement("iframe"); iframe.className = "kin-frame";
      tab.frame = controller.createFrame(iframe); frameHost.appendChild(iframe);
    }
    tab.view = "browser"; tab.frame.go(url); selectTab(tab.id);
  } catch (cause) { showError("Kin could not open that page.", String(cause)); }
}

function renderBookmarks() {
  const all = [...starters, ...bookmarks];
  grid(document.querySelector("#bookmark-grid"), showStarters ? all : bookmarks);
  grid(document.querySelector("#all-bookmarks"), all);
}
function addHistory(url) {
  historyEntries = [{ url, time: Date.now() }, ...historyEntries.filter((entry) => entry.url !== url)].slice(0, 100);
  localStorage.setItem("kin-history", JSON.stringify(historyEntries)); renderHistory();
}
function renderHistory() {
  const list = document.querySelector("#history-list");
  if (!historyEntries.length) { list.innerHTML = '<div class="empty">No browsing history on this device.</div>'; return; }
  list.innerHTML = "";
  historyEntries.forEach((entry) => {
    const row = document.createElement("article"); row.className = "history-entry";
    const open = document.createElement("button");
    const name = document.createElement("b"); name.textContent = host(entry.url);
    const url = document.createElement("small"); url.textContent = entry.url;
    open.append(name, document.createElement("br"), url); open.onclick = () => openAddress(entry.url);
    const time = document.createElement("small"); time.textContent = new Date(entry.time).toLocaleString();
    row.append(open, time); list.append(row);
  });
}
function grid(container, items) {
  if (!items.length) { container.innerHTML = '<div class="empty">No bookmarks yet. Add one to make Kin yours.</div>'; return; }
  container.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("article"); card.className = "bookmark-card";
    const main = document.createElement("button"); main.className = "bookmark-main";
    main.innerHTML = '<span class="bookmark-icon">◎</span><span class="bookmark-copy"><b></b><small></small></span>';
    main.querySelector("b").textContent = item.label; main.querySelector("small").textContent = host(item.url);
    main.onclick = () => openAddress(item.url); card.append(main);
    if (item.custom) {
      const remove = document.createElement("button"); remove.className = "remove-bookmark"; remove.textContent = "×";
      remove.onclick = () => { bookmarks = bookmarks.filter((bookmark) => bookmark.id !== item.id); localStorage.setItem("kin-bookmarks", JSON.stringify(bookmarks)); renderBookmarks(); };
      card.append(remove);
    }
    container.append(card);
  });
}

function openModal(id) {
  document.querySelector("#modal-backdrop").classList.remove("hidden");
  document.querySelectorAll(".modal").forEach((node) => node.classList.toggle("hidden", node.id !== id));
}
function closeModal() {
  document.querySelector("#modal-backdrop").classList.add("hidden");
  document.querySelectorAll(".modal").forEach((node) => node.classList.add("hidden"));
}
function closeKinMenu() { kinMenu.classList.add("hidden"); kinMenuButton.setAttribute("aria-expanded", "false"); }
function toggleKinMenu() {
  const opening = kinMenu.classList.contains("hidden"); kinMenu.classList.toggle("hidden", !opening);
  kinMenuButton.setAttribute("aria-expanded", String(opening));
}
function setOnboardingStep(step) {
  onboardingStep = Math.max(0, Math.min(2, step));
  document.querySelectorAll(".onboarding-step").forEach((node) => node.classList.toggle("active", Number(node.dataset.step) === onboardingStep));
  document.querySelectorAll(".onboarding-progress i").forEach((node, index) => node.classList.toggle("active", index === onboardingStep));
  document.querySelector("#onboarding-back").classList.toggle("hidden", onboardingStep === 0);
  document.querySelector("#onboarding-next").textContent = onboardingStep === 0 ? "Get started" : onboardingStep === 1 ? "Continue" : "Enter Kin";
}
async function loadIdentity() {
  let firstName = "friend";
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (response.ok) { const session = await response.json(); if (session.firstName) firstName = session.firstName; }
  } catch {}
  document.querySelector("#user-first-name").textContent = firstName;
  document.querySelector("#onboarding-name").textContent = firstName;
  const hour = new Date().getHours();
  document.querySelector("#day-part").textContent = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  if (!localStorage.getItem("kin-onboarding-v2")) document.querySelector("#onboarding").classList.remove("hidden");
}

form.onsubmit = (event) => { event.preventDefault(); openAddress(address.value); };
homeForm.onsubmit = (event) => { event.preventDefault(); openAddress(homeAddress.value); };
newTab.onclick = () => { const tab = createTab(); selectTab(tab.id); homeAddress.focus(); };
document.querySelector("#back").onclick = () => { const tab = current(); if (tab.view === "browser" && tab.frame) tab.frame.back(); };
document.querySelector("#forward").onclick = () => { const tab = current(); if (tab.view === "browser" && tab.frame) tab.frame.forward(); };
document.querySelector("#reload").onclick = () => { const tab = current(); if (tab.view === "browser" && tab.frame) tab.frame.reload(); };
document.querySelector("#settings-button").onclick = () => { closeKinMenu(); openModal("settings-modal"); };
document.querySelector("#customize-shortcut").onclick = () => openModal("settings-modal");
document.querySelector("#add-bookmark").onclick = () => openModal("bookmark-modal");
document.querySelector("#add-bookmark-page").onclick = () => openModal("bookmark-modal");
document.querySelectorAll(".close-modal").forEach((button) => button.onclick = closeModal);
document.querySelector("#modal-backdrop").onclick = (event) => { if (event.target.id === "modal-backdrop") closeModal(); };
document.querySelector("#engine-select").onchange = (event) => setEngine(event.target.value);
document.querySelector("#show-starters").onchange = (event) => { showStarters = event.target.checked; localStorage.setItem("kin-show-starters", String(showStarters)); renderBookmarks(); };
kinMenuButton.onclick = (event) => { event.stopPropagation(); toggleKinMenu(); };
kinMenu.onclick = (event) => event.stopPropagation();
document.addEventListener("click", closeKinMenu);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeKinMenu(); closeModal(); } });
detailsButton.onclick = () => { closeKinMenu(); openModal("details-modal"); };
smokescreenButton.onclick = burnHistory;

document.querySelectorAll("[data-theme]").forEach((button) => button.onclick = () => {
  appearance.theme = button.dataset.theme; appearance.background = themeDefaults[appearance.theme].background; appearance.accent = themeDefaults[appearance.theme].accent; applyAppearance();
});
document.querySelectorAll("[data-background]").forEach((button) => button.onclick = () => { appearance.background = button.dataset.background; applyAppearance(); });
document.querySelectorAll("[data-accent]").forEach((button) => button.onclick = () => { appearance.accent = button.dataset.accent; applyAppearance(); });
document.querySelector("#custom-accent").oninput = (event) => { appearance.accent = event.target.value; applyAppearance(); };
document.querySelector("#cursive-toggle").onchange = (event) => { appearance.cursive = event.target.checked; applyAppearance(); };
document.querySelector("#cloak-select").onchange = (event) => { appearance.cloak = event.target.value; applyAppearance(); };
document.querySelector("#reset-appearance").onclick = () => { appearance = { theme: "fire", background: "embers", accent: "#ff7a36", cursive: false, cloak: "kin" }; applyAppearance(); };
document.querySelectorAll("[data-onboard-theme]").forEach((button) => button.onclick = () => {
  appearance.theme = button.dataset.onboardTheme; appearance.background = themeDefaults[appearance.theme].background; appearance.accent = themeDefaults[appearance.theme].accent;
  document.querySelectorAll("[data-onboard-theme]").forEach((item) => item.classList.toggle("active", item === button)); applyAppearance();
});
document.querySelector("#onboarding-back").onclick = () => setOnboardingStep(onboardingStep - 1);
document.querySelector("#onboarding-next").onclick = () => {
  if (onboardingStep < 2) setOnboardingStep(onboardingStep + 1);
  else { localStorage.setItem("kin-onboarding-v2", "complete"); document.querySelector("#onboarding").classList.add("hidden"); homeAddress.focus(); }
};

document.querySelector("#bookmark-modal").onsubmit = (event) => {
  event.preventDefault();
  const label = document.querySelector("#bookmark-name").value.trim(); let url = document.querySelector("#bookmark-url").value.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  bookmarks.push({ id: crypto.randomUUID(), label, url, custom: true }); localStorage.setItem("kin-bookmarks", JSON.stringify(bookmarks));
  event.target.reset(); closeModal(); renderBookmarks();
};
document.querySelector("#history-button").onclick = () => { closeModal(); const tab = createTab("history"); selectTab(tab.id); };
document.querySelector("#clear-history").onclick = () => { historyEntries = []; localStorage.removeItem("kin-history"); renderHistory(); };

async function burnHistory() {
  closeKinMenu();
  const overlay = document.querySelector("#smokescreen"); const toast = document.querySelector("#local-toast");
  overlay.classList.add("active"); historyEntries = []; bookmarks = []; localStorage.clear(); sessionStorage.clear();
  try {
    for (const key of await caches.keys()) await caches.delete(key);
    if (indexedDB.databases) for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name);
  } catch {}
  tabState.forEach((tab) => { if (tab.frame) tab.frame.element.remove(); }); tabState.length = 0;
  const fresh = createTab(); selectedId = fresh.id;
  setTimeout(() => {
    overlay.classList.remove("active"); appearance = { theme: "fire", background: "embers", accent: "#ff7a36", cursive: false, cloak: "kin" };
    applyAppearance(); setEngine("bing"); renderBookmarks(); renderHistory(); selectTab(selectedId);
    toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 3000);
  }, 1850);
}

document.querySelector("#show-starters").checked = showStarters;
applyAppearance(false); setEngine(engineKey); setOnboardingStep(0);
const first = createTab(); selectedId = first.id;
selectTab(selectedId); renderBookmarks(); renderHistory(); loadIdentity();
