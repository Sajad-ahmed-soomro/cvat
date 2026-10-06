# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class LabelCountSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    count = serializers.IntegerField()
    count_by_kind = serializers.DictField(
        child=serializers.IntegerField(),
        help_text=(
            "Counts split by shape type, plus 'track' and 'tag'. "
            "Kinds with no annotations are omitted."
        ),
    )


class TaskLabelCountsSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()
    total = serializers.IntegerField()
    labels = LabelCountSerializer(many=True)


class LiveTicketSerializer(serializers.Serializer):
    ticket = serializers.CharField(
        help_text="Pass as ?ticket= when opening the live label counts WebSocket. Valid for 60 s."
    )
