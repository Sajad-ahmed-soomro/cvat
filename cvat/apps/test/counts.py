# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from collections import Counter, defaultdict

from django.db.models import Count

from cvat.apps.engine.models import (
    Job,
    JobType,
    LabeledImage,
    LabeledShape,
    LabeledTrack,
    Task,
)

TRACK_KIND = "track"
TAG_KIND = "tag"


def count_annotations_per_label(task: Task) -> list[dict]:
    """
    Counts the annotations of a task per label, split by kind, in the database.

    The kind of a shape is its shape type (rectangle, polygon, mask, ...); tracks and tags
    are their own kinds. Only annotation jobs are counted: ground truth and consensus jobs
    repeat frames of the task. Skeleton elements are left out (parent is set), so a skeleton
    counts once. A track counts as one object, however many frames it spans.
    """
    jobs = Job.objects.filter(segment__task_id=task.id, type=JobType.ANNOTATION)
    counts_by_kind: dict[int, Counter] = defaultdict(Counter)

    shapes = LabeledShape.objects.filter(job__in=jobs, parent__isnull=True)
    for row in shapes.values("label_id", "type").annotate(count=Count("id")).order_by():
        counts_by_kind[row["label_id"]][row["type"]] += row["count"]

    for kind, queryset in (
        (TRACK_KIND, LabeledTrack.objects.filter(job__in=jobs, parent__isnull=True)),
        (TAG_KIND, LabeledImage.objects.filter(job__in=jobs)),
    ):
        for row in queryset.values("label_id").annotate(count=Count("id")).order_by():
            counts_by_kind[row["label_id"]][kind] += row["count"]

    labels = [
        {
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "count": counts_by_kind[label.id].total(),
            "count_by_kind": dict(counts_by_kind[label.id]),
        }
        for label in task.get_labels()
    ]
    labels.sort(key=lambda label: (-label["count"], label["name"]))
    return labels
