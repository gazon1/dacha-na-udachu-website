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

  // RSVP Widget — voted state persisted per-event in localStorage via @alpinejs/persist
  Alpine.data("rsvpWidget", function (slug) {
    return {
      voted: this.$persist(false).as("rsvp_voted_" + slug),
      showMenu: false,
      vote() {
        this.voted = true;
      },
      resetVote() {
        this.voted = false;
        this.showMenu = false;
      },
    };
  });

  // Booking page — house selection + date picker with Flatpickr
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
      const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
      if (diff > 0) {
        this.nights = diff;
        this.totalPrice = this.nights * this.selectedHouse.price;
        this.bookingSummary = `${this.selectedHouse.name} • ${d1.toLocaleDateString("ru-RU")} - ${d2.toLocaleDateString("ru-RU")} (${this.nights} ночей)`;
      }
    },
  }));
});

Alpine.plugin(focus);   // x-trap + a11y focus management
Alpine.plugin(mask);    // x-mask for phone inputs
Alpine.plugin(collapse);
Alpine.plugin(persist); // x-persist for localStorage-backed state
Alpine.start();

// Booking form — night calculator (used in booking_page.html via x-data="bookingForm()")
window.bookingForm = function () {
  return {
    nights: 0,

    init() {
      const checkIn = document.querySelector('[name="check_in"]');
      const checkOut = document.querySelector('[name="check_out"]');
      if (checkIn && checkOut) {
        checkIn.addEventListener('change', () => this.calculate());
        checkOut.addEventListener('change', () => this.calculate());
      }
    },

    calculate() {
      const checkIn = document.querySelector('[name="check_in"]');
      const checkOut = document.querySelector('[name="check_out"]');
      if (checkIn && checkOut && checkIn.value && checkOut.value) {
        const d1 = new Date(checkIn.value);
        const d2 = new Date(checkOut.value);
        const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
        this.nights = diff > 0 ? diff : 0;
      } else {
        this.nights = 0;
      }
    },
  };
};

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
