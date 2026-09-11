"use strict";

const engines = {
  google: { label: "Google", template: "https://www.google.com/search?q=%s" },
  duckduckgo: { label: "DuckDuckGo", template: "https://duckduckgo.com/?q=%s" },
  bing: { label: "Bing", template: "https://www.bing.com/search?q=%s" },
  brave: { label: "Brave Search", template: "https://search.brave.com/search?q=%s" },
};
const starterBookmarks = [
  { id: "wikipedia", label: "Wikipedia", url: "https://wikipedia.org" },
  { id: "archive", label: "Internet Archive", url: "https://archive.org" },
  { id: "weather", label: "Weather", url: "https://weather.com" },
  { id: "school", label: "FCPS", url: "https://www.fcps.edu" },
];

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const homeForm = document.getElementById("home-form");
const homeAddress = document.getElementById("home-address");
const searchEngine = document.getElementById("sj-search-engine");
const frameHost = document.getElementById("frame-host");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const tabs = [...document.querySelectorAll(".tab")];
let activeFrame = null;
let currentView = "home";
let customBookmarks = readJson("kin-bookmarks", []);
let engineKey = localStorage.getItem("kin-search-engine") || "google";
let showStarters = localStorage.getItem("kin-show-starters") !== "false";
if (!engines[engineKey]) engineKey = "google";

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({ files: { wasm: "/scram/scramjet.wasm.wasm", all: "/scram/scramjet.all.js", sync: "/scram/scramjet.sync.js" } });
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
scramjet.init();

function readJson(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key) || "null"); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "Website"; }
}

function normalizeUrl(value) {
  const text = value.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w-]+(?:\.[\w-]+)+(?:[/:?#].*)?$/i.test(text)) return `https://${text}`;
  return engines[engineKey].template.replace("%s", encodeURIComponent(text));
}

function setEngine(key) {
  engineKey = engines[key] ? key : "google";
  localStorage.setItem("kin-search-engine", engineKey);
  searchEngine.value = engines[engineKey].template;
  document.getElementById("engine-label").textContent = engines[engineKey].label;
  homeAddress.placeholder = `Search with ${engines[engineKey].label} or enter an address`;
  document.getElementById("engine-select").value = engineKey;
}

function showError(message, detail = "") {
  error.textContent = message;
  error.classList.add("show");
  errorCode.textContent = detail;
  window.setTimeout(() => error.classList.remove("show"), 6000);
}

function setView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((node) => node.classList.toggle("active", node.id === `${view}-view`));
  frameHost.classList.toggle("active", view === "browser");
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view || (view === "browser" && tab.dataset.view === "home")));
  const firstTab = tabs[0].querySelector("span:nth-child(2)");
  firstTab.textContent = view === "browser" ? host(address.value) : "New tab";
}

async function openAddress(raw) {
  const url = normalizeUrl(raw);
  if (!url) return;
  address.value = url;
  homeAddress.value = raw;
  try {
    await registerSW();
    const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
    if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
      await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
    }
    if (!activeFrame) {
      activeFrame = scramjet.createFrame();
      activeFrame.frame.id = "sj-frame";
      frameHost.appendChild(activeFrame.frame);
    }
    setView("browser");
    activeFrame.go(url);
  } catch (cause) {
    showError("Kin could not open that page.", cause && cause.toString ? cause.toString() : String(cause));
  }
}

function renderBookmarks() {
  const all = [...starterBookmarks, ...customBookmarks];
  const quick = showStarters ? all : customBookmarks;
  renderGrid(document.getElementById("bookmark-grid"), quick);
  renderGrid(document.getElementById("all-bookmarks"), all);
}

function renderGrid(container, items) {
  if (!items.length) { container.innerHTML = '<div class="empty">No bookmarks yet. Add one to make Kin yours.</div>'; return; }
  container.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "bookmark-card";
    const main = document.createElement("button");
    main.className = "bookmark-main";
    main.innerHTML = `<span class="bookmark-icon">◎</span><span class="bookmark-copy"><b></b><small></small></span>`;
    main.querySelector("b").textContent = item.label;
    main.querySelector("small").textContent = host(item.url);
    main.addEventListener("click", () => openAddress(item.url));
    card.appendChild(main);
    if (item.custom) {
      const remove = document.createElement("button");
      remove.className = "remove-bookmark";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${item.label}`);
      remove.addEventListener("click", () => {
        customBookmarks = customBookmarks.filter((bookmark) => bookmark.id !== item.id);
        localStorage.setItem("kin-bookmarks", JSON.stringify(customBookmarks));
        renderBookmarks();
      });
      card.appendChild(remove);
    }
    container.appendChild(card);
  });
}

function openModal(id) {
  document.getElementById("modal-backdrop").classList.remove("hidden");
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.toggle("hidden", modal.id !== id));
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.add("hidden");
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.add("hidden"));
}

form.addEventListener("submit", (event) => { event.preventDefault(); openAddress(address.value); });
homeForm.addEventListener("submit", (event) => { event.preventDefault(); openAddress(homeAddress.value); });
tabs.forEach((tab) => tab.addEventListener("click", (event) => { if (event.target.tagName !== "I") setView(tab.dataset.view); }));
document.getElementById("new-tab").addEventListener("click", () => { address.value = ""; homeAddress.value = ""; setView("home"); homeAddress.focus(); });
document.getElementById("back").addEventListener("click", () => { if (currentView === "browser" && activeFrame) activeFrame.frame.contentWindow.history.back(); else setView("home"); });
document.getElementById("forward").addEventListener("click", () => { if (activeFrame) activeFrame.frame.contentWindow.history.forward(); });
document.getElementById("reload").addEventListener("click", () => { if (currentView === "browser" && activeFrame) activeFrame.frame.contentWindow.location.reload(); else location.reload(); });
document.getElementById("settings-button").addEventListener("click", () => openModal("settings-modal"));
document.getElementById("add-bookmark").addEventListener("click", () => openModal("bookmark-modal"));
document.getElementById("add-bookmark-page").addEventListener("click", () => openModal("bookmark-modal"));
document.querySelectorAll(".close-modal").forEach((button) => button.addEventListener("click", closeModal));
document.getElementById("modal-backdrop").addEventListener("click", (event) => { if (event.target.id === "modal-backdrop") closeModal(); });
document.getElementById("engine-select").addEventListener("change", (event) => setEngine(event.target.value));
document.getElementById("show-starters").addEventListener("change", (event) => { showStarters = event.target.checked; localStorage.setItem("kin-show-starters", String(showStarters)); renderBookmarks(); });
document.getElementById("bookmark-modal").addEventListener("submit", (event) => {
  event.preventDefault();
  const label = document.getElementById("bookmark-name").value.trim();
  let url = document.getElementById("bookmark-url").value.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  customBookmarks.push({ id: crypto.randomUUID(), label, url, custom: true });
  localStorage.setItem("kin-bookmarks", JSON.stringify(customBookmarks));
  event.target.reset();
  closeModal();
  renderBookmarks();
});

document.getElementById("show-starters").checked = showStarters;
setEngine(engineKey);
renderBookmarks();
