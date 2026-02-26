// sidepanel.js — Construe AI Side Panel

"use strict";

// ─── DOM References ────────────────────────────────────────────────────────
const settingsToggle  = document.getElementById("settingsToggle");
const settingsPanel   = document.getElementById("settingsPanel");
const apiKeyInput     = document.getElementById("apiKeyInput");
const toggleApiKey    = document.getElementById("toggleApiKey");
const langSelect      = document.getElementById("langSelect");
const modeSelect      = document.getElementById("modeSelect");
const saveSettings    = document.getElementById("saveSettings");
const emptyState      = document.getElementById("emptyState");
const resultsArea     = document.getElementById("resultsArea");
const keywordChip     = document.getElementById("keywordChip");
const analyzeBtn      = document.getElementById("analyzeBtn");
const analyzeBtnText  = document.getElementById("analyzeBtnText");
const responseCard    = document.getElementById("responseCard");
const responseBody    = document.getElementById("responseBody");
const loadingState    = document.getElementById("loadingState");
const errorCard       = document.getElementById("errorCard");
const errorMsg        = document.getElementById("errorMsg");
const copyBtn         = document.getElementById("copyBtn");
const clearHistory    = document.getElementById("clearHistory");
const historyList     = document.getElementById("historyList");
const historySection  = document.getElementById("historySection");

// ─── Application State ─────────────────────────────────────────────────────
let currentText     = "";
let currentResponse = "";
let history         = [];

// ─── Initialisation ────────────────────────────────────────────────────────
async function init() {
  await loadSettings();
  await loadHistory();
  renderHistory();
}
init();

// ─── Settings ──────────────────────────────────────────────────────────────

// Load persisted settings from chrome.storage.local into the UI
async function loadSettings() {
  const data = await chrome.storage.local.get(["apiKey", "lang", "mode"]);
  if (data.apiKey) apiKeyInput.value = data.apiKey;
  if (data.lang)   langSelect.value  = data.lang;
  if (data.mode)   modeSelect.value  = data.mode;
}

// Toggle the settings panel open / closed
settingsToggle.addEventListener("click", () => {
  settingsPanel.classList.remove("hidden");
  const isOpen = settingsPanel.classList.toggle("open");
  settingsToggle.style.color = isOpen ? "var(--accent)" : "";
});

// Toggle the API key input between password and plain text
toggleApiKey.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type  = isPassword ? "text" : "password";
  toggleApiKey.title = isPassword ? "Hide" : "Show";
});

// Validate and persist settings to chrome.storage.local
saveSettings.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();

  if (!key.startsWith("sk-ant-")) {
    showError("API key must start with sk-ant-");
    return;
  }

  await chrome.storage.local.set({
    apiKey: key,
    lang:   langSelect.value,
    mode:   modeSelect.value
  });

  // Show a brief confirmation, then close the panel
  saveSettings.textContent = "Saved ✓";
  saveSettings.style.background = "linear-gradient(135deg, #3d7d6b, #7ecfb2)";
  setTimeout(() => {
    saveSettings.textContent = "Save Settings";
    saveSettings.style.background = "";
    settingsPanel.classList.remove("open");
    settingsToggle.style.color = "";
  }, 1500);
});

// ─── Incoming Messages ─────────────────────────────────────────────────────

// Listen for ANALYZE_TEXT messages relayed from the background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ANALYZE_TEXT" && message.payload?.text) {
    setKeyword(message.payload.text);
  }
});

// ─── Keyword Display ────────────────────────────────────────────────────────

// Populate the UI with the newly selected text and reset previous results
function setKeyword(text) {
  currentText     = text;
  currentResponse = "";

  emptyState.classList.add("hidden");
  resultsArea.classList.remove("hidden");
  keywordChip.textContent = text;
  responseCard.classList.add("hidden");
  loadingState.classList.add("hidden");
  errorCard.classList.add("hidden");
  analyzeBtn.disabled = false;
  analyzeBtnText.textContent = "Analyze";
}

// ─── Analysis ──────────────────────────────────────────────────────────────

analyzeBtn.addEventListener("click", () => {
  if (!currentText) return;
  runAnalysis(currentText);
});

