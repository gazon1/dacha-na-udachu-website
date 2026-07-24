// =============================================================================
// app.js — Alpine.js + HTMX bootstrap
// =============================================================================

import "../styles/app.css";

import Alpine from "alpinejs";
import collapse from "@alpinejs/collapse";
import focus from "@alpinejs/focus";
import mask from "@alpinejs/mask";
import htmx from "htmx.org";

window.Alpine = Alpine;
window.htmx = htmx;

// Toast store — timeoutId prevents race when multiple toasts fire rapidly
Alpine.store("toast", {
  message: "",
  type: "info",
  visible: false,
  _timer: null,

  show(message, type = "info") {
    this.message = message;
    this.type = type;
    this.visible = true;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.visible = false;
    }, 4000);
  },
});

// Start Alpine after HTMX has settled
document.addEventListener("alpine:init", () => {
  Alpine.data("app", () => ({
    mobileMenuOpen: false,
    toast: Alpine.store("toast"),
  }));

  // Countdown — clears interval on destroy() to prevent memory leaks on HTMX swaps
  Alpine.data("countdown", (targetDate) => ({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    _interval: null,
    target: new Date(targetDate),

    init() {
      this.update();
      this._interval = setInterval(() => this.update(), 1000);
    },

    destroy() {
      clearInterval(this._interval);
    },

    update() {
      const diff = this.target - new Date();
      if (diff <= 0) {
        this.days = this.hours = this.minutes = this.seconds = 0;
        return;
      }
      this.days    = Math.floor(diff / 86400000);
      this.hours   = Math.floor((diff % 86400000) / 3600000);
      this.minutes = Math.floor((diff % 3600000) / 60000);
      this.seconds = Math.floor((diff % 60000) / 1000);
    },
  }));
});

Alpine.plugin(focus);   // x-trap + a11y focus management
Alpine.plugin(mask);    // x-mask for phone inputs
Alpine.plugin(collapse);
Alpine.start();

// HTMX config
htmx.config.timeout = 5000;
htmx.config.defaultSwapStyle = "outerHTML";

// HX-Trigger: return HTTP header "HX-Trigger: {\"showToast\": {...}}" from Django views
// to trigger toasts without DOM-parsing.  Alpine listens globally.
window.addEventListener("showToast", (event) => {
  Alpine.store("toast").show(event.detail.message, event.detail.type);
});
