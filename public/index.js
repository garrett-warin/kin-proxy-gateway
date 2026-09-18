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
const homeQuotes = [
  { text: "Stay hungry. Stay foolish.", author: "Steve Jobs" },
  { text: "To thine own self be true.", author: "William Shakespeare" },
  { text: "Nothing great was ever achieved without enthusiasm.", author: "Ralph Waldo Emerson" },
  { text: "I think, therefore I am.", author: "René Descartes" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
];
const themeDefaults = {
  fire: { background: "embers", accent: "#ff7a36" },
  soot: { background: "charcoal", accent: "#f2b84b" },
  parchment: { background: "paper", accent: "#c96934" },
  midnight: { background: "ash", accent: "#54b8ff" },
};
const cloakPresets = {
  kin: { title: "Kin", icon: "/kin-mark-tab.png" },
  schoology: { title: "Home | Schoology", icon: "/cloak-schoology.png" },
  drive: { title: "My Drive - Google Drive", icon: "/cloak-drive.png" },
  studentvue: { title: "StudentVUE", icon: "/cloak-studentvue.png" },
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
const aboutBlankButton = document.querySelector("#about-blank-button");
const fullscreenButton = document.querySelector("#fullscreen-button");
const fullscreenExit = document.querySelector("#fullscreen-exit");
const adminButton = document.querySelector("#admin-button");
const enableEngineButton = document.querySelector("#enable-engine");
const engineModeCard = document.querySelector("#engine-mode-card");
const scheduleButton = document.querySelector("#schedule-button");
const schedulePanel = document.querySelector("#schedule-panel");
const adminUrl = "https://script.google.com/a/macros/fcpsschools.net/s/AKfycbw6cusU0GMU3G1aw69gavCCOShiBXZ_W-cXG8Wo7s8i0PNTJaf2Th6LwNwj5oEfVSXf/exec?admin=1";

let bookmarks = readArray("kin-bookmarks");
let starredIds = readArray("kin-starred-sites");
if (!localStorage.getItem("kin-starred-sites")) starredIds = ["wikipedia", "archive", "weather"];
let historyEntries = [];
let historyReady = Promise.resolve();
let engineKey = localStorage.getItem("kin-search-engine") || "bing";
let showStarters = localStorage.getItem("kin-show-starters") !== "false";
let appearance = readObject("kin-appearance", { theme: "fire", background: "embers", accent: "#ff7a36", cursive: false, cloak: "kin" });
let engineEnabled = sessionStorage.getItem("kin-engine-enabled") === "true";
let bellReminders = localStorage.getItem("kin-bell-reminders") !== "false";
let bellSound = localStorage.getItem("kin-bell-sound") !== "false";
let reminderAudio;
let sessionCheckPromise;
let wordmarkClickCount = 0;
let wordmarkClickTimer;
let selectedId;
let seq = 0;
let onboardingStep = 0;
const tabState = [];

const bellSchedules = {
  anchor: {
    label: "Anchor Day",
    entries: [
      ["Period 1", "7:30", "8:14"], ["Period 2", "8:19", "9:01"], ["Period 3", "9:06", "9:48"],
      ["Period 5", "9:53", "10:35"], ["Period 6 / Lunch / Recess / SEL", "10:40", "12:40"],
      ["Period 7", "12:45", "13:27"], ["Period 8", "13:32", "14:15"],
    ],
  },
  blue: {
    label: "Blue Day",
    entries: [
      ["Period 1", "7:30", "8:55"], ["Period 3", "9:00", "9:45"],
      ["Learning Seminar and Recess", "9:50", "10:40"], ["Period 5 and Lunch", "10:45", "12:45"],
      ["Period 7", "12:50", "14:15"],
    ],
  },
  silver: {
    label: "Silver Day",
    entries: [
      ["Period 2", "7:30", "8:55"], ["Period 3", "9:00", "9:45"],
      ["Learning Seminar and Recess", "9:50", "10:40"], ["Period 6 and Lunch", "10:45", "12:45"],
      ["Period 8", "12:50", "14:15"],
    ],
  },
};

const noRegularScheduleDates = new Set([
  "2026-09-04", "2026-09-07", "2026-09-21", "2026-10-12", "2026-10-30", "2026-11-02", "2026-11-03",
  "2026-11-25", "2026-11-26", "2026-11-27", "2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24",
  "2026-12-25", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-18",
  "2027-01-28", "2027-01-29", "2027-02-01", "2027-02-15", "2027-03-10", "2027-03-22", "2027-03-23",
  "2027-03-24", "2027-03-25", "2027-03-26", "2027-04-16", "2027-04-19", "2027-04-20", "2027-05-17",
  "2027-05-31", "2027-06-16", "2027-06-17", "2027-06-18",
]);

if (!engines[engineKey]) engineKey = "bing";
if (appearance.cloak === "classroom") appearance.cloak = "studentvue";
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
  config.codec = KinPathCodec;
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
function bytesToBase64(bytes) {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value);
}
function base64ToBytes(value) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
function openPrivateState() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("kin-private-state", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("keys");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Private storage is unavailable"));
  });
}
function databaseRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Private storage request failed"));
  });
}
async function historyKey() {
  const database = await openPrivateState();
  const stored = await databaseRequest(database.transaction("keys", "readonly").objectStore("keys").get("history-v1"));
  if (stored) return stored;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await databaseRequest(database.transaction("keys", "readwrite").objectStore("keys").put(key, "history-v1"));
  return key;
}
async function persistHistory() {
  if (!historyEntries.length) { localStorage.removeItem("kin-history-v2"); return; }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const content = new TextEncoder().encode(JSON.stringify(historyEntries));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode("kin-history-v1") }, await historyKey(), content);
  localStorage.setItem("kin-history-v2", JSON.stringify({ iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) }));
}
async function initializeHistory() {
  const legacy = readArray("kin-history");
  const stored = readObject("kin-history-v2", null);
  try {
    if (stored?.iv && stored?.data) {
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(stored.iv), additionalData: new TextEncoder().encode("kin-history-v1") }, await historyKey(), base64ToBytes(stored.data));
      const parsed = JSON.parse(new TextDecoder().decode(decrypted));
      historyEntries = Array.isArray(parsed) ? parsed : [];
    } else {
      historyEntries = legacy;
      if (legacy.length) await persistHistory();
    }
  } catch {
    historyEntries = [];
    localStorage.removeItem("kin-history-v2");
  }
  localStorage.removeItem("kin-history");
  renderHistory();
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${color}"/><text x="32" y="43" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#ffd9a6">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
function applyCloak(key) {
  const preset = cloakPresets[key] || cloakPresets.kin;
  document.title = preset.title;
  document.querySelector('link[rel="icon"]').href = preset.icon || faviconData(preset.color, preset.letter);
}

