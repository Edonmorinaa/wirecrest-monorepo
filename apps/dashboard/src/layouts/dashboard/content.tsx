'use client';

import { mergeClasses } from 'minimal-shared/utils';

import Container from '@mui/material/Container';
import { Theme, styled, SxProps } from '@mui/material/styles';

import { useSettingsContext } from 'src/components/settings';

import { layoutClasses } from '../core';

// ----------------------------------------------------------------------

export type TProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  className?: string;
  disablePadding?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  layoutQuery?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
};

export function DashboardContent(props: TProps) {
  const { sx, children, className, disablePadding, maxWidth = 'lg', layoutQuery = 'lg', ...other } = props;
  const settings = useSettingsContext();

  const isNavHorizontal = settings.state.navLayout === 'horizontal';

  return (
    <Container
      className={mergeClasses([layoutClasses.content, className])}
      maxWidth={settings.state.compactLayout ? maxWidth : false}
      sx={[
        (theme) => ({
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          pt: 'var(--layout-dashboard-content-pt)',
          pb: 'var(--layout-dashboard-content-pb)',
          [theme.breakpoints.up(layoutQuery)]: {
            px: 'var(--layout-dashboard-content-px)',
            ...(isNavHorizontal && { '--layout-dashboard-content-pt': '40px' }),
          },
          ...(disablePadding && {
            p: {
              xs: 0,
              sm: 0,
              md: 0,
              lg: 0,
              xl: 0,
            },
          }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {children}
    </Container>
  );
}

// ----------------------------------------------------------------------

export const VerticalDivider = styled('span')(({ theme }) => ({
  width: 1,
  height: 10,
  flexShrink: 0,
  display: 'none',
  position: 'relative',
  alignItems: 'center',
  flexDirection: 'column',
  marginLeft: theme.spacing(2.5),
  marginRight: theme.spacing(2.5),
  backgroundColor: 'currentColor',
  color: theme.vars.palette.divider,
  '&::before, &::after': {
    top: -5,
    width: 3,
    height: 3,
    content: '""',
    flexShrink: 0,
    borderRadius: '50%',
    position: 'absolute',
    backgroundColor: 'currentColor',
  },
  '&::after': { bottom: -5, top: 'auto' },
}));
