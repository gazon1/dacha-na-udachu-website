// ===== CONFIG (редактируйте под себя) =====
const BASE_PRICE_PER_NIGHT = 6500; // базовая цена за дом/ночь
const EXTRA_GUEST_FEE = 400;       // доплата за гостя сверх 4‑х (пример)

// ===== UTILS =====
const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
const byId = (id) => document.getElementById(id);

// ===== INIT YEARS =====
byId('year').textContent = new Date().getFullYear();

// ===== BEDS RENDER =====
const bedTemplate = (house, idx) => `
<div class="bed" role="checkbox" aria-checked="false" tabindex="0" data-house="${house}" data-bed="${idx}">
<div class="tick">✓</div>
<div><strong>Кровать ${idx + 1}</strong></div>
<div class="cap">Дом ${house}</div>
</div>`;

const renderBeds = (containerId, houseLabel) => {
    const el = byId(containerId);
    el.innerHTML = Array.from({ length: 4 }, (_, i) => bedTemplate(houseLabel, i)).join('');
};

renderBeds('houseA', 'А');
renderBeds('houseB', 'Б');

const selectedBeds = new Set();

const updateBedsOut = () => {
    byId('bedsOut').textContent = selectedBeds.size + '/8';
};

const toggleBed = (bedEl) => {
    const key = bedEl.dataset.house + '-' + bedEl.dataset.bed;
    if (selectedBeds.has(key)) {
        selectedBeds.delete(key);
        bedEl.classList.remove('selected');
        bedEl.setAttribute('aria-checked', 'false');
    } else if (selectedBeds.size < 8) {
        selectedBeds.add(key);
        bedEl.classList.add('selected');
        bedEl.setAttribute('aria-checked', 'true');
    }
    updateBedsOut();
    recalc();
};

document.querySelectorAll('.beds').forEach(group => {
    group.addEventListener('click', (e) => {
        const bed = e.target.closest('.bed');
        if (bed) toggleBed(bed);
    });
    group.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const bed = e.target.closest('.bed');
            if (bed) { e.preventDefault(); toggleBed(bed); }
        }
    });
});

// ===== DATES =====
const checkin = byId('checkin');
const checkout = byId('checkout');

const todayISO = new Date().toISOString().split('T')[0];
checkin.min = todayISO;
checkout.min = todayISO;

const nightsBetween = () => {
    const a = new Date(checkin.value);
    const b = new Date(checkout.value);
    if (!checkin.value || !checkout.value) return 0;
    const ms = b - a;
    return ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : 0;
};


function check_handler() {
    const n = nightsBetween();
    byId('nights').textContent = n;
    recalc();
}


// Добавляем JavaScript для ограничения дат
document.addEventListener('DOMContentLoaded', function () {
    const checkIn = byId('checkin');
    const checkOut = byId('checkout');

    checkIn.addEventListener('change', function () {
        checkOut.min = checkIn.value;
        check_handler();
    });

    checkOut.addEventListener('change', function () {
        checkIn.max = checkOut.value;
        check_handler();
    });
});

// ===== OPTIONS =====
const extrasInputs = Array.from(document.querySelectorAll('.option input[type="checkbox"]'));

const extrasSum = () => extrasInputs
    .filter(i => i.checked)
    .map(i => Number(i.dataset.price))
    .reduce((a, b) => a + b, 0);

extrasInputs.forEach(i => i.a.addEventListener('change', () => {
    byId('extrasOut').textContent = fmt(extrasSum());
    recalc();
}));

byId('guests').addEventListener('change', (e) => {
    byId('guestsOut').textContent = e.target.value;
    recalc();
});

// [checkin, checkout].forEach(el => el.addEventListener('change', () => {
//     const n = nightsBetween();
//     byId('nights').textContent = n;
//     recalc();
// }));

// ===== PRICE LOGIC =====
const recalc = () => {
    const n = nightsBetween();
    const guests = Number(byId('guests').value);

    // базовая логика: цена за дом/ночь * число ночей.
    // Если выбрано >4 мест, введём небольшую доплату за гостя (пример модели).
    const extraGuests = Math.max(0, guests - 4);
    const base = BASE_PRICE_PER_NIGHT * n;
    const guestFee = extraGuests * EXTRA_GUEST_FEE * n;

    const total = base + guestFee + extrasSum();

    byId('basePerNight').textContent = fmt(BASE_PRICE_PER_NIGHT);
    byId('extrasOut').textContent = fmt(extrasSum());
    byId('total').textContent = fmt(total);
};

recalc();

// ===== MODAL =====
const modal = byId('modal');
const openModal = (text) => {
    byId('mBody').textContent = text;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};
const closeModal = () => { modal.style.display = 'none'; document.body.style.overflow = ''; };

byId('bookBtn').addEventListener('click', () => {
    const n = nightsBetween();
    if (n <= 0) {
    openModal('Проверьте даты заезда и выезда (минимум 1 ночь).');
    return;
}
};

if (selectedBeds.size === 0) {
    openModal('Выберите хотя бы одно спальное место.');
    return;
}

const text = `Вы забронировали: ${n} ноч. • Гостей: ${byId('guests').value} • Мест: ${selectedBeds.size}\n` +
    `Заезд: ${checkin.value} → Выезд: ${checkout.value}\n` +
    `Итого к оплате: ${ byId('total').textContent}`;
openModal(text);

byId('closeModal').addEventListener('click', closeModal);
byId('confirmModal').addEventListener('click', closeModal);