function launchAboutBlank() {
  closeKinMenu();
  const popup = window.open("about:blank", "_blank");
  if (!popup) { showError("Kin could not open a blank tab. Allow popups and try again."); return; }
  const doc = popup.document;
  doc.title = document.title;
  const icon = doc.createElement("link");
  icon.rel = "icon";
  icon.href = document.querySelector('link[rel="icon"]').href;
  const viewport = doc.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width,initial-scale=1";
  const frame = doc.createElement("iframe");
  frame.src = location.href;
  frame.title = "Kin";
  frame.allow = "fullscreen";
  frame.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;background:#111";
  doc.head.append(icon, viewport);
  doc.body.style.cssText = "margin:0;overflow:hidden;background:#111";
  doc.body.appendChild(frame);
  popup.opener = null;
}

let fullscreenUiTimer;
function revealFullscreenUi() {
  if (!document.fullscreenElement) return;
  document.body.classList.add("show-fullscreen-ui");
  clearTimeout(fullscreenUiTimer);
  fullscreenUiTimer = setTimeout(() => document.body.classList.remove("show-fullscreen-ui"), 1800);
}
async function toggleFullscreen() {
  closeKinMenu();
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.fullscreenEnabled) await document.documentElement.requestFullscreen();
    else showError("Fullscreen is not available in this browser.");
  } catch { showError("Kin could not enter fullscreen."); }
}
function syncFullscreenUi() {
  const active = Boolean(document.fullscreenElement);
  document.body.classList.toggle("kin-fullscreen", active);
  document.body.classList.toggle("show-fullscreen-ui", active);
  fullscreenButton.querySelector("b").textContent = active ? "Exit fullscreen" : "Fullscreen";
  fullscreenButton.querySelector("small").textContent = active ? "Show the Kin browser bar" : "Hide the Kin browser bar";
  if (active) revealFullscreenUi();
  else clearTimeout(fullscreenUiTimer);
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
  document.querySelectorAll("[data-cloak]").forEach((button) => button.classList.toggle("active", button.dataset.cloak === appearance.cloak));
  if (save) localStorage.setItem("kin-appearance", JSON.stringify(appearance));
}

