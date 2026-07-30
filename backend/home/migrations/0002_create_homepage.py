"""
Data migration: Create complete site structure with HomePage and all index pages.
Uses a multi-step approach to handle the NOT NULL constraint on Site.root_page_id.
"""

from django.db import migrations, connection


def get_or_create_page(apps, parent, page_class, title, slug, **kwargs):
    """Helper to create or get a page."""
    Page = apps.get_model('wagtailcore', 'Page')
    ContentType = apps.get_model('contenttypes', 'ContentType')

    # Check if page with this slug already exists under parent
    existing = Page.objects.filter(slug=slug, depth=parent.depth + 1).first()
    if existing:
        return existing

    content_type = ContentType.objects.get_for_model(page_class)

    # Get next available path suffix
    root_path = parent.path
    existing_paths = set(
        Page.objects.filter(depth=parent.depth + 1).values_list('path', flat=True)
    )

    new_suffix = None
    for suffix in ['0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009']:
        if root_path + suffix not in existing_paths:
            new_suffix = suffix
            break

    if not new_suffix:
        import time
        new_suffix = str(int(time.time()))[-4:]

    new_path = root_path + new_suffix

    page = page_class(
        title=title,
        slug=slug,
        depth=parent.depth + 1,
        path=new_path,
        content_type=content_type,
        locale_id=1,
        **kwargs
    )
    page.save()
    return page


def create_site_structure(apps, schema_editor):
    """Create complete site structure: HomePage with child index pages."""
    Site = apps.get_model('wagtailcore', 'Site')
    Page = apps.get_model('wagtailcore', 'Page')
    HomePage = apps.get_model('home', 'HomePage')
    HousesIndexPage = apps.get_model('houses', 'HousesIndexPage')
    EventsIndexPage = apps.get_model('events', 'EventsIndexPage')
    FAQPage = apps.get_model('faq', 'FAQPage')
    NewsIndexPage = apps.get_model('news', 'NewsIndexPage')

    # If HomePage already exists, check if we need to create child pages
    homepage = HomePage.objects.first()
    if not homepage:
        # Create HomePage under root
        root = Page.objects.filter(depth=1).first()
        if not root:
            return

        # Delete welcome page first if exists
        welcome = Page.objects.filter(depth=2, slug='home').first()
        if welcome:
            # Update any sites referencing the welcome page to point to root first
            root = Page.objects.filter(depth=1).first()
            if root:
                Site.objects.filter(root_page=welcome).update(root_page=root)
            with connection.cursor() as cursor:
                cursor.execute('DELETE FROM wagtailcore_page WHERE id = %s', [welcome.id])

        home_content_type = apps.get_model('contenttypes', 'ContentType').objects.get_for_model(HomePage)
        homepage = HomePage(
            title="Дача",
            slug="home",
            depth=2,
            path="00010002",
            content_type=home_content_type,
            locale_id=1,
            body=[
                {
                    "type": "hero",
                    "value": {
                        "title": "Дача — ваше место для событий",
                        "subtitle": "Уютное пространство для встреч, мероприятий и отдыха",
                        "button_text": "Забронировать",
                        "button_url": "/booking/",
                    },
                },
                {
                    "type": "features",
                    "value": {
                        "title": "Почему выбирают нас",
                        "features": [
                            {"icon": "location_on", "text": "Удобное расположение"},
                            {"icon": "group", "text": "Пространство до 50 гостей"},
                            {"icon": "event", "text": "Ивенты и мастер-классы"},
                            {"icon": "wifi", "text": "Wi-Fi и всё необходимое"},
                        ],
                    },
                },
                {
                    "type": "cta",
                    "value": {
                        "title": "Хотите забронировать?",
                        "description": "Свяжитесь с нами для уточнения деталей и наличия",
                        "button_text": "Начать бронирование",
                        "button_url": "/booking/",
                    },
                },
            ],
        )
        homepage.save()

    # Update Site to point to HomePage
    Site.objects.all().update(root_page=homepage)

    # Create child index pages if they don't exist
    # Houses index
    get_or_create_page(apps, homepage, HousesIndexPage, "Дома", "houses")

    # Events index
    get_or_create_page(apps, homepage, EventsIndexPage, "События", "events")

    # FAQ page
    get_or_create_page(apps, homepage, FAQPage, "Вопросы и ответы", "faq")

    # News index
    get_or_create_page(apps, homepage, NewsIndexPage, "Новости", "news")

    # Fix numchild counters for all parent pages
    for page in Page.objects.filter(depth__gte=1):
        page.numchild = Page.objects.filter(depth=page.depth + 1, path__startswith=page.path).count()
        page.save(update_fields=['numchild'])


def reverse_migration(apps, schema_editor):
    """Remove all created pages."""
    HomePage = apps.get_model('home', 'HomePage')
    HomePage.objects.filter(slug='home').delete()


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('home', '0001_initial'),
        ('news', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_site_structure, reverse_migration),
    ]
