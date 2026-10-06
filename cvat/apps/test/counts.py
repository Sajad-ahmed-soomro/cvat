# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from collections import Counter

from django.db.models import Count

from cvat.apps.engine.models import (
    Job,
    JobType,
    LabeledImage,
    LabeledShape,
    LabeledTrack,
    Task,
)


def count_annotations_per_label(task: Task) -> list[dict]:
    """
    Counts the annotations of a task per label, in the database.

    Only annotation jobs are counted: ground truth and consensus jobs repeat frames
    of the task. Skeleton elements are left out (parent is set), so a skeleton counts once.
    A track counts as one object, however many frames it spans.
    """
    jobs = Job.objects.filter(segment__task_id=task.id, type=JobType.ANNOTATION)
    annotation_querysets = (
        LabeledShape.objects.filter(job__in=jobs, parent__isnull=True),
        LabeledTrack.objects.filter(job__in=jobs, parent__isnull=True),
        LabeledImage.objects.filter(job__in=jobs),
    )

    counts = Counter()
    for queryset in annotation_querysets:
        for row in queryset.values("label_id").annotate(count=Count("id")).order_by():
            counts[row["label_id"]] += row["count"]

    labels = [
        {"id": label.id, "name": label.name, "color": label.color, "count": counts[label.id]}
        for label in task.get_labels()
    ]
    labels.sort(key=lambda label: (-label["count"], label["name"]))
    return labels