function createTab(view = "home") {
  const tab = { id: `tab-${Date.now()}-${++seq}`, view, url: "", raw: "", frame: null };
  tabState.push(tab);
  return tab;
}
function current() { return tabState.find((tab) => tab.id === selectedId) || tabState[0]; }
function isWebUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
function updateTabLocation(tab, value) {
  if (!tab || !isWebUrl(value)) return;
  tab.url = value;
  tab.raw = value;
  if (tab.id === selectedId) address.value = value;
  addHistory(value);
  renderTabs();
}
function openKinTab(value = "") {
  const tab = createTab();
  selectTab(tab.id);
  if (value) openAddress(value, tab);
  else homeAddress.focus();
  return tab;
}
class KinNavigationPlugin extends $runtimekitController.ManagedPlugin {
  constructor(tab) {
    super(`kin-navigation-${tab.id}`, []);
    this.tab = tab;
  }
  install(frame) {
    super.install(frame);
    this.tap(frame.hooks.init.post, ({ window: frameWindow, client, isTopLevel }) => {
      if (!isTopLevel) return;
      const tab = this.tab;
      const resolveUrl = (value) => {
        try { return new URL(String(value || ""), client.url.href).href; } catch { return ""; }
      };
      const routeToKin = (value, newTab = true) => {
        const resolved = resolveUrl(value);
        if (!isWebUrl(resolved)) {
          if (!resolved || resolved === "about:blank") openKinTab();
          else showError("That link cannot open in Kin.");
          return null;
        }
        if (newTab) openKinTab(resolved);
        else openAddress(resolved, tab);
        return null;
      };

      const handleLink = (event) => {
        const link = event.target && typeof event.target.closest === "function" ? event.target.closest("a[href], area[href]") : null;
        if (!link) return;
        const href = resolveUrl(link.href || link.getAttribute("href"));
        const baseTarget = frameWindow.document.querySelector("base[target]")?.getAttribute("target") || "";
        const target = (link.getAttribute("target") || baseTarget).toLowerCase();
        const wantsNewTab = event.button === 1 || event.ctrlKey || event.metaKey || event.shiftKey || (target && target !== "_self");
        if (wantsNewTab) {
          event.preventDefault();
          event.stopImmediatePropagation();
          routeToKin(href, true);
        } else if (isWebUrl(href)) {
          updateTabLocation(tab, href);
        } else if (href && !href.startsWith("#")) {
          event.preventDefault();
          showError("That link cannot open in Kin.");
        }
      };
      frameWindow.document.addEventListener("click", handleLink, true);
      frameWindow.document.addEventListener("auxclick", handleLink, true);

      frameWindow.document.addEventListener("submit", (event) => {
        const form = event.target;
        if (!(form instanceof frameWindow.HTMLFormElement)) return;
        const baseTarget = frameWindow.document.querySelector("base[target]")?.getAttribute("target") || "";
        const target = (form.getAttribute("target") || baseTarget).toLowerCase();
        if (target && target !== "_self") form.setAttribute("target", "_self");
      }, true);

      const kinOpen = (value) => routeToKin(value, true);
      try { Object.defineProperty(frameWindow, "open", { configurable: true, writable: true, value: kinOpen }); }
      catch { try { frameWindow.open = kinOpen; } catch {} }

      updateTabLocation(tab, client.url.href);
      this.tap(client.hooks.lifecycle.navigate, (_event, navigation) => {
        updateTabLocation(tab, navigation?.url || client.url.href);
      });
    });
  }
}
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

