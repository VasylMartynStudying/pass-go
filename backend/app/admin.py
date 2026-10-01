from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqladmin.filters import AllUniqueStringValuesFilter
from sqlalchemy import select
from starlette.requests import Request
from wtforms import PasswordField

from app.config import get_settings
from app.database import SessionLocal, engine
from app.models import AdminUser, Event, Organizer, Registration
from app.security import hash_password, verify_password


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = str(form.get("username") or "").strip().lower()
        password = str(form.get("password") or "")
        with SessionLocal() as session:
            admin = session.scalar(select(AdminUser).where(AdminUser.email == email))
            if admin is None or not verify_password(password, admin.hashed_password):
                return False
            request.session["admin_id"] = admin.id
            return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        admin_id = request.session.get("admin_id")
        if not admin_id:
            return False
        with SessionLocal() as session:
            admin = session.get(AdminUser, admin_id)
            return admin is not None


def apply_password_hash(data: dict, *, is_created: bool) -> None:
    password = data.get("hashed_password")
    if password:
        data["hashed_password"] = hash_password(password)
    elif is_created:
        raise ValueError("Password is required for a new account.")
    else:
        data.pop("hashed_password", None)


class AdminUserAdmin(ModelView, model=AdminUser):
    name = "Admin"
    name_plural = "Admins"
    column_list = [AdminUser.id, AdminUser.email, AdminUser.full_name]
    column_searchable_list = [AdminUser.email, AdminUser.full_name]
    column_details_exclude_list = [AdminUser.hashed_password]
    form_excluded_columns = [AdminUser.created_at, AdminUser.updated_at]
    form_overrides = {"hashed_password": PasswordField}
    form_args = {
        "hashed_password": {
            "label": "Password",
            "description": "Leave empty to keep the current password.",
        }
    }
    column_labels = {
        AdminUser.full_name: "Name",
        AdminUser.hashed_password: "Password",
    }

    async def on_model_change(self, data, model, is_created, request) -> None:
        apply_password_hash(data, is_created=is_created)


class OrganizerAdmin(ModelView, model=Organizer):
    name = "Organizer"
    name_plural = "Organizers"
    column_list = [Organizer.id, Organizer.email, Organizer.full_name]
    column_searchable_list = [Organizer.email, Organizer.full_name]
    column_details_exclude_list = [Organizer.hashed_password]
    form_excluded_columns = [
        Organizer.events,
        Organizer.created_at,
        Organizer.updated_at,
    ]
    form_overrides = {"hashed_password": PasswordField}
    form_args = {
        "hashed_password": {
            "label": "Password",
            "description": "Leave empty to keep the current password.",
        }
    }
    column_labels = {
        Organizer.full_name: "Name",
        Organizer.hashed_password: "Password",
    }

    async def on_model_change(self, data, model, is_created, request) -> None:
        apply_password_hash(data, is_created=is_created)


class EventAdmin(ModelView, model=Event):
    name = "Event"
    name_plural = "Events"
    column_list = [
        Event.id,
        Event.title,
        Event.status,
        Event.moderation_status,
        Event.starts_at,
        Event.owner,
    ]
    column_searchable_list = [Event.title, Event.slug, Event.location]
    column_filters = [
        AllUniqueStringValuesFilter(Event.status, title="Status"),
        AllUniqueStringValuesFilter(Event.moderation_status, title="Moderation"),
    ]
    column_sortable_list = [Event.starts_at, Event.title]
    form_excluded_columns = [
        Event.registrations,
        Event.created_at,
        Event.updated_at,
    ]
    column_labels = {
        Event.moderation_status: "Moderation",
        Event.moderation_comment: "Moderation comment",
        Event.starts_at: "Starts at",
        Event.owner: "Organizer",
    }


class RegistrationAdmin(ModelView, model=Registration):
    name = "Registration"
    name_plural = "Registrations"
    column_list = [
        Registration.id,
        Registration.full_name,
        Registration.email,
        Registration.event,
        Registration.checked_in_at,
    ]
    column_searchable_list = [Registration.full_name, Registration.email]
    column_details_list = [
        Registration.id,
        Registration.full_name,
        Registration.email,
        Registration.event,
        Registration.ticket_token,
        Registration.checked_in_at,
        Registration.created_at,
    ]
    form_excluded_columns = [
        Registration.ticket_token,
        Registration.checked_in_at,
        Registration.created_at,
        Registration.updated_at,
    ]
    form_widget_args = {
        "ticket_token": {"readonly": True},
        "checked_in_at": {"readonly": True},
    }
    column_labels = {
        Registration.full_name: "Name",
        Registration.event: "Event",
        Registration.ticket_token: "Ticket token",
        Registration.checked_in_at: "Checked in at",
    }


def setup_admin(app) -> Admin:
    admin = Admin(
        app,
        engine,
        title="PassGo Admin",
        authentication_backend=AdminAuth(secret_key=get_settings().jwt_secret_key),
    )
    admin.add_view(AdminUserAdmin)
    admin.add_view(OrganizerAdmin)
    admin.add_view(EventAdmin)
    admin.add_view(RegistrationAdmin)
    return admin
