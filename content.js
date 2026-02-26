// content.js — Injected into every webpage

(function () {
  "use strict";

  let floatingBtn = null;
  let hideTimer = null;
  let lastSelection = "";

  // ─── Create the floating trigger button ───────────────────────────────────
  function createFloatingButton() {
    if (floatingBtn) return;

    floatingBtn = document.createElement("div");
    floatingBtn.id = "__construe_floating_btn__";
    floatingBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <span>Ask Construe</span>
    `;

    // Base styles — injected inline to avoid conflicts with host page stylesheets
    Object.assign(floatingBtn.style, {
      position: "fixed",
      zIndex: "2147483647",
      display: "none",
      alignItems: "center",
      gap: "6px",
      padding: "7px 13px",
      background: "#1a1a2e",
      color: "#e8e0f0",
      border: "1px solid rgba(180,140,255,0.35)",
      borderRadius: "20px",
      fontSize: "12.5px",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: "600",
      letterSpacing: "0.01em",
      cursor: "pointer",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(180,140,255,0.1)",
      userSelect: "none",
      pointerEvents: "auto",
      transition: "opacity 0.15s ease, transform 0.15s ease",
      opacity: "0",
      transform: "translateY(4px) scale(0.96)"
    });

    // Hover state — darken background and brighten border
    floatingBtn.addEventListener("mouseenter", () => {
      floatingBtn.style.background = "#2d1f4e";
      floatingBtn.style.borderColor = "rgba(180,140,255,0.65)";
    });
    floatingBtn.addEventListener("mouseleave", () => {
      floatingBtn.style.background = "#1a1a2e";
      floatingBtn.style.borderColor = "rgba(180,140,255,0.35)";
    });

    // On click, send the selected text to the background service worker
    floatingBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = lastSelection.trim();
      if (!text) return;

      hideFloatingButton();

      chrome.runtime.sendMessage({
        type: "SELECTION_MADE",
        payload: { text }
      });
    });

    document.body.appendChild(floatingBtn);
  }

  // ─── Position and show the button near the cursor ─────────────────────────
  function showFloatingButton(x, y) {
    if (!floatingBtn) createFloatingButton();

    clearTimeout(hideTimer);

    // Dimensions used to position the button above the cursor
    const btnWidth = 110;
    const btnHeight = 34;
    const margin = 10;

    let left = x - btnWidth / 2;
    let top = y - btnHeight - margin;

    // Clamp to viewport bounds so the button never clips off-screen
    left = Math.max(8, Math.min(left, window.innerWidth - btnWidth - 8));
    top = Math.max(8, top);

    floatingBtn.style.left = left + "px";
    floatingBtn.style.top = top + "px";
    floatingBtn.style.display = "flex";

    // Trigger entrance animation on the next frame
    requestAnimationFrame(() => {
      floatingBtn.style.opacity = "1";
      floatingBtn.style.transform = "translateY(0) scale(1)";
    });
  }

  // ─── Hide the button with a fade-out transition ───────────────────────────
  function hideFloatingButton() {
    if (!floatingBtn) return;
    floatingBtn.style.opacity = "0";
    floatingBtn.style.transform = "translateY(4px) scale(0.96)";
    hideTimer = setTimeout(() => {
      if (floatingBtn) floatingBtn.style.display = "none";
    }, 150);
  }

  // ─── Detect text selection on mouseup ────────────────────────────────────
  document.addEventListener("mouseup", (e) => {
    // Ignore events originating from our own button
    if (e.target && e.target.closest && e.target.closest("#__construe_floating_btn__")) return;

    // Use a small timeout to allow the browser to finalize the selection
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : "";

      if (text.length >= 2) {
        lastSelection = text;
        showFloatingButton(e.clientX, e.clientY);
      } else {
        lastSelection = "";
        hideFloatingButton();
      }
    }, 10);
  });

  // Hide the button when the user clicks anywhere else on the page
  document.addEventListener("mousedown", (e) => {
    if (e.target && e.target.closest && e.target.closest("#__construe_floating_btn__")) return;
    hideFloatingButton();
  });

  // Hide the button when the user scrolls the page
  document.addEventListener("scroll", hideFloatingButton, { passive: true });

})();
