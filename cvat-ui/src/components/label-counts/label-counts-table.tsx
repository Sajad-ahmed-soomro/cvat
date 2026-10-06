// Copyright (C) 2026 Sajad Ahmed
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Table from 'antd/lib/table';

import { LabelCount } from './label-counts-api';
import { countOfKind, kindsPresent } from './annotation-kinds';

interface Props {
    labels: LabelCount[];
}

function LabelCountsTable({ labels }: Props): JSX.Element {
    const columns = [
        { title: 'Label', dataIndex: 'name', key: 'name' },
        ...kindsPresent(labels).map((kind) => ({
            title: kind.title,
            key: kind.key,
            align: 'right' as const,
            render: (_: unknown, label: LabelCount) => countOfKind(label, kind.key),
        })),
        {
            title: 'Total', dataIndex: 'count', key: 'count', align: 'right' as const,
        },
    ];

    return (
        <Table
            className='cvat-label-counts-table'
            size='small'
            rowKey='id'
            pagination={false}
            columns={columns}
            dataSource={labels}
        />
    );
}

export default React.memo(LabelCountsTable);
