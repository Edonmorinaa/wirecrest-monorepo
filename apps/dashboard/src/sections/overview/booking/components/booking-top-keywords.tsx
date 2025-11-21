import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  keywords: any[];
};

export function BookingTopKeywords({ keywords }: Props) {
  return (
    <Card>
      <CardHeader title="Top Keywords" subheader="Most mentioned keywords in reviews" />
      <Box sx={{ p: 3 }}>
        {keywords && keywords.length > 0 ? (
          <Typography variant="body2">{keywords.length} keywords found</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No keyword data available
          </Typography>
        )}
      </Box>
    </Card>
  );
}

