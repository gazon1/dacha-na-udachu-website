"""
Migration: Replace UserAccount name/phone auth with Telegram Login.

Step 1 of 2: Add new fields, drop old fields.
(Split into two migrations for SQLite compatibility — UNIQUE constraint on nullable
telegram_id requires a separate migration after table recreation.)
"""
import uuid

from django.db import migrations, models


def _drop_legacy_accounts(apps, schema_editor):
    """Drop all UserAccount rows — they have name/phone but no telegram_id."""
    UserAccount = apps.get_model("core", "UserAccount")
    UserAccount.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_add_user_account_rsvp_link"),
        ("events", "0004_add_user_account_rsvp_link"),
    ]

    operations = [
        # ── Step 1: Drop all legacy rows ─────────────────────────────────────────────
        migrations.RunPython(
            _drop_legacy_accounts,
            reverse_code=migrations.RunPython.noop,
        ),
        # ── Step 2: Add new fields (all nullable — NOT NULL in 0004) ────────────────
        migrations.AddField(
            model_name="useraccount",
            name="auth_date",
            field=models.DateTimeField(
                auto_now_add=True, verbose_name="Время авторизации в Telegram"
            ),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="last_seen_at",
            field=models.DateTimeField(auto_now=True, null=True, verbose_name="Последний визит"),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="session_token",
            field=models.UUIDField(
                db_index=True,
                default=uuid.uuid4,
                null=True,
                # NOTE: UNIQUE constraint added after table rebuild (separate migration 0004)
                verbose_name="Сессия",
            ),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="telegram_first_name",
            field=models.CharField(default="", max_length=200, verbose_name="Имя (Telegram)"),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="telegram_id",
            field=models.BigIntegerField(
                db_index=True,
                null=True,
                # NOTE: UNIQUE constraint added after table rebuild (separate migration 0004)
                verbose_name="Telegram ID",
            ),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="telegram_last_name",
            field=models.CharField(
                blank=True, default="", max_length=200, verbose_name="Фамилия (Telegram)"
            ),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="telegram_photo_url",
            field=models.URLField(blank=True, default="", verbose_name="Фото (Telegram)"),
        ),
        migrations.AddField(
            model_name="useraccount",
            name="telegram_username",
            field=models.CharField(
                blank=True, default="", max_length=64, verbose_name="Telegram username"
            ),
        ),
        # ── Step 3: Remove old constraint BEFORE dropping columns ─────────────────
        # SQLite must not have any constraint referencing a column we are about to drop.
        migrations.RemoveConstraint(
            model_name="useraccount", name="unique_name_phone"
        ),
        # ── Step 4: Remove old fields ─────────────────────────────────────────────
        migrations.RemoveField(model_name="useraccount", name="name"),
        migrations.RemoveField(model_name="useraccount", name="phone"),
        migrations.RemoveField(model_name="useraccount", name="token"),
        # ── Step 5: Restore auto_now on last_seen_at ──────────────────────────────
        migrations.AlterField(
            model_name="useraccount",
            name="last_seen_at",
            field=models.DateTimeField(auto_now=True, verbose_name="Последний визит"),
        ),
        # NOTE: unique_telegram_id constraint is added in 0004 (after SQLite table recreation)
    ]
