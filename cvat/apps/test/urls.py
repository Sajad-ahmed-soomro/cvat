# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework import routers

from . import views

router = routers.SimpleRouter(trailing_slash=False)
router.register("tasks", views.TaskLabelCountsViewSet, basename="test_tasks")

urlpatterns = [
    path("test/", include(router.urls)),
]
