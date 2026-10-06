# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from cvat.apps.engine.models import Task

from .counts import count_annotations_per_label
from .permissions import LabelCountsPermission
from .serializers import TaskLabelCountsSerializer


@extend_schema(tags=["test"])
class TaskLabelCountsViewSet(viewsets.GenericViewSet):
    queryset = Task.objects.select_related("project")
    iam_permission_class = LabelCountsPermission
    # Only per-task (detail) routes: the list filters do not apply, access is checked by OPA.
    filter_backends = []

    @extend_schema(
        summary="Get the number of annotations per label of a task",
        responses=TaskLabelCountsSerializer,
    )
    @action(detail=True, methods=["GET"], url_path="label-counts")
    def label_counts(self, request, pk):
        task = self.get_object()
        labels = count_annotations_per_label(task)
        serializer = TaskLabelCountsSerializer(
            {
                "task_id": task.id,
                "total": sum(label["count"] for label in labels),
                "labels": labels,
            }
        )
        return Response(serializer.data)
