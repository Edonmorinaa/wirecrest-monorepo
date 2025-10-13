'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InstagramContentAnalysis() {
  const { businessProfile, isLoading } = useInstagramBusinessProfile();

  const contentAnalysis = useMemo(() => {
    if (!businessProfile?.dailySnapshots || businessProfile.dailySnapshots.length === 0) {
      return null;
    }

    const snapshots = businessProfile.dailySnapshots;
    
    // Calculate content frequency
    const totalNewPosts = snapshots.reduce((sum, s) => sum + (s.newPosts || 0), 0);
    const avgContentPerDay = snapshots.length > 0 ? totalNewPosts / snapshots.length : 0;
    
    // Calculate posting consistency
    const postingDays = snapshots.filter(s => (s.newPosts || 0) > 0).length;
    const consistencyRate = (postingDays / snapshots.length) * 100;
    
    // Find best performing content period
    const bestContentPeriod = snapshots.reduce((best, snapshot) => {
      const engagement = (snapshot.totalLikes || 0) + (snapshot.totalComments || 0);
      return engagement > best.engagement ? { date: snapshot.snapshotDate, engagement } : best;
    }, { date: null, engagement: 0 });

    // Calculate content quality score
    const totalEngagement = snapshots.reduce((sum, s) => 
      sum + (s.totalLikes || 0) + (s.totalComments || 0), 0);
    const avgEngagementPerPost = totalNewPosts > 0 ? totalEngagement / totalNewPosts : 0;
    
    // Determine content strategy recommendation
    let strategyRecommendation = '';
    let strategyColor = 'default';
    
    if (avgContentPerDay >= 1.5) {
      strategyRecommendation = 'High Frequency';
      strategyColor = 'success';
    } else if (avgContentPerDay >= 0.5) {
      strategyRecommendation = 'Moderate Frequency';
      strategyColor = 'warning';
    } else {
      strategyRecommendation = 'Low Frequency';
      strategyColor = 'error';
    }

    return {
      totalNewPosts,
      avgContentPerDay,
      consistencyRate,
      bestContentPeriod,
      avgEngagementPerPost,
      strategyRecommendation,
      strategyColor,
      totalSnapshots: snapshots.length,
    };
  }, [businessProfile]);

  if (isLoading || !contentAnalysis) {
    return null;
  }

  const analysisItems = [
    {
      title: 'Content Frequency',
      value: contentAnalysis.avgContentPerDay.toFixed(1),
      unit: 'posts/day',
      icon: 'solar:camera-bold',
      color: 'primary.main',
      description: 'Average daily posting rate',
    },
    {
      title: 'Posting Consistency',
      value: contentAnalysis.consistencyRate.toFixed(1),
      unit: '%',
      icon: 'solar:calendar-bold',
      color: 'secondary.main',
      description: 'Days with content posted',
    },
    {
      title: 'Engagement per Post',
      value: Math.round(contentAnalysis.avgEngagementPerPost),
      unit: 'interactions',
      icon: 'solar:heart-bold',
      color: 'error.main',
      description: 'Average engagement per content',
    },
    {
      title: 'Total New Content',
      value: contentAnalysis.totalNewPosts,
      unit: 'posts',
      icon: 'solar:plus-circle-bold',
      color: 'info.main',
      description: 'New posts in period',
    },
  ];

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:chart-2-bold" />
            <Typography variant="h6">Content Analysis</Typography>
          </Stack>
        }
        subheader="Insights into your content strategy and performance"
      />
      
      <CardContent>
        <Stack spacing={3}>
          {/* Strategy Recommendation */}
          <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Content Strategy
              </Typography>
              <Chip 
                label={contentAnalysis.strategyRecommendation} 
                color={contentAnalysis.strategyColor}
                size="small"
              />
            </Stack>
            
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              Based on your posting frequency and engagement patterns
            </Typography>
          </Box>

          {/* Analysis Grid */}
          <Grid container spacing={2}>
            {analysisItems.map((item, index) => (
              <Grid key={index} size={{ xs: 6 }}>
                <Stack spacing={1} alignItems="center" textAlign="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${item.color}15`,
                    }}
                  >
                    <Iconify icon={item.icon} sx={{ color: item.color, fontSize: 20 }} />
                  </Box>
                  
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {item.value}
                  </Typography>
                  
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {item.unit}
                  </Typography>
                  
                  <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                    {item.description}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>

          {/* Best Performing Content */}
          {contentAnalysis.bestContentPeriod.date && (
            <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:star-bold" sx={{ color: 'success.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Best Performing Day
                </Typography>
              </Stack>
              
              <Typography variant="body2" sx={{ mt: 1 }}>
                {format(new Date(contentAnalysis.bestContentPeriod.date), 'MMMM dd, yyyy')}
              </Typography>
              
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {contentAnalysis.bestContentPeriod.engagement} total interactions
              </Typography>
            </Box>
          )}

          {/* Insights */}
          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
              💡 Content Insights
            </Typography>
            
            <Stack spacing={1}>
              {contentAnalysis.avgContentPerDay > 1.5 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  • You're posting frequently - great for audience engagement!
                </Typography>
              )}
              
              {contentAnalysis.consistencyRate > 70 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  • High posting consistency - your audience knows when to expect content
                </Typography>
              )}
              
              {contentAnalysis.avgEngagementPerPost > 100 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  • Strong engagement per post - your content resonates well
                </Typography>
              )}
              
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                • Analysis based on {contentAnalysis.totalSnapshots} daily snapshots
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
