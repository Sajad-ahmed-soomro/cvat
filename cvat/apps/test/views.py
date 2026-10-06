# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from cvat.apps.engine.models import Task

from .counts import count_annotations_per_label
from .live import issue_ticket
from .permissions import LabelCountsPermission
from .serializers import LiveTicketSerializer, TaskLabelCountsSerializer


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

    @extend_schema(
        summary="Get a ticket for the WebSocket that reports changes to the task",
        responses=LiveTicketSerializer,
    )
    @action(detail=True, methods=["GET"], url_path="label-counts/live-ticket")
    def live_ticket(self, request, pk):
        task = self.get_object()
        return Response(LiveTicketSerializer({"ticket": issue_ticket(task.id)}).data)
