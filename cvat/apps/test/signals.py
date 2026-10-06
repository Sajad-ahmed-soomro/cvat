# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Task

from .live import publish_task_changed


@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".notify_task_changed")
def notify_task_changed(instance: Task, **kwargs):
    # Every annotation save, delete and import ends in Task.touch(), which saves the task.
    # Publish after commit, so a page that refetches on the message sees the new rows.
    transaction.on_commit(lambda: publish_task_changed(instance.id))