async function runAnalysis(text) {
  const { apiKey, lang, mode } = await chrome.storage.local.get(["apiKey", "lang", "mode"]);

  if (!apiKey) {
    showError("No API key found. Open Settings and enter your Anthropic API key.");
    return;
  }

  // Enter loading state
  analyzeBtn.disabled = true;
  analyzeBtnText.textContent = "Analyzing…";
  responseCard.classList.add("hidden");
  errorCard.classList.add("hidden");
  loadingState.classList.remove("hidden");

  const prompt = buildPrompt(text, mode || "explain", lang || "English");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // Required header for direct browser-to-API calls
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data   = await response.json();
    const result = data?.content?.[0]?.text || "No response received.";

    currentResponse = result;
    showResponse(result);
    addToHistory(text, result);

  } catch (err) {
    showError(err.message || "Request failed. Please try again.");
  } finally {
    // Always restore the button regardless of success or failure
    analyzeBtn.disabled = false;
    analyzeBtnText.textContent = "Re-analyze";
    loadingState.classList.add("hidden");
  }
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

// Construct the appropriate system + user prompt based on the selected mode
function buildPrompt(text, mode, lang) {
  const langNote = lang === "auto"
    ? "Respond in the same language as the selected text."
    : `Respond in ${lang}.`;

  const modeInstructions = {
    explain: `You are a knowledgeable assistant. The user has highlighted the following text from a webpage.
Explain what it means clearly and concisely — define key terms, provide context, and make it easy to understand for a general audience.
${langNote}

Selected text:
"${text}"`,

    summarize: `You are a knowledgeable assistant. The user has highlighted the following text.
Provide a concise summary of the main points.
${langNote}

Selected text:
"${text}"`,

    translate: `You are a translation assistant. Translate the following text.
If it is already in ${lang}, translate it to English instead. Keep the meaning accurate and natural.
${langNote}

Selected text:
"${text}"`,

    "fact-check": `You are a fact-checking assistant. Analyze the following text and assess whether the claims appear accurate, questionable, or unverifiable. Explain your reasoning briefly.
${langNote}

Selected text:
"${text}"`,

    expand: `You are a knowledgeable assistant. The user wants to learn more about the following text.
Expand on the topic with useful context, related concepts, examples, or deeper insights. Be informative but concise.
${langNote}

Selected text:
"${text}"`
  };

  return modeInstructions[mode] || modeInstructions.explain;
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────

function showResponse(text) {
  responseBody.textContent = text;
  responseCard.classList.remove("hidden");
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorCard.classList.remove("hidden");
  loadingState.classList.add("hidden");
  responseCard.classList.add("hidden");
}

// ─── Copy to Clipboard ───────────────────────────────────────────────────────

copyBtn.addEventListener("click", () => {
  if (!currentResponse) return;

  navigator.clipboard.writeText(currentResponse).then(() => {
    copyBtn.textContent = "✓ Copied";
    copyBtn.classList.add("copied");

    // Restore the button after 2 seconds
    setTimeout(() => {
      copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      copyBtn.classList.remove("copied");
    }, 2000);
  });
});

// ─── Query History ───────────────────────────────────────────────────────────

// Load the query history array from local storage
async function loadHistory() {
  const data = await chrome.storage.local.get("history");
  history = data.history || [];
}

// Prepend a new entry to the history array and persist it
function addToHistory(text, response) {
  const item = { text, response, time: Date.now() };
  history.unshift(item);

  // Cap the history at 20 entries to limit storage usage
  if (history.length > 20) history = history.slice(0, 20);

  chrome.storage.local.set({ history });
  renderHistory();
}

// Render the history list in the side panel
function renderHistory() {
  historyList.innerHTML = "";

  if (!history.length) {
    historySection.style.display = "none";
    return;
  }

  historySection.style.display = "";

  // Show only the 8 most recent entries in the UI
  history.slice(0, 8).forEach((item) => {
    const el = document.createElement("button");
    el.className = "history-item";
    el.innerHTML = `
      <span class="history-keyword">${escapeHtml(item.text)}</span>
      <span class="history-time">${formatTime(item.time)}</span>
    `;

    // Clicking a history entry restores the keyword and its cached response
    el.addEventListener("click", () => {
      setKeyword(item.text);
      currentResponse = item.response;
      showResponse(item.response);
    });

    historyList.appendChild(el);
  });
}

// Clear all history from the UI and local storage
clearHistory.addEventListener("click", async () => {
  history = [];
  await chrome.storage.local.remove("history");
  renderHistory();
});

// ─── Utility Functions ────────────────────────────────────────────────────────

// Escape HTML special characters to prevent XSS in innerHTML
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Return a human-readable relative time string (e.g. "3m ago", "2h ago")
function formatTime(ts) {
  const d        = new Date(ts);
  const now      = new Date();
  const diffMs   = now - d;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1)  return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return d.toLocaleDateString();
}
