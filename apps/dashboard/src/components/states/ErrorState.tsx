'use client';

import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

type ErrorType = 'not-found' | 'permission' | 'network' | 'general';

type ErrorStateProps = {
    type: ErrorType;
    platform?: string;
    onRetry?: () => void;
    customMessage?: string;
};

const ERROR_CONFIGS: Record<ErrorType, {
    icon: string;
    title: (platform?: string) => string;
    message: string;
    action: string | null;
    color: 'error' | 'warning';
}> = {
    'not-found': {
        icon: 'solar:close-circle-bold',
        title: (platform) => `${platform || 'Business'} Profile Not Found`,
        message: "This location doesn't have a profile set up yet for this platform.",
        action: 'Set Up Profile',
        color: 'warning',
    },
    'permission': {
        icon: 'solar:lock-bold',
        title: () => 'Access Denied',
        message: "You don't have permission to view this page.",
        action: null,
        color: 'error',
    },
    'network': {
        icon: 'solar:wifi-router-broken',
        title: () => 'Connection Error',
        message: 'Unable to load data. Please check your connection and try again.',
        action: 'Retry',
        color: 'error',
    },
    'general': {
        icon: 'solar:danger-triangle-bold',
        title: () => 'Something Went Wrong',
        message: 'We encountered an unexpected error. Please try again.',
        action: 'Retry',
        color: 'error',
    },
};

export function ErrorState({ type, platform, onRetry, customMessage }: ErrorStateProps) {
    const config = ERROR_CONFIGS[type];

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
            <Iconify
                icon={config.icon}
                width={64}
                sx={{ color: `${config.color}.main`, mb: 2 }}
            />
            <Typography variant="h5" gutterBottom>
                {config.title(platform)}
            </Typography>
            <Typography color="text.secondary" paragraph sx={{ maxWidth: 480 }}>
                {customMessage || config.message}
            </Typography>
            {config.action && onRetry && (
                <Button
                    variant="contained"
                    onClick={onRetry}
                    startIcon={<Iconify icon="solar:refresh-bold" />}
                >
                    {config.action}
                </Button>
            )}
        </Card>
    );
}
