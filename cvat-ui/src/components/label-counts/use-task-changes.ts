// Copyright (C) 2026 Sajad Ahmed
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef, useState } from 'react';

import { fetchLiveTicket, liveSocketURL } from './label-counts-api';

export enum LiveStatus {
    CONNECTING = 'connecting',
    LIVE = 'live',
    OFFLINE = 'offline',
}

const FIRST_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
// An import touches the task once per job: one refetch covers a burst of changes.
const CHANGE_DEBOUNCE_MS = 300;

/**
 * Calls onChange whenever the task changes on the server, and after every (re)connection,
 * since changes made while disconnected were not reported. Reconnects with exponential backoff.
 */
export function useTaskChanges(taskId: number, onChange: () => void): LiveStatus {
    const [status, setStatus] = useState(LiveStatus.CONNECTING);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        let stopped = false;
        let socket: WebSocket | null = null;
        let failedAttempts = 0;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        let changeTimer: ReturnType<typeof setTimeout> | undefined;

        const reportChange = (): void => {
            clearTimeout(changeTimer);
            changeTimer = setTimeout(() => onChangeRef.current(), CHANGE_DEBOUNCE_MS);
        };

        async function connect(): Promise<void> {
            const retryLater = (): void => {
                setStatus(LiveStatus.OFFLINE);
                const delay = Math.min(FIRST_RETRY_DELAY_MS * 2 ** failedAttempts, MAX_RETRY_DELAY_MS);
                failedAttempts += 1;
                retryTimer = setTimeout(connect, delay);
            };

            setStatus(LiveStatus.CONNECTING);
            let ticket: string;
            try {
                ticket = await fetchLiveTicket(taskId);
            } catch {
                if (!stopped) retryLater();
                return;
            }
            if (stopped) return;

            socket = new WebSocket(liveSocketURL(taskId, ticket));
            socket.onopen = () => {
                failedAttempts = 0;
                setStatus(LiveStatus.LIVE);
                reportChange();
            };
            socket.onmessage = reportChange;
            socket.onclose = () => {
                if (!stopped) retryLater();
            };
        }

        connect();
        return () => {
            stopped = true;
            clearTimeout(retryTimer);
            clearTimeout(changeTimer);
            socket?.close();
        };
    }, [taskId]);

    return status;
}
