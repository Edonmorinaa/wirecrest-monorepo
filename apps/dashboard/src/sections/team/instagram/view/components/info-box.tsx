'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface InfoBoxProps {
  description: string;
  sx?: any;
}

export function InfoBox({ description, sx }: InfoBoxProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <Tooltip
        title={
          <Paper
            sx={{
              p: 2,
              maxWidth: 300,
              backgroundColor: 'background.paper',
              boxShadow: theme.shadows[8],
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              {description}
            </Typography>
          </Paper>
        }
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        placement="top"
        arrow
        componentsProps={{
          tooltip: {
            sx: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              p: 0,
            },
          },
          arrow: {
            sx: {
              color: 'background.paper',
            },
          },
        }}
      >
        <IconButton
          size="small"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          sx={{
            p: 0.5,
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          <Iconify icon="solar:info-circle-bold" width={16} height={16} className="" sx={{}} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
