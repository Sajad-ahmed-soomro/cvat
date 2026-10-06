// Copyright (C) 2026 Sajad Ahmed
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';

const core = getCore();

export interface LabelCount {
    id: number;
    name: string;
    color: string;
    count: number;
    count_by_kind: Record<string, number>;
}

export interface TaskLabelCounts {
    task_id: number;
    total: number;
    labels: LabelCount[];
}

export async function fetchTaskLabelCounts(taskId: number): Promise<TaskLabelCounts> {
    const response = await core.server.request<{ data: TaskLabelCounts }>(
        `${core.config.backendAPI}/test/tasks/${taskId}/label-counts`,
        { method: 'GET' },
    );
    return response.data;
}

export async function fetchLiveTicket(taskId: number): Promise<string> {
    const response = await core.server.request<{ data: { ticket: string } }>(
        `${core.config.backendAPI}/test/tasks/${taskId}/label-counts/live-ticket`,
        { method: 'GET' },
    );
    return response.data.ticket;
}

export function liveSocketURL(taskId: number, ticket: string): string {
    const url = new URL(`${core.config.backendAPI}/test/tasks/${taskId}/label-counts/live`, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('ticket', ticket);
    return url.toString();
}
