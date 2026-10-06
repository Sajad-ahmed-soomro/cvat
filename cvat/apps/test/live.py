# Copyright (C) 2026 Sajad Ahmed
#
# SPDX-License-Identifier: MIT

"""
Live label counts: tells open pages that a task changed, so they fetch the counts again.

Any process that saves a task (the server, or an import worker) publishes the task id to a
Redis channel. Each open page holds a WebSocket subscribed to its task's channel. The socket
carries only "task changed", never counts, so the counts and their access check stay in
the REST endpoint.

Browsers cannot send an Authorization header on a WebSocket. The page first asks the
REST API for a short-lived ticket, which that request's permission check guards,
and presents it when connecting.
"""

import asyncio
import json
import re
from urllib.parse import parse_qs

from django.conf import settings
from django.core import signing
from django_rq.queues import get_redis_connection
from redis import asyncio as redis_asyncio

TICKET_SALT = "cvat.apps.test.live-ticket"
CHANNEL_PREFIX = "cvat.apps.test.task-changed"
TICKET_MAX_AGE_SECONDS = 60
LIVE_PATH = re.compile(r"^/api/test/tasks/(?P<task_id>\d+)/label-counts/live$")


def _channel(task_id: int) -> str:
    return f"{CHANNEL_PREFIX}:{task_id}"


def issue_ticket(task_id: int) -> str:
    return signing.dumps({"task_id": task_id}, salt=TICKET_SALT)


def _ticket_allows(ticket: str, task_id: int) -> bool:
    try:
        payload = signing.loads(ticket, salt=TICKET_SALT, max_age=TICKET_MAX_AGE_SECONDS)
    except signing.BadSignature:
        return False

    return payload["task_id"] == task_id


def publish_task_changed(task_id: int) -> None:
    get_redis_connection(settings.REDIS_INMEM_SETTINGS).publish(_channel(task_id), task_id)


async def _serve_task_socket(scope, receive, send, task_id: int) -> None:
    await receive()  # websocket.connect

    ticket = parse_qs(scope["query_string"].decode()).get("ticket", [""])[0]
    if not _ticket_allows(ticket, task_id):
        # Closing before accepting makes the server refuse the handshake with HTTP 403.
        await send({"type": "websocket.close"})
        return

    redis = redis_asyncio.Redis(
        host=settings.REDIS_INMEM_SETTINGS["HOST"],
        port=settings.REDIS_INMEM_SETTINGS["PORT"],
        password=settings.REDIS_INMEM_SETTINGS["PASSWORD"] or None,
    )
    pubsub = redis.pubsub(ignore_subscribe_messages=True)
    await pubsub.subscribe(_channel(task_id))
    await send({"type": "websocket.accept"})

    async def forward_changes():
        changed = json.dumps({"type": "task_changed", "task_id": task_id})
        async for _ in pubsub.listen():
            await send({"type": "websocket.send", "text": changed})

    forwarding = asyncio.create_task(forward_changes())
    try:
        while (await receive())["type"] != "websocket.disconnect":
            pass
    finally:
        forwarding.cancel()
        await pubsub.aclose()
        await redis.aclose()


def with_live_label_counts(http_application):
    """Wraps the Django ASGI application, which only handles HTTP, to serve the live sockets."""

    async def application(scope, receive, send):
        if scope["type"] != "websocket":
            return await http_application(scope, receive, send)

        match = LIVE_PATH.match(scope["path"])
        if not match:
            await receive()
            await send({"type": "websocket.close"})
            return

        await _serve_task_socket(scope, receive, send, int(match["task_id"]))

    return application
