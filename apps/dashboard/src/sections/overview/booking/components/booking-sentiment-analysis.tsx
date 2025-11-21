import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  metrics: any;
  sx?: SxProps<Theme>;
};

export function BookingSentimentAnalysis({ metrics, sx }: Props) {
  return (
    <Card sx={sx}>
      <CardHeader title="Sentiment Analysis" />
      <Box sx={{ p: 3 }}>
        {metrics?.sentimentAnalysis ? (
          <Box>
            <Typography variant="body2">
              Positive: {metrics.sentimentAnalysis.positive || 0}
            </Typography>
            <Typography variant="body2">
              Neutral: {metrics.sentimentAnalysis.neutral || 0}
            </Typography>
            <Typography variant="body2">
              Negative: {metrics.sentimentAnalysis.negative || 0}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No sentiment data available
          </Typography>
        )}
      </Box>
    </Card>
  );
}

