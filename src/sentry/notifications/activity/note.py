from typing import Any, MutableMapping

from .base import ActivityNotification


class NoteActivityNotification(ActivityNotification):
    def get_context(self) -> MutableMapping[str, Any]:
        return self.get_base_context()

    def get_template(self) -> str:
        return "sentry/emails/activity/note.txt"

    def get_html_template(self) -> str:
        return "sentry/emails/activity/note.html"

    def get_category(self) -> str:
        return "note_activity_email"
