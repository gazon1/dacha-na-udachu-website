from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="NewsletterSignup",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("email", models.EmailField(max_length=254, unique=True, verbose_name="Email")),
                ("subscribed_at", models.DateTimeField(auto_now_add=True, verbose_name="Дата подписки")),
                ("is_active", models.BooleanField(default=True, verbose_name="Активна")),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True, verbose_name="IP")),
            ],
            options={
                "verbose_name": "Подписка на рассылку",
                "verbose_name_plural": "Подписки на рассылку",
                "ordering": ["-subscribed_at"],
            },
        ),
    ]
