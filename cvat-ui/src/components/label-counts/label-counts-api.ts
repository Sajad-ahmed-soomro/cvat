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
