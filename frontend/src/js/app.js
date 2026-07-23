// =============================================================================
// app.js — Alpine.js + HTMX bootstrap
// =============================================================================

import Alpine from "alpinejs";
import htmx from "htmx.org";

// Make Alpine available globally for template use
window.Alpine = Alpine;
window.htmx = htmx;

// Alpine plugins / stores
Alpine.store("toast", {
  show(message, type = "info") {
    this.message = message;
    this.type = type;
    this.visible = true;
    setTimeout(() => {
      this.visible = false;
    }, 4000);
  },
  message: "",
  type: "info",
  visible: false,
});

// Start Alpine after HTMX has settled
document.addEventListener("alpine:init", () => {
  // Global Alpine data available on <html x-data>
  Alpine.data("app", () => ({
    mobileMenuOpen: false,
    toast: Alpine.store("toast"),
  }));

  // Countdown component
  Alpine.data("countdown", (targetDate) => ({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    target: new Date(targetDate),

    init() {
      this.update();
      setInterval(() => this.update(), 1000);
    },

    update() {
      const now = new Date();
      const diff = this.target - now;

      if (diff <= 0) {
        this.days = 0;
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
        return;
      }

      this.days = Math.floor(diff / (1000 * 60 * 60 * 24));
      this.hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      this.seconds = Math.floor((diff % (1000 * 60)) / 1000);
    },
  }));
});

Alpine.start();

// Initialise HTMX
htmx.config.timeoutt = 5000;
htmx.config.defaultSwapStyle = "outerHTML";

// Restore focus after HTMX swaps (accessibility)
document.body.addEventListener("htmx:afterSwap", (event) => {
  const target = event.detail.target;
  if (target && target.querySelector) {
    const firstFocusable = target.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (firstFocusable) {
      firstFocusable.focus({ preventScroll: true });
    }
  }
});

// Swap response classes on form submissions
document.body.addEventListener("htmx:afterRequest", (event) => {
  const target = event.detail.target;
  if (!target) return;
  if (event.detail.failed) {
    target.classList.add("is-error");
    target.classList.remove("is-loading", "is-success");
  } else {
    target.classList.remove("is-loading");
  }
});

// Handle hx-post form submission showing success/error
document.body.addEventListener("htmx:afterSwap", (event) => {
  const target = event.detail.target;
  if (target.classList.contains("form-error")) {
    Alpine.store("toast").show(target.textContent.trim(), "error");
  }
});
