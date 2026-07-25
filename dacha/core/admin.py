from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

# TODO: re-enable when AUTH_USER_MODEL = "core.User" is restored
# from .models import User
#
#
# @admin.register(User)
# class UserAdmin(BaseUserAdmin):
#     list_display = ["username", "email", "phone", "telegram", "is_staff"]
#     fieldsets = BaseUserAdmin.fieldsets + (
#         ("Контакты", {"fields": ("phone", "telegram", "avatar")}),
#     )
