# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from cvat.apps.engine.permissions import TaskPermission


class LabelCountsPermission(TaskPermission):
    """
    Label counts are derived from the task annotations, so reading them requires the
    same right as reading the annotations themselves: the existing "view:annotations"
    rule of the tasks policy. No new policy is introduced.
    """

    @classmethod
    def create(cls, request, view, obj, iam_context):
        if obj is None:
            return []

        return [
            cls.create_base_perm(
                request, view, cls.Scopes.VIEW_ANNOTATIONS, iam_context, obj
            )
        ]
