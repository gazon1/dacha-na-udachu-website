// =============================================================================
// app.js — Alpine.js + HTMX bootstrap
// =============================================================================

import "../styles/app.css";

import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/l10n/ru";

import Alpine from "alpinejs";
import collapse from "@alpinejs/collapse";
import focus from "@alpinejs/focus";
import mask from "@alpinejs/mask";
import persist from "@alpinejs/persist";
import htmx from "htmx.org";

window.Alpine = Alpine;
window.htmx = htmx;

// Register Alpine plugins
Alpine.plugin(collapse);
Alpine.plugin(focus);
Alpine.plugin(mask);
Alpine.plugin(persist);

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

  // RSVP Widget — voted state persisted in localStorage, but reads DOM data-attributes
  // (set by server) first so server-rendered state always wins over stale localStorage.
  Alpine.data("rsvpWidget", function (slug) {
    return {
      voted: false,
      secretKey: "",
      rsvpId: null,
      showMenu: false,

      init() {
        // Server-controlled initial state via data attributes (set in template).
        // Falls back to localStorage if no data attributes (e.g. first load).
        const el = this.$el;
        const serverVoted = el.dataset.rsvpVoted === "true";
        const serverId = el.dataset.rsvpId ? parseInt(el.dataset.rsvpId, 10) : null;

        if (serverVoted || serverId) {
          this.voted = serverVoted;
          this.rsvpId = serverId;
          this.secretKey = el.dataset.rsvpSecretKey || "";
          // Sync back to localStorage so persistence survives a page refresh
          if (serverVoted) {
            localStorage.setItem("rsvp_voted_" + slug, "true");
          }
          if (serverId) {
            localStorage.setItem("rsvp_id_" + slug, String(serverId));
          }
          if (el.dataset.rsvpSecretKey) {
            localStorage.setItem("rsvp_key_" + slug, el.dataset.rsvpSecretKey);
          }
        } else {
          // Fall back to localStorage (for pages loaded before server-side fix)
          this.voted = localStorage.getItem("rsvp_voted_" + slug) === "true";
          this.rsvpId = localStorage.getItem("rsvp_id_" + slug)
            ? parseInt(localStorage.getItem("rsvp_id_" + slug), 10)
            : null;
          this.secretKey = localStorage.getItem("rsvp_key_" + slug) || "";
        }
      },

      vote() {
        this.voted = true;
        localStorage.setItem("rsvp_voted_" + slug, "true");
      },

      handleRsvpSuccess(form) {
        // Read rsvp_id from the hidden input in the submitted form,
        // then persist and update voted state.
        const idInput = form.querySelector("[name=rsvp_id]");
        if (idInput && idInput.value) {
          this.rsvpId = parseInt(idInput.value, 10);
          localStorage.setItem("rsvp_id_" + slug, idInput.value);
        }
        this.vote();
      },

      cancelRsvp() {
        const form = document.getElementById("rsvp-cancel-form");
        if (form) form.requestSubmit();
      },

      resetVote() {
        this.voted = false;
        this.rsvpId = null;
        this.secretKey = "";
        this.showMenu = false;
        localStorage.removeItem("rsvp_voted_" + slug);
        localStorage.removeItem("rsvp_id_" + slug);
        localStorage.removeItem("rsvp_key_" + slug);
      },
    };
  });

  // Booking page — house selection + date picker with Flatpickr
  // Shared night calculator — used by bookingPage and bookingForm
  const calcNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    return Math.max(0, (d2 - d1) / (1000 * 60 * 60 * 24));
  };

  Alpine.data("bookingPage", () => ({
    step: "house", // 'house' | 'dates' | 'form'
    selectedHouse: null,
    checkIn: null,
    checkOut: null,
    nights: 0,
    totalPrice: 0,
    bookingSummary: "",
    _datePicker: null,

    init() {
      // Flatpickr is available globally from npm import
    },

    selectHouse(id, name, price, bookedDates) {
      this.selectedHouse = { id, name, price };
      this.step = "dates";
      this.$nextTick(() => this.initDatePicker(bookedDates));
    },

    initDatePicker(bookedDates) {
      if (this._datePicker) {
        this._datePicker.destroy();
      }
      this._datePicker = flatpickr("#date-range", {
        mode: "range",
        minDate: "today",
        dateFormat: "Y-m-d",
        disable: bookedDates || [],
        locale: flatpickr.l10ns.ru,
        onChange: (selectedDates, dateStr, instance) => {
          if (selectedDates.length === 2) {
            this.checkIn = instance.formatDate(selectedDates[0], "Y-m-d");
            this.checkOut = instance.formatDate(selectedDates[1], "Y-m-d");
            this.calculatePrice();
          }
        },
      });
    },

    calculatePrice() {
      if (!this.checkIn || !this.checkOut || !this.selectedHouse) return;
      const d1 = new Date(this.checkIn);
      const d2 = new Date(this.checkOut);
      const nights = calcNights(this.checkIn, this.checkOut);
      if (nights > 0) {
        this.nights = nights;
        this.totalPrice = this.nights * this.selectedHouse.price;
        this.bookingSummary = `${this.selectedHouse.name} • ${d1.toLocaleDateString("ru-RU")} - ${d2.toLocaleDateString("ru-RU")} (${this.nights} ночей)`;
      }
    },
  }));

  // Booking form — night calculator (used in booking_page.html)
  Alpine.data("bookingForm", () => ({
    nights: 0,

    init() {
      const checkIn = document.querySelector('[name="check_in"]');
      const checkOut = document.querySelector('[name="check_out"]');
      if (checkIn && checkOut) {
        checkIn.addEventListener("change", () => this.calculate());
        checkOut.addEventListener("change", () => this.calculate());
      }
    },

    calculate() {
      const checkIn = document.querySelector('[name="check_in"]');
      const checkOut = document.querySelector('[name="check_out"]');
      this.nights = calcNights(checkIn?.value, checkOut?.value);
    },
  }));
});

// HTMX config
htmx.config.timeout = 5000;
htmx.config.defaultSwapStyle = "outerHTML";

// HX-Trigger: return HTTP header "HX-Trigger: {"showToast": {...}}" from Django views
// to trigger toasts without DOM-parsing.  Alpine listens globally.
window.addEventListener("showToast", (event) => {
  Alpine.store("toast").show(event.detail.message, event.detail.type);
});

// Global HTMX error handler — catches timeouts, 5xx, and any response
// that doesn't carry an HX-Trigger header (hx-swap="none" forms especially).
document.body.addEventListener("htmx:responseError", (event) => {
  const xhr = event.detail.xhr;
  if (!xhr.getResponseHeader("HX-Trigger")) {
    Alpine.store("toast").show(
      "Произошла ошибка. Попробуйте ещё раз.",
      "error"
    );
  }
});

// Handle HX-Trigger: rate-limited — fires when django-ratelimit blocks a request.
// The handler403 view returns HX-Trigger: rate-limited on HTMX callers.
document.body.addEventListener("rate-limited", () => {
  Alpine.store("toast").show(
    "Слишком много запросов. Попробуйте позже.",
    "warning"
  );
});

// Handle HX-Trigger: rsvp-confirmed — fires after a new RSVP is saved.
document.body.addEventListener("rsvp-confirmed", () => {
  Alpine.store("toast").show(
    "Заявка отправлена!",
    "success"
  );
});

// Start Alpine — MUST be last, after all plugins and alpine:init listeners are registered
Alpine.start();
