// Copyright (C) 2026 Sajad Ahmed
//
// SPDX-License-Identifier: MIT

import React from 'react';
import {
    Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { LabelCount } from './label-counts-api';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BAR_HEIGHT_PX = 22;
const AXES_HEIGHT_PX = 60;
const FALLBACK_COLOR = '#1890ff';

interface Props {
    labels: LabelCount[];
}

function LabelCountsChart({ labels }: Props): JSX.Element {
    const data = {
        labels: labels.map((label) => label.name),
        datasets: [{
            label: 'Annotations',
            data: labels.map((label) => label.count),
            backgroundColor: labels.map((label) => label.color || FALLBACK_COLOR),
        }],
    };

    return (
        <div style={{ height: labels.length * BAR_HEIGHT_PX + AXES_HEIGHT_PX }}>
            <Bar
                data={data}
                options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    animation: false,
                    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
            />
        </div>
    );
}

export default React.memo(LabelCountsChart);