function showReloadQuote() {
  const previous = Number(sessionStorage.getItem("kin-last-quote"));
  const choices = homeQuotes.map((_, index) => index).filter((index) => index !== previous);
  const index = choices[Math.floor(Math.random() * choices.length)] ?? 0;
  sessionStorage.setItem("kin-last-quote", String(index));
  document.querySelector("#home-quote-text").textContent = homeQuotes[index].text;
  document.querySelector("#home-quote-author").textContent = homeQuotes[index].author;
}
function buildSiteFire() {
  const flames = document.querySelector("#fire-flames");
  const embers = document.querySelector("#fire-embers");
  if (flames.childElementCount) return;
  for (let index = 0; index < 26; index += 1) {
    const flame = document.createElement("i");
    flame.style.setProperty("--x", `${index * 4 - 2}%`);
    flame.style.setProperty("--height", `${100 + Math.random() * 180}px`);
    flame.style.setProperty("--width", `${55 + Math.random() * 75}px`);
    flame.style.setProperty("--delay", `${Math.random() * -1.4}s`);
    flame.style.setProperty("--lean", `${-12 + Math.random() * 24}deg`);
    flames.append(flame);
  }
  for (let index = 0; index < 34; index += 1) {
    const ember = document.createElement("i");
    ember.style.setProperty("--x", `${Math.random() * 100}%`);
    ember.style.setProperty("--delay", `${Math.random() * -3}s`);
    ember.style.setProperty("--drift", `${-45 + Math.random() * 90}px`);
    embers.append(ember);
  }
}
function igniteSite() {
  const fire = document.querySelector("#site-fire");
  if (fire.classList.contains("active")) return;
  buildSiteFire();
  fire.classList.remove("extinguishing");
  fire.classList.add("active");
  fire.setAttribute("aria-hidden", "false");
  document.body.classList.add("site-burning");
  document.querySelector("#fire-bucket").focus();
}
function extinguishSite() {
  const fire = document.querySelector("#site-fire");
  if (!fire.classList.contains("active") || fire.classList.contains("extinguishing")) return;
  fire.classList.add("extinguishing");
  setTimeout(() => {
    fire.classList.remove("active", "extinguishing");
    fire.setAttribute("aria-hidden", "true");
    document.body.classList.remove("site-burning");
    wordmarkClickCount = 0;
    document.querySelector("#wordmark-trigger").focus();
  }, 1200);
}
function countWordmarkClick() {
  if (document.querySelector("#site-fire").classList.contains("active")) return;
  wordmarkClickCount += 1;
  clearTimeout(wordmarkClickTimer);
  document.querySelector("#wordmark-trigger").classList.remove("tap");
  requestAnimationFrame(() => document.querySelector("#wordmark-trigger").classList.add("tap"));
  if (wordmarkClickCount >= 5) { wordmarkClickCount = 0; igniteSite(); return; }
  wordmarkClickTimer = setTimeout(() => { wordmarkClickCount = 0; }, 3200);
}
function beginVerification() {
  const returnPath = `${location.pathname}${location.search}${location.hash}`;
  location.assign(`/auth/start?return_path=${encodeURIComponent(returnPath)}`);
}
async function ensureSession() {
  if (sessionCheckPromise) return sessionCheckPromise;
  sessionCheckPromise = fetch("/api/session", { cache: "no-store", credentials: "same-origin", redirect: "manual" })
    .then((response) => {
      if (response.status === 401 || response.type === "opaqueredirect") { beginVerification(); return false; }
      return response.ok;
    })
    .catch(() => true)
    .finally(() => { sessionCheckPromise = null; });
  return sessionCheckPromise;
}

