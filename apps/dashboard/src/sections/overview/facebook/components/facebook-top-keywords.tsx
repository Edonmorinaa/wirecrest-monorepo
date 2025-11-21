'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookTopKeywords({ keywords }) {
  const theme = useTheme();

  if (!keywords || keywords.length === 0) {
    return (
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:tag-price-bold" />
              <Typography variant="h6">Top Keywords</Typography>
            </Stack>
          }
          subheader="Showing top keywords from reviews"
          sx={{ mb: 3 }}
        />
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary',
              py: 4,
              p: 3,
            }}
          >
            <Iconify icon="solar:tag-price-bold" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">No keywords data available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:tag-price-bold" />
            <Typography variant="h6">Top Keywords</Typography>
          </Stack>
        }
        subheader="Showing top keywords from reviews"
        sx={{ mb: 3 }}
      />
      <CardContent>
        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ p: 1 }}>
          {keywords.map((keyword, index) => {
            // Handle different keyword formats
            let keywordText = '';
            let keywordValue = 1;
            
            if (typeof keyword === 'string') {
              keywordText = keyword;
            } else if (typeof keyword === 'object' && keyword !== null) {
              // Try different possible property names
              keywordText = keyword.key || keyword.keyword || keyword.text || keyword.word || '';
              keywordValue = keyword.value || keyword.count || keyword.frequency || 1;
            }
            
            // Skip if we couldn't extract text
            if (!keywordText || keywordText === '[object Object]') {
              console.warn('Invalid keyword format:', keyword);
              return null;
            }
            
            return (
              <Chip
                key={`${keywordText}-${index}`}
                label={`${keywordText} (${keywordValue})`}
                size="small"
                sx={{
                  bgcolor: index < 3 ? theme.palette.primary.light : theme.palette.grey[100],
                  color: index < 3 ? theme.palette.primary.dark : theme.palette.text.secondary,
                  fontWeight: index < 3 ? 600 : 500,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    bgcolor: index < 3 ? theme.palette.primary.main : theme.palette.grey[200],
                  },
                }}
              />
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
