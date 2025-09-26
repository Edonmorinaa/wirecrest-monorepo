import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookKeywordsAnalysis({ keywords, sx, ...other }) {
  const theme = useTheme();

  if (!keywords || keywords.length === 0) {
    return (
      <Card sx={{ p: 3, ...sx }} {...other}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: 'info.main',
              }}
            >
              <Iconify icon="eva:message-circle-fill" width={20} />
            </Box>
            <Typography variant="h6">Top Keywords</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            No keyword data available
          </Typography>
        </Stack>
      </Card>
    );
  }

  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.1) return 'success';
    if (sentiment < -0.1) return 'error';
    return 'default';
  };

  const getSentimentVariant = (sentiment) => {
    if (sentiment > 0.1) return 'filled';
    if (sentiment < -0.1) return 'filled';
    return 'outlined';
  };

  return (
    <Card sx={{ p: 3, ...sx }} {...other}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.info.main, 0.1),
              color: 'info.main',
            }}
          >
            <Iconify icon="eva:message-circle-fill" width={20} />
          </Box>
          <Typography variant="h6">Top Keywords</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {keywords.slice(0, 15).map((keyword, index) => (
            <Chip
              key={keyword.id || index}
              label={`${keyword.keyword} (${keyword.count})`}
              variant={getSentimentVariant(keyword.sentiment)}
              color={getSentimentColor(keyword.sentiment)}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: 28,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          ))}
        </Box>

        <Box sx={{ 
          p: 2, 
          bgcolor: alpha(theme.palette.background.neutral, 0.5), 
          borderRadius: 1,
          textAlign: 'center'
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Most frequently mentioned keywords with sentiment analysis
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

FacebookKeywordsAnalysis.propTypes = {
  keywords: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      keyword: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
      sentiment: PropTypes.number,
    })
  ),
  sx: PropTypes.object,
};