function localDateKey(date) {
  const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number); return (hours * 60) + minutes;
}
function displayBellTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}
function scheduleForDate(date) {
  const key = localDateKey(date);
  if (key < "2026-08-24" || key > "2027-06-16" || noRegularScheduleDates.has(key)) return null;
  const weekday = date.getDay();
  if (weekday === 1) return bellSchedules.anchor;
  if (weekday === 2 || weekday === 4) return bellSchedules.blue;
  if (weekday === 3 || weekday === 5) return bellSchedules.silver;
  return null;
}
function updateClock() {
  const now = new Date();
  document.querySelector("#kin-time").textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(now);
  document.querySelector("#kin-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(now);
}
function schedulePosition(schedule, now = new Date()) {
  if (!schedule) return { current: -1, next: -1 };
  const minute = (now.getHours() * 60) + now.getMinutes();
  let current = -1; let next = -1;
  schedule.entries.forEach((entry, index) => {
    if (minute >= minutesFromTime(entry[1]) && minute < minutesFromTime(entry[2])) current = index;
    if (next < 0 && minute < minutesFromTime(entry[1])) next = index;
  });
  return { current, next };
}
function renderSchedulePanel() {
  const now = new Date(); const schedule = scheduleForDate(now); const list = document.querySelector("#schedule-list");
  document.querySelector("#schedule-day-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now).toUpperCase();
  list.innerHTML = "";
  if (!schedule) {
    document.querySelector("#schedule-title").textContent = "No regular schedule";
    document.querySelector("#schedule-summary").textContent = "Kin reminders are off today.";
    list.innerHTML = '<div class="schedule-empty">No standard bell periods today.</div>';
    return;
  }
  const position = schedulePosition(schedule, now);
  document.querySelector("#schedule-title").textContent = schedule.label;
  document.querySelector("#schedule-summary").textContent = position.current >= 0 ? `Now: ${schedule.entries[position.current][0]}` : position.next >= 0 ? `Next: ${schedule.entries[position.next][0]}` : "Classes are finished for today.";
  schedule.entries.forEach((entry, index) => {
    const row = document.createElement("div"); row.className = `schedule-row${position.current === index ? " current" : position.next === index ? " next" : ""}`;
    const name = document.createElement("b"); name.textContent = entry[0];
    const time = document.createElement("span"); time.textContent = `${displayBellTime(entry[1])} - ${displayBellTime(entry[2])}`;
    row.append(name, time); list.append(row);
  });
}
function toggleSchedulePanel(force) {
  const open = typeof force === "boolean" ? force : schedulePanel.classList.contains("hidden");
  schedulePanel.classList.toggle("hidden", !open); scheduleButton.setAttribute("aria-expanded", String(open));
  if (open) renderSchedulePanel();
}
function armReminderAudio() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return;
  if (!reminderAudio) reminderAudio = new AudioContextConstructor();
  if (reminderAudio.state === "suspended") reminderAudio.resume();
}
function playReminderChime(atBell = false) {
  if (!bellSound) return;
  try {
    armReminderAudio();
    if (!reminderAudio) return;
    const start = reminderAudio.currentTime;
    const notes = atBell ? [[659.25, 0], [783.99, .14]] : [[523.25, 0], [659.25, .16]];
    notes.forEach(([frequency, delay]) => {
      const oscillator = reminderAudio.createOscillator(); const gain = reminderAudio.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, start + delay); gain.gain.exponentialRampToValueAtTime(.055, start + delay + .025); gain.gain.exponentialRampToValueAtTime(.0001, start + delay + .22);
      oscillator.connect(gain).connect(reminderAudio.destination); oscillator.start(start + delay); oscillator.stop(start + delay + .24);
    });
  } catch {}
}
function showBellReminder(entry, minutes, atBell = false) {
  const reminder = document.querySelector("#bell-reminder");
  document.querySelector("#bell-reminder-title").textContent = atBell ? `${entry[0]} starts now` : `${entry[0]} starts in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  document.querySelector("#bell-reminder-detail").textContent = atBell ? `It is ${displayBellTime(entry[1])}` : `Begins at ${displayBellTime(entry[1])}`;
  reminder.classList.add("show"); playReminderChime(atBell);
  setTimeout(() => reminder.classList.remove("show"), 12000);
}
function checkBellReminder() {
  if (!bellReminders || document.hidden) return;
  const now = new Date(); const schedule = scheduleForDate(now); if (!schedule) return;
  const currentMinute = (now.getHours() * 60) + now.getMinutes() + (now.getSeconds() / 60);
  const bellEntry = schedule.entries.find((item) => { const elapsed = currentMinute - minutesFromTime(item[1]); return elapsed >= 0 && elapsed < .34; });
  if (bellEntry) {
    const bellKey = `kin-bell-shown-${localDateKey(now)}-${bellEntry[1]}-now`;
    if (!sessionStorage.getItem(bellKey)) { sessionStorage.setItem(bellKey, "1"); showBellReminder(bellEntry, 0, true); }
    return;
  }
  const warningEntry = schedule.entries.find((item) => { const until = minutesFromTime(item[1]) - currentMinute; return until > 0 && until <= 5; });
  if (!warningEntry) return;
  const warningKey = `kin-bell-shown-${localDateKey(now)}-${warningEntry[1]}-five`;
  if (sessionStorage.getItem(warningKey)) return;
  sessionStorage.setItem(warningKey, "1"); showBellReminder(warningEntry, Math.max(1, Math.ceil(minutesFromTime(warningEntry[1]) - currentMinute)));
}
async function openAddress(raw, targetTab = current()) {
  const url = normalize(raw);
  if (!url) return;
  if (!await ensureSession()) return;
  if (!engineEnabled) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) showError("Kin could not open a normal browser tab. Allow popups and try again.");
    return;
  }
  const tab = targetTab; tab.url = url; tab.raw = raw; addHistory(url);
  try {
    const controller = await bonfireController;
    if (!tab.frame) {
      const iframe = document.createElement("iframe"); iframe.className = "kin-frame";
      tab.frame = controller.createFrame(iframe, { plugins: [new KinNavigationPlugin(tab)] }); frameHost.appendChild(iframe);
    }
    tab.view = "browser"; tab.frame.go(url); selectTab(tab.id);
  } catch (cause) { showError("Kin could not open that page.", String(cause)); }
}

function updateEngineMode() {
  engineModeCard.classList.toggle("enabled", engineEnabled);
  document.querySelector("#engine-mode-title").textContent = engineEnabled ? "Kin Engine active" : "Standard browsing";
  document.querySelector("#engine-mode-description").textContent = engineEnabled ? "Sites stay inside Kin tabs." : "Sites open normally in a new browser tab.";
  enableEngineButton.disabled = false;
  enableEngineButton.setAttribute("aria-pressed", String(engineEnabled));
  enableEngineButton.querySelector("b").textContent = engineEnabled ? "Disable Kin Engine" : "Enable Kin Engine";
  enableEngineButton.querySelector("small").textContent = engineEnabled ? "Return to standard browsing" : "Use Kin tabs and navigation";
}
function createIgnitionSparks() {
  const holder = document.querySelector("#ignition-sparks"); holder.innerHTML = "";
  for (let index = 0; index < 28; index += 1) {
    const spark = document.createElement("i");
    spark.style.setProperty("--x", `${8 + Math.random() * 84}%`);
    spark.style.setProperty("--delay", `${Math.random() * .55}s`);
    spark.style.setProperty("--drift", `${-55 + Math.random() * 110}px`);
    spark.style.setProperty("--size", `${3 + Math.random() * 7}px`);
    holder.append(spark);
  }
}
async function toggleKinEngine() {
  const enabling = !engineEnabled;
  const ignition = document.querySelector("#engine-ignition"); createIgnitionSparks();
  ignition.classList.toggle("cooling", !enabling);
  document.querySelector("#ignition-label").textContent = enabling ? "Lighting Kin Engine" : "Returning to Standard";
  ignition.classList.add("active");
  await new Promise((resolve) => setTimeout(resolve, 1350));
  engineEnabled = enabling;
  if (engineEnabled) sessionStorage.setItem("kin-engine-enabled", "true");
  else sessionStorage.removeItem("kin-engine-enabled");
  updateEngineMode();
  ignition.classList.remove("active");
  const toast = document.querySelector("#local-toast"); toast.firstChild.textContent = engineEnabled ? "Kin Engine enabled" : "Standard browsing enabled";
  toast.querySelector("small").textContent = engineEnabled ? "Sites now open inside Kin tabs." : "Sites now open in regular browser tabs.";
  toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderBookmarks() {
  const all = [...starters, ...bookmarks];
  grid(document.querySelector("#bookmark-grid"), showStarters ? all : bookmarks);
  grid(document.querySelector("#all-bookmarks"), all);
  renderStarred(all);
}
function persistStars() {
  localStorage.setItem("kin-starred-sites", JSON.stringify(starredIds));
}
function toggleStar(id) {
  starredIds = starredIds.includes(id) ? starredIds.filter((item) => item !== id) : [...starredIds, id];
  persistStars(); renderBookmarks();
}
function renderStarred(items) {
  const container = document.querySelector("#starred-grid");
  const starred = starredIds.map((id) => items.find((item) => item.id === id)).filter(Boolean);
  if (!starred.length) {
    container.innerHTML = '<div class="starred-empty"><span>☆</span><p>Star a bookmark to keep it here.</p></div>';
    return;
  }
  container.innerHTML = "";
  starred.forEach((item) => {
    const shortcut = document.createElement("article"); shortcut.className = "starred-site";
    const open = document.createElement("button"); open.className = "starred-open";
    const icon = document.createElement("span"); icon.className = "starred-icon"; icon.textContent = item.label.trim().charAt(0).toUpperCase() || "•";
    const label = document.createElement("span"); label.className = "starred-label"; label.textContent = item.label;
    open.append(icon, label); open.onclick = () => openAddress(item.url);
    const unstar = document.createElement("button"); unstar.className = "starred-remove"; unstar.type = "button"; unstar.textContent = "×";
    unstar.setAttribute("aria-label", `Remove ${item.label} from starred sites`); unstar.onclick = () => toggleStar(item.id);
    shortcut.append(open, unstar); container.append(shortcut);
  });
}
async function addHistory(url) {
  await historyReady;
  historyEntries = [{ url, time: Date.now() }, ...historyEntries.filter((entry) => entry.url !== url)].slice(0, 100);
  try { await persistHistory(); } catch {}
  renderHistory();
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
    const star = document.createElement("button"); star.className = `star-bookmark${starredIds.includes(item.id) ? " active" : ""}`;
    star.type = "button"; star.textContent = starredIds.includes(item.id) ? "★" : "☆";
    star.setAttribute("aria-label", `${starredIds.includes(item.id) ? "Unstar" : "Star"} ${item.label}`);
    star.onclick = () => toggleStar(item.id); card.append(star);
    if (item.custom) {
      const remove = document.createElement("button"); remove.className = "remove-bookmark"; remove.textContent = "×";
      remove.onclick = () => { bookmarks = bookmarks.filter((bookmark) => bookmark.id !== item.id); starredIds = starredIds.filter((id) => id !== item.id); localStorage.setItem("kin-bookmarks", JSON.stringify(bookmarks)); persistStars(); renderBookmarks(); };
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
  document.querySelector("#onboarding-next").textContent = onboardingStep < 2 ? "Next" : "Start";
}
async function loadIdentity() {
  let firstName = "friend";
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (response.status === 401) { beginVerification(); return; }
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
newTab.onclick = () => openKinTab();
document.querySelector("#kin-home").onclick = (event) => {
  event.preventDefault();
  const tab = current();
  tab.view = "home"; tab.url = ""; tab.raw = "";
  selectTab(tab.id); homeAddress.focus();
};
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
aboutBlankButton.onclick = launchAboutBlank;
fullscreenButton.onclick = toggleFullscreen;
fullscreenExit.onclick = toggleFullscreen;
smokescreenButton.onclick = burnHistory;
adminButton.onclick = () => { closeKinMenu(); openAddress(adminUrl); };
document.addEventListener("fullscreenchange", syncFullscreenUi);
document.addEventListener("mousemove", (event) => { if (document.fullscreenElement && event.clientY <= 14) revealFullscreenUi(); });

document.querySelectorAll("[data-theme]").forEach((button) => button.onclick = () => {
  appearance.theme = button.dataset.theme; appearance.background = themeDefaults[appearance.theme].background; appearance.accent = themeDefaults[appearance.theme].accent; applyAppearance();
});
document.querySelectorAll("[data-background]").forEach((button) => button.onclick = () => { appearance.background = button.dataset.background; applyAppearance(); });
document.querySelectorAll("[data-accent]").forEach((button) => button.onclick = () => { appearance.accent = button.dataset.accent; applyAppearance(); });
document.querySelector("#custom-accent").oninput = (event) => { appearance.accent = event.target.value; applyAppearance(); };
document.querySelector("#cursive-toggle").onchange = (event) => { appearance.cursive = event.target.checked; applyAppearance(); };
document.querySelectorAll("[data-cloak]").forEach((button) => button.onclick = () => { appearance.cloak = button.dataset.cloak; applyAppearance(); });
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
enableEngineButton.onclick = toggleKinEngine;
document.querySelector("#history-button").onclick = () => { closeModal(); const tab = createTab("history"); selectTab(tab.id); };
document.querySelector("#clear-history").onclick = async () => { await historyReady; historyEntries = []; localStorage.removeItem("kin-history-v2"); renderHistory(); };

async function burnHistory() {
  closeKinMenu();
  const overlay = document.querySelector("#smokescreen"); const toast = document.querySelector("#local-toast");
  toast.firstChild.textContent = "Local data cleared"; toast.querySelector("small").textContent = "Kin data on this device was removed.";
  overlay.classList.add("active"); historyEntries = []; bookmarks = []; starredIds = ["wikipedia", "archive", "weather"]; engineEnabled = false; localStorage.clear(); sessionStorage.clear();
  try {
    for (const key of await caches.keys()) await caches.delete(key);
    if (indexedDB.databases) for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name);
  } catch {}
  tabState.forEach((tab) => { if (tab.frame) tab.frame.element.remove(); }); tabState.length = 0;
  const fresh = createTab(); selectedId = fresh.id;
  setTimeout(() => {
    overlay.classList.remove("active"); appearance = { theme: "fire", background: "embers", accent: "#ff7a36", cursive: false, cloak: "kin" };
    applyAppearance(); setEngine("bing"); updateEngineMode(); renderBookmarks(); renderHistory(); selectTab(selectedId);
    toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 3000);
  }, 1850);
}

document.querySelector("#show-starters").checked = showStarters;
document.querySelector("#bell-reminders-toggle").checked = bellReminders;
document.querySelector("#bell-sound-toggle").checked = bellSound;
document.querySelector("#bell-reminders-toggle").onchange = (event) => { bellReminders = event.target.checked; localStorage.setItem("kin-bell-reminders", String(bellReminders)); };
document.querySelector("#bell-sound-toggle").onchange = (event) => { bellSound = event.target.checked; localStorage.setItem("kin-bell-sound", String(bellSound)); if (bellSound) armReminderAudio(); };
scheduleButton.onclick = () => toggleSchedulePanel();
document.querySelector("#schedule-close").onclick = () => toggleSchedulePanel(false);
document.querySelector("#bell-reminder-close").onclick = () => document.querySelector("#bell-reminder").classList.remove("show");
document.querySelector("#wordmark-trigger").onclick = countWordmarkClick;
document.querySelector("#fire-bucket").onclick = extinguishSite;
document.addEventListener("click", (event) => { if (!schedulePanel.classList.contains("hidden") && !event.target.closest("#schedule-panel") && !event.target.closest("#schedule-button")) toggleSchedulePanel(false); });
document.addEventListener("pointerdown", armReminderAudio, { once: true });
document.addEventListener("keydown", armReminderAudio, { once: true });
applyAppearance(false); setEngine(engineKey); updateEngineMode(); setOnboardingStep(0); showReloadQuote();
historyReady = initializeHistory();
const first = createTab(); selectedId = first.id;
updateClock(); setInterval(updateClock, 1000); checkBellReminder(); setInterval(checkBellReminder, 10000); setInterval(() => { if (!document.hidden) ensureSession(); }, 60000);
selectTab(selectedId); renderBookmarks(); loadIdentity();
