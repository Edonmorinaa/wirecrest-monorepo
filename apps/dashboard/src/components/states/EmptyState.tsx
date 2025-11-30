'use client';

import type { ReactNode } from 'react';

import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

type EmptyStateProps = {
    icon?: string;
    title?: string;
    message: string;
    action?: ReactNode;
};

export function EmptyState({
    icon = 'solar:box-bold',
    title = 'No Data Available',
    message,
    action,
}: EmptyStateProps) {
    return (
        <Card
            sx={{
                p: 5,
                textAlign: 'center',
                minHeight: 400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Iconify icon={icon} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
                {title}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 480, mb: action ? 3 : 0 }}>
                {message}
            </Typography>
            {action}
        </Card>
    );
}
