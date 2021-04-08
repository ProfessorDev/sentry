from typing import Any, Dict, List, Mapping, Optional, Tuple
from urllib.parse import urlparse, urlunparse

from django.core.urlresolvers import reverse
from django.utils.html import escape, mark_safe

from sentry import options
from sentry.models import GroupSubscription, ProjectOption, UserAvatar, UserOption
from sentry.notifications.types import GroupSubscriptionReason
from sentry.types.integrations import ExternalProviders
from sentry.utils import json
from sentry.utils.assets import get_asset_url
from sentry.utils.avatar import get_email_avatar
from sentry.utils.email import MessageBuilder, group_id_to_email
from sentry.utils.http import absolute_uri
from sentry.utils.linksign import generate_signed_link


class ActivityNotification:
    def __init__(self, activity: Any):
        self.activity = activity
        self.project = activity.project
        self.organization = self.project.organization
        self.group = activity.group

    def _get_subject_prefix(self) -> str:
        prefix = ProjectOption.objects.get_value(project=self.project, key="mail:subject_prefix")
        if not prefix:
            prefix = options.get("mail.subject-prefix")
        return str(prefix)

    def should_email(self) -> bool:
        return True

    # TODO MARCOS 1 Move the logic to a helper, make this abstract, and import it when needed.
    def get_participants(self) -> Mapping[ExternalProviders, Mapping[Any, GroupSubscriptionReason]]:
        # TODO(dcramer): not used yet today except by Release's
        if not self.group:
            return {}

        participants = GroupSubscription.objects.get_participants(group=self.group)[
            ExternalProviders.EMAIL
        ]

        if self.activity.user is not None and self.activity.user in participants:
            receive_own_activity = (
                UserOption.objects.get_value(
                    user=self.activity.user, key="self_notifications", default="0"
                )
                == "1"
            )

            if not receive_own_activity:
                del participants[self.activity.user]

        return {ExternalProviders.EMAIL: participants}

    def get_template(self) -> str:
        return "sentry/emails/activity/generic.txt"

    def get_html_template(self) -> str:
        return "sentry/emails/activity/generic.html"

    def get_project_link(self) -> str:
        return str(absolute_uri(f"/{self.organization.slug}/{self.project.slug}/"))

    def get_group_link(self) -> str:
        referrer = self.__class__.__name__
        return str(self.group.get_absolute_url(params={"referrer": referrer}))

    def get_base_context(self) -> Dict[str, Any]:
        activity = self.activity

        context = {
            "data": activity.data,
            "author": activity.user,
            "project": self.project,
            "project_link": self.get_project_link(),
        }
        if activity.group:
            context.update(self.get_group_context())
        return context

    def get_group_context(self) -> Mapping[str, Any]:
        group_link = self.get_group_link()
        parts: List[str] = list(urlparse(group_link))
        parts[2] = parts[2].rstrip("/") + "/activity/"
        activity_link = urlunparse(parts)

        return {
            "group": self.group,
            "link": group_link,
            "activity_link": activity_link,
            "referrer": self.__class__.__name__,
        }

    def get_email_type(self) -> str:
        return f"notify.activity.{self.activity.get_type_display()}"

    def get_subject(self) -> str:
        group = self.group

        return f"{group.qualified_short_id} - {group.title}"

    def get_subject_with_prefix(self) -> bytes:
        return f"{self._get_subject_prefix()}{self.get_subject()}".encode("utf-8")

    def get_context(self) -> Dict[str, Any]:
        description, params, html_params = self.get_description()

        return {
            "activity_name": self.get_activity_name(),
            "text_description": self.description_as_text(description, params),
            "html_description": self.description_as_html(description, html_params),
        }

    def get_user_context(self, user: Any) -> Dict[Any, Any]:
        # use in case context of email changes depending on user
        return {}

    def get_activity_name(self) -> str:
        raise NotImplementedError

    def get_category(self) -> str:
        raise NotImplementedError

    def get_description(self) -> Tuple[str, Mapping[str, str], Mapping[str, str]]:
        """
        Get the description for this activity. Some description strings
        need extra parameters which are passed alongside in the tuple.
        """
        raise NotImplementedError

    def get_headers(self) -> Mapping[str, str]:
        project = self.project
        group = self.group

        headers = {
            "X-Sentry-Project": project.slug,
            "X-SMTPAPI": json.dumps({"category": self.get_category()}),
        }

        if group:
            headers.update(
                {
                    "X-Sentry-Logger": group.logger,
                    "X-Sentry-Logger-Level": group.get_level_display(),
                    "X-Sentry-Reply-To": group_id_to_email(group.id),
                }
            )

        return headers

    def avatar_as_html(self) -> Any:
        user = self.activity.user
        if not user:
            return '<img class="avatar" src="{}" width="20px" height="20px" />'.format(
                escape(self._get_sentry_avatar_url())
            )
        avatar_type = user.get_avatar_type()
        if avatar_type == "upload":
            return f'<img class="avatar" src="{escape(self._get_user_avatar_url(user))}" />'
        elif avatar_type == "letter_avatar":
            return get_email_avatar(user.get_display_name(), user.get_label(), 20, False)
        else:
            return get_email_avatar(user.get_display_name(), user.get_label(), 20, True)

    @staticmethod
    def _get_sentry_avatar_url() -> str:
        url = "/images/sentry-email-avatar.png"
        return str(absolute_uri(get_asset_url("sentry", url)))

    @staticmethod
    def _get_user_avatar_url(user: Any, size: int = 20) -> str:
        try:
            avatar = UserAvatar.objects.get(user=user)
        except UserAvatar.DoesNotExist:
            return ""

        url = reverse("sentry-user-avatar-url", args=[avatar.ident])
        if size:
            url = f"{url}?s={int(size)}"
        return str(absolute_uri(url))

    def description_as_text(self, description: str, params: Mapping[str, Any]) -> str:
        user = self.activity.user
        if user:
            name = user.name or user.email
        else:
            name = "Sentry"

        issue_name = self.group.qualified_short_id or "an issue"

        context = {"author": name, "an issue": issue_name}
        context.update(params)

        return description.format(**context)

    def description_as_html(self, description: str, params: Mapping[str, Any]) -> str:
        user = self.activity.user
        if user:
            name = user.get_display_name()
        else:
            name = "Sentry"

        fmt = '<span class="avatar-container">{}</span> <strong>{}</strong>'

        author = mark_safe(fmt.format(self.avatar_as_html(), escape(name)))

        issue_name = escape(self.group.qualified_short_id or "an issue")
        an_issue = f'<a href="{escape(self.get_group_link())}">{issue_name}</a>'

        context = {"author": author, "an issue": an_issue}
        context.update(params)

        return str(mark_safe(description.format(**context)))

    @staticmethod
    def get_unsubscribe_link(user_id: int, group_id: int) -> str:
        return generate_signed_link(
            user_id,
            "sentry-account-email-unsubscribe-issue",
            kwargs={"issue_id": group_id},
        )

    def update_user_context_from_group(
        self,
        user: Any,
        reason: GroupSubscriptionReason,
        context: Dict[str, Any],
        group: Optional[Any],
    ) -> Any:
        if group:
            context.update(
                {
                    "reason": GroupSubscriptionReason.descriptions.get(
                        reason, "are subscribed to this issue"
                    ),
                    "unsubscribe_link": self.get_unsubscribe_link(user.id, group.id),
                }
            )
        user_context = self.get_user_context(user)
        user_context.update(context)
        return user_context

    def send(self) -> None:
        """ TODO MARCOS DESCRIBE """

        if not self.should_email():
            return

        # TODO MARCOS why are we doing this renaming variables?
        organization = self.organization
        activity = self.activity
        project = self.project
        group = self.group

        context = self.get_base_context()
        context.update(self.get_context())

        for provider, mapping in self.get_participants().items():
            if provider == ExternalProviders.SLACK:
                integrations = get_integrations(organization, ExternalProviders.SLACK)
                for integration in integrations:
                    for user, reason in mapping.items():
                        send_message(
                            organization, integration, project, user, activity, group, context
                        )

            elif provider == ExternalProviders.EMAIL:
                # TODO MARCOS I might need to translate these to slack
                template = self.get_template()
                html_template = self.get_html_template()
                email_type = self.get_email_type()
                headers = self.get_headers()

                for user, reason in mapping.items():
                    user_context = self.update_user_context_from_group(user, reason, context, group)

                    msg = MessageBuilder(
                        subject=self.get_subject_with_prefix(),
                        template=template,
                        html_template=html_template,
                        headers=headers,
                        type=email_type,
                        context=user_context,
                        reference=activity,
                        reply_reference=group,
                    )
                    # TODO MARCOS how does project for for deploy notifications?
                    msg.add_users([user.id], project=project)
                    msg.send_async()
