from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from wagtail.models import Page


class Command(BaseCommand):
    help = "Bootstrap initial site structure"

    def handle(self, *args, **options):
        # Ensure site exists
        site, created = Site.objects.get_or_create(id=1)
        home = Page.objects.filter(slug="home").first()

        if created and home:
            site.name = "dacha.maxdrobin.ru"
            site.domain = "dacha.maxdrobin.ru"
            site.root_page = home
            site.save()
            self.stdout.write(self.style.SUCCESS("Created site with root_page"))
        else:
            self.stdout.write("Site already exists or no home page")

        # Ensure home page exists under root
        root = Page.objects.get(id=1)
        if not root.get_children().filter(slug="home").exists():
            from home.models import HomePage
            home = HomePage(
                title="Home",
                slug="home",
                live=True,
            )
            root.add_child(instance=home)
            self.stdout.write(self.style.SUCCESS("Created HomePage"))
        else:
            self.stdout.write("HomePage already exists")

        self.stdout.write(self.style.SUCCESS("Bootstrap complete!"))
