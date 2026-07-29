"""
Migration: Make telegram_id NOT NULL + UNIQUE, session_token NOT NULL + UNIQUE.

All rows were deleted in 0003, so this is safe on both SQLite and Postgres.
Uses standard Django AlterField + AddConstraint operations (no table rebuild on SQLite
since table is empty and column values are NULL, not violating UNIQUE).
"""
import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_telegram_user_account"),
    ]

    operations = [
        # NOT NULL + UNIQUE on telegram_id
        migrations.AlterField(
            model_name="useraccount",
            name="telegram_id",
            field=models.BigIntegerField(
                db_index=True, unique=True, verbose_name="Telegram ID"
            ),
        ),
        # NOT NULL + UNIQUE on session_token
        migrations.AlterField(
            model_name="useraccount",
            name="session_token",
            field=models.UUIDField(
                db_index=True,
                default=uuid.uuid4,
                unique=True,
                verbose_name="Сессия",
            ),
        ),
    ]
