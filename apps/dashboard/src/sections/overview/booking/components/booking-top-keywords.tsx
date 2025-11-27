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

type Props = {
  keywords: { keyword: string; count: number }[] | any[];
};

export function BookingTopKeywords({ keywords }: Props) {
  const theme = useTheme();

  if (!keywords || keywords.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:tag-price-bold" />
              <Typography variant="h6">Top Keywords</Typography>
            </Stack>
          }
          subheader="Showing top keywords from reviews"
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
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:tag-price-bold" />
            <Typography variant="h6">Top Keywords</Typography>
          </Stack>
        }
        subheader="Showing top keywords from reviews"
      />
      <CardContent>
        <Stack direction="row" flexWrap="wrap" gap={1.5}>
          {keywords.map((keyword, index) => {
            const keywordText = keyword.keyword || keyword.key || keyword;
            const keywordValue = keyword.count || keyword.value || 1;

            return (
              <Chip
                key={index}
                label={`${keywordText} (${keywordValue})`}
                size="small"
                sx={{
                  bgcolor: index < 3 ? theme.palette.primary.lighter : theme.palette.grey[100],
                  color: index < 3 ? theme.palette.primary.darker : theme.palette.text.secondary,
                  fontWeight: index < 3 ? 600 : 500,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    bgcolor: index < 3 ? theme.palette.primary.light : theme.palette.grey[200],
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

