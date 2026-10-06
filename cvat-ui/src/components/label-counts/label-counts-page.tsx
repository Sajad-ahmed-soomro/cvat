// Copyright (C) 2026 Sajad Ahmed
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';

import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import LabelCountsChart from './label-counts-chart';
import LabelCountsTable from './label-counts-table';
import { TaskLabelCounts, fetchTaskLabelCounts } from './label-counts-api';

function LabelCountsPage(): JSX.Element {
    const taskId = +useParams<{ tid: string }>().tid;
    const [counts, setCounts] = useState<TaskLabelCounts | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [fetching, setFetching] = useState(true);

    const loadCounts = useCallback(async (): Promise<void> => {
        setFetching(true);
        try {
            setCounts(await fetchTaskLabelCounts(taskId));
            setError(null);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
        } finally {
            setFetching(false);
        }
    }, [taskId]);

    useEffect(() => {
        loadCounts();
    }, [loadCounts]);

    let content: JSX.Element;
    if (fetching && !counts && !error) {
        content = <CVATLoadingSpinner />;
    } else if (error) {
        content = (
            <Result
                className='cvat-label-counts-error'
                status='error'
                title='Could not load annotation counts'
                subTitle={error.message}
                extra={<Button type='primary' loading={fetching} onClick={loadCounts}>Retry</Button>}
            />
        );
    } else if (!counts || counts.total === 0) {
        content = (
            <Empty
                className='cvat-label-counts-empty'
                description='This task has no annotations yet'
            />
        );
    } else {
        content = (
            <>
                <Text className='cvat-label-counts-total'>
                    {`${counts.total} annotations across ${counts.labels.length} labels`}
                </Text>
                <LabelCountsChart labels={counts.labels} />
                <LabelCountsTable labels={counts.labels} />
            </>
        );
    }

    return (
        <div className='cvat-label-counts-page'>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                    <GoBackButton />
                </Col>
            </Row>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14} className='cvat-label-counts-inner'>
                    <Title level={4}>{`Annotations per label, task #${taskId}`}</Title>
                    {content}
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(LabelCountsPage);
