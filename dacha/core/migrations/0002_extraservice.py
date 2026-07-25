from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExtraService",
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
                ("slug", models.SlugField(max_length=50, unique=True, verbose_name="Идентификатор")),
                ("name", models.CharField(max_length=100, verbose_name="Название")),
                ("price", models.DecimalField(decimal_places=2, max_digits=10, verbose_name="Цена")),
                ("is_active", models.BooleanField(default=True, verbose_name="Активна")),
                ("order", models.PositiveIntegerField(default=0, verbose_name="Порядок")),
            ],
            options={
                "verbose_name": "Доп. услуга",
                "verbose_name_plural": "Доп. услуги",
                "ordering": ["order", "name"],
            },
        ),
    ]
