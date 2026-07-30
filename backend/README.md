# Dacha — Wagtail CMS for a Country Hotel & Event Site

**Stack:** Wagtail 7 + Django 5.2 + Tailwind v4 + daisyUI v5 + Alpine.js + HTMX + Vite

---

## Quick Start

### Requirements
- Python 3.12+
- Node.js 20+
- PostgreSQL 16+ (for production)
- Redis 7+ (optional, for caching)

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/your-org/dacha.git
cd dacha
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 2. Install frontend deps
npm install

# 3. Run migrations
python manage.py migrate

# 4. Create a superuser
python manage.py createsuperuser

# 5. Bootstrap initial content
python manage.py migrate  # (homepage is created via migration 0002)

# 6. Run dev servers (two terminals)
npm run dev        # Vite dev server on :5173
python manage.py runserver  # Django on :8000
```

### Docker Compose (full stack)

```bash
cp .env.example .env  # edit if needed
docker compose up --build
```

---

## Environment Variables

### Required in production

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | Django secret key | `django-insecure-...` |
| `ALLOWED_HOSTS` | Allowed hosts | `dacha.maxdrobin.ru` |
| `CSRF_TRUSTED_ORIGINS` | CSRF allowed origins | `https://dacha.maxdrobin.ru` |
| `POSTGRES_DB` | PostgreSQL database name | `dacha` |
| `POSTGRES_USER` | PostgreSQL user | `dacha` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `***` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |

### Optional

| Variable | Description | Default |
|---|---|---|
| `EMAIL_HOST` | SMTP host | `""` (console backend) |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_HOST_USER` | SMTP user | `""` |
| `EMAIL_HOST_PASSWORD` | SMTP password | `""` |
| `REDIS_URL` | Redis URL | `redis://localhost:6379/0` |

---

## Project Structure

```
dacha/
├── booking/          # Booking app (models, forms, views, services)
├── core/             # User model, SiteSettings, NewsletterSignup, http_utils, sitemaps
├── dacha/           # Django settings, urls, blocks, templates
│   ├── settings/    # base.py, dev.py, production.py, test.py
│   ├── templates/    # base.html, includes/ (header, footer, components)
│   └── blocks.py     # Shared Wagtail StreamField blocks
├── events/          # EventPage, RSVP, drivers, carpools, taxi
├── faq/             # FAQPage
├── home/            # HomePage
├── houses/          # HousePage
├── news/            # NewsPage
├── search/          # Search functionality
└── frontend/        # Vite + Tailwind v4 + daisyUI source
```

### Key Files

| File | Purpose |
|---|---|
| `dacha/blocks.py` | Single source of truth for all StreamField blocks |
| `core/http_utils.py` | Shared HTMX response helpers (`htmx_error`, `htmx_success`) |
| `core/utils.py` | Cross-app validators (Telegram username) |
| `core/sitemaps.py` | Wagtail sitemaps for EventPage and NewsPage |
| `booking/services.py` | Price calculation, booking creation |
| `booking/availability.py` | Date overlap checking |

---

## Apps

### booking
- `Booking` model with `DateRange` (PostgreSQL), price snapshots, JSON options
- `BookingForm` with `is_available()` pre-check before `create_booking()`
- Price calculation via `services.calculate_total()` and `calculate_nights()`
- Rate-limited submission via `django-ratelimit`

### events
- `EventPage` (RoutablePageMixin) with RSVP, drivers, carpool requests, taxi pools
- HTMX modals for adding cars/requests/taxis
- iCal generation via `event_ical` route
- Admin signals on new drivers/RSVPs

### core
- `SiteSettings` — brand name, phone, email, address, extra prices
- `NewsletterSignup` — GDPR-compliant email subscription with IP capture
- `User` — extends AbstractUser with phone/telegram/avatar

---

## Frontend

### Tailwind v4 + daisyUI v5
- Custom theme: `community` (green primary `#7fba2f`, magenta secondary `#c84b89`)
- CSS variables via `@theme` for brand colors
- `daisyUI` components with `data-theme="community"` on `<html>`

### Component Library
| Component | Path |
|---|---|
| Button | `includes/components/_button.html` |
| Pagination | `includes/components/_pagination.html` |
| Breadcrumb | `includes/components/_breadcrumb.html` |
| Toast | `includes/components/_toast.html` |
| Listing Card | `includes/components/_listing_card.html` |
| Page Hero | `includes/components/_page_hero.html` |

---

## Testing

```bash
pytest                    # all tests
pytest booking/tests.py   # booking app only
pytest -k event         # event-related tests
```

---

## Deployment

### Production Checklist

1. Set all required environment variables
2. Run `python manage.py migrate`
3. Run `python manage.py collectstatic`
4. Configure `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`
5. Enable `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`
6. Set up email SMTP credentials
7. Run `npm run build` for frontend production bundle

### nginx config snippet

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /static/ {
    alias /app/static/;
}

location /media/ {
    alias /app/media/;
}
```

---

## Management Commands

```bash
python manage.py bootstrap_site  # (deprecated — homepage created via migration)
```
