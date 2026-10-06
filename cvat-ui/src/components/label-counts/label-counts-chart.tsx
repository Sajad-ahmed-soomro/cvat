// Copyright (C) 2026 Sajad Ahmed
//
// SPDX-License-Identifier: MIT

import React from 'react';
import {
    Chart as ChartJS, BarElement, CategoryScale, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { LabelCount } from './label-counts-api';
import { countOfKind, kindsPresent } from './annotation-kinds';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

const BAR_HEIGHT_PX = 22;
const AXES_AND_LEGEND_HEIGHT_PX = 90;

interface Props {
    labels: LabelCount[];
}

function LabelCountsChart({ labels }: Props): JSX.Element {
    const data = {
        labels: labels.map((label) => label.name),
        datasets: kindsPresent(labels).map((kind) => ({
            label: kind.title,
            data: labels.map((label) => countOfKind(label, kind.key)),
            backgroundColor: kind.color,
            borderColor: 'white',
            borderWidth: { right: 2 },
            borderSkipped: false,
        })),
    };

    return (
        <div style={{ height: labels.length * BAR_HEIGHT_PX + AXES_AND_LEGEND_HEIGHT_PX }}>
            <Bar
                data={data}
                options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    animation: false,
                    interaction: { mode: 'index', axis: 'y', intersect: false },
                    plugins: { legend: { position: 'top', align: 'start' } },
                    scales: {
                        x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
                        y: { stacked: true },
                    },
                }}
            />
        </div>
    );
}

export default React.memo(LabelCountsChart);
