// Copyright (C) 2026 Sajad Ahmed
//
// SPDX-License-Identifier: MIT

import { LabelCount } from './label-counts-api';

const OTHER_KIND = 'other';

// Fixed order and color per kind, so a kind keeps its color whichever kinds a task has.
// Eight colorblind-checked hues: the rarer shape types share the last slot.
export const ANNOTATION_KINDS: { key: string; title: string; color: string }[] = [
    { key: 'rectangle', title: 'Rectangle', color: '#2a78d6' },
    { key: 'polygon', title: 'Polygon', color: '#eb6834' },
    { key: 'mask', title: 'Mask', color: '#1baf7a' },
    { key: 'track', title: 'Track', color: '#eda100' },
    { key: 'tag', title: 'Tag', color: '#e87ba4' },
    { key: 'ellipse', title: 'Ellipse', color: '#008300' },
    { key: 'skeleton', title: 'Skeleton', color: '#4a3aa7' },
    { key: OTHER_KIND, title: 'Other (polyline, points, cuboid)', color: '#e34948' },
];

const NAMED_KINDS = new Set(ANNOTATION_KINDS.map((kind) => kind.key));

export function countOfKind(label: LabelCount, kind: string): number {
    if (kind !== OTHER_KIND) {
        return label.count_by_kind[kind] ?? 0;
    }

    return Object.entries(label.count_by_kind)
        .filter(([key]) => !NAMED_KINDS.has(key))
        .reduce((sum, [, count]) => sum + count, 0);
}

export function kindsPresent(labels: LabelCount[]): typeof ANNOTATION_KINDS {
    return ANNOTATION_KINDS.filter((kind) => labels.some((label) => countOfKind(label, kind.key) > 0));
}
