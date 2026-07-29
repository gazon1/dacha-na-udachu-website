"""
Auth API — lightweight account registration/login (no passwords, token-based).
"""
import uuid
from ninja import Router
from pydantic import BaseModel, field_validator
from core.models import UserAccount

router = Router(tags=["auth"])


class RegisterIn(BaseModel):
    name: str
    phone: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Имя не может быть пустым")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_normalize(cls, v):
        # Normalize: strip +, spaces, dashes
        return v.strip().replace(" ", "").replace("-", "").replace("+", "")


class RegisterOut(BaseModel):
    token: str
    name: str
    phone: str


class LoginIn(BaseModel):
    name: str
    phone: str


class MeOut(BaseModel):
    token: str
    name: str
    phone: str


def _account_to_out(account: UserAccount) -> dict:
    return {
        "token": str(account.token),
        "name": account.name,
        "phone": account.phone,
    }


@router.post("/register/", response=RegisterOut)
def register(request, data: RegisterIn):
    """Create a new account or return existing one (idempotent by name+phone)."""
    account, created = UserAccount.objects.get_or_create(
        name=data.name,
        phone=data.phone,
    )
    if not created:
        # Return existing — token stays the same
        account.token = uuid.uuid4()
        account.save(update_fields=["token"])
    return RegisterOut(**_account_to_out(account))


@router.post("/login/", response=RegisterOut)
def login(request, data: LoginIn):
    """Login by name+phone — returns token."""
    try:
        account = UserAccount.objects.get(name=data.name.strip(), phone=data.phone.strip())
        account.token = uuid.uuid4()
        account.save(update_fields=["token"])
        return RegisterOut(**_account_to_out(account))
    except UserAccount.DoesNotExist:
        return {"error": "Аккаунт не найден"}, 404


@router.get("/me/", response=MeOut)
def me(request):
    """Get current user by token from X-User-Token header."""
    token = request.headers.get("X-User-Token", "")
    if not token:
        return {"error": "Токен не указан"}, 401
    try:
        account = UserAccount.objects.get(token=token)
        return MeOut(**_account_to_out(account))
    except UserAccount.DoesNotExist:
        return {"error": "Неверный токен"}, 401
