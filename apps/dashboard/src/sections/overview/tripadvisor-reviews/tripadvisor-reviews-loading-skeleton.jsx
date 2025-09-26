import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export function TripAdvisorReviewsLoadingSkeleton() {
  const theme = useTheme();

  return (
    <Stack spacing={3}>
      {/* Breadcrumbs Skeleton */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Skeleton variant="text" width={80} height={24} />
        <Skeleton variant="text" width={20} height={24} />
        <Skeleton variant="text" width={60} height={24} />
        <Skeleton variant="text" width={20} height={24} />
        <Skeleton variant="text" width={100} height={24} />
        <Skeleton variant="text" width={20} height={24} />
        <Skeleton variant="text" width={120} height={24} />
      </Box>

      {/* Welcome Section Skeleton */}
      <Box
        sx={[
          (themeParam) => ({
            background: `linear-gradient(to right, ${themeParam.vars.palette.background.default} 25%, ${varAlpha(themeParam.vars.palette.primary.darkChannel, 0.88)}), url(${CONFIG.assetsDir}/assets/background/background-6.webp)`,
            backgroundSize: 'cover, cover',
            backgroundPosition: 'center, center',
            pt: 5,
            pb: 5,
            pr: 3,
            gap: 5,
            borderRadius: 2,
            display: 'flex',
            height: { md: 1 },
            position: 'relative',
            pl: { xs: 3, md: 5 },
            alignItems: 'center',
            color: 'common.white',
            textAlign: { xs: 'center', md: 'left' },
            flexDirection: { xs: 'column', md: 'row' },
            border: `solid 1px ${themeParam.vars.palette.background.default}`,
          }),
        ]}
      >
        <Box
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            alignItems: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="rectangular" width={72} height={72} sx={{ borderRadius: 1 }} />

              <Box>
                <Skeleton variant="text" width={200} height={32} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width={120} height={20} />
              </Box>
            </Box>
          </Stack>

          <Skeleton variant="text" width={300} height={28} sx={{ mb: 2 }} />
          <Skeleton variant="text" width={400} height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={350} height={20} sx={{ mb: 3 }} />
        </Box>

        {/* Stats Summary Skeleton */}
        <Box sx={{ maxWidth: 300, width: '100%' }}>
          <Stack spacing={2}>
            {[...Array(3)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  textAlign: 'center',
                  p: 2,
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  borderRadius: 2,
                }}
              >
                <Skeleton variant="text" width={60} height={40} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={100} height={20} />
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Stats Cards Skeleton */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
        }}
      >
        {[...Array(4)].map((_, index) => (
          <Card
            key={index}
            sx={{
              height: '100%',
              transition: 'all 0.2s',
            }}
          >
            <Box sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: 2 }} />

                <Box>
                  <Skeleton variant="text" width={80} height={32} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width={100} height={16} />
                </Box>
              </Stack>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Analytics Chart Skeleton */}
      <Card sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={300} height={20} sx={{ mt: 1 }} />
        </Box>

        <Box sx={{ height: 400, position: 'relative' }}>
          {/* Chart area skeleton */}
          <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />

          {/* Overlay chart elements */}
          <Box sx={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 20 }}>
            {/* Y-axis labels */}
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 40 }}>
              {[...Array(5)].map((_, index) => (
                <Skeleton
                  key={index}
                  variant="text"
                  width={30}
                  height={16}
                  sx={{
                    position: 'absolute',
                    top: `${index * 20}%`,
                    transform: 'translateY(-50%)',
                  }}
                />
              ))}
            </Box>

            {/* X-axis labels */}
            <Box sx={{ position: 'absolute', bottom: 0, left: 40, right: 0, height: 30 }}>
              {[...Array(7)].map((_, index) => (
                <Skeleton
                  key={index}
                  variant="text"
                  width={60}
                  height={16}
                  sx={{
                    position: 'absolute',
                    left: `${index * 14}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
              ))}
            </Box>

            {/* Chart bars/lines */}
            <Box sx={{ position: 'absolute', top: 0, left: 40, right: 0, bottom: 30 }}>
              {[...Array(7)].map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  width={40}
                  height={`${Math.random() * 60 + 20}%`}
                  sx={{
                    position: 'absolute',
                    left: `${index * 14 + 7}%`,
                    bottom: 0,
                    transform: 'translateX(-50%)',
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* Legend skeleton */}
        <Box sx={{ mt: 3, display: 'flex', gap: 3, justifyContent: 'center' }}>
          {[...Array(3)].map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="rectangular" width={16} height={16} sx={{ borderRadius: 0.5 }} />
              <Skeleton variant="text" width={80} height={20} />
            </Box>
          ))}
        </Box>
      </Card>

      {/* Filters and Reviews List Skeleton */}
      <Card>
        {/* Filters Header */}
        <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.palette.divider}` }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="rectangular" width={20} height={20} />
              <Skeleton variant="text" width={80} height={24} />
            </Box>
            <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
          </Box>

          {/* Filter Controls */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(8, 1fr)',
              },
              gap: 2.5,
            }}
          >
            {[...Array(8)].map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                width="100%"
                height={56}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Box>

          {/* Results Summary */}
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Skeleton variant="text" width={200} height={20} />
          </Box>
        </Box>

        {/* Reviews List */}
        <Box sx={{ p: 3 }}>
          <Stack spacing={2}>
            {[...Array(5)].map((_, index) => (
              <Card key={index}>
                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Skeleton variant="circular" width={48} height={48} />

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Skeleton variant="text" width={120} height={24} />
                          <Skeleton
                            variant="rectangular"
                            width={80}
                            height={20}
                            sx={{ borderRadius: 1 }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Skeleton variant="rectangular" width={100} height={20} />
                          <Skeleton variant="text" width={80} height={20} />
                          <Skeleton variant="text" width={100} height={20} />
                          <Skeleton variant="text" width={80} height={20} />
                        </Box>
                      </Box>

                      {/* Action Buttons */}
                      <Stack direction="row" spacing={1}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="circular" width={32} height={32} />
                      </Stack>
                    </Box>

                    {/* Review Text */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: alpha(theme.palette.grey[500], 0.04),
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                      }}
                    >
                      <Skeleton variant="text" width="100%" height={20} />
                      <Skeleton variant="text" width="90%" height={20} />
                      <Skeleton variant="text" width="75%" height={20} />
                    </Box>

                    {/* Review Images */}
                    <Box>
                      <Skeleton variant="text" width={100} height={16} sx={{ mb: 1 }} />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {[...Array(3)].map((unused, imgIdx) => (
                          <Skeleton
                            key={imgIdx}
                            variant="rectangular"
                            width={80}
                            height={80}
                            sx={{ borderRadius: 1 }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Keywords */}
                    <Box>
                      <Skeleton variant="text" width={80} height={16} sx={{ mb: 1 }} />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[...Array(4)].map((unused, keywordIdx) => (
                          <Skeleton
                            key={keywordIdx}
                            variant="rectangular"
                            width={60}
                            height={24}
                            sx={{ borderRadius: 1 }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Owner Response */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Skeleton variant="rectangular" width={20} height={20} />
                        <Skeleton variant="text" width={120} height={16} />
                        <Skeleton variant="text" width={100} height={16} />
                      </Box>
                      <Skeleton variant="text" width="100%" height={20} />
                      <Skeleton variant="text" width="85%" height={20} />
                    </Box>

                    {/* Footer */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pt: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Skeleton variant="rectangular" width={16} height={16} />
                          <Skeleton variant="text" width={20} height={16} />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {[...Array(2)].map((unused, badgeIdx) => (
                            <Skeleton
                              key={badgeIdx}
                              variant="rectangular"
                              width={60}
                              height={20}
                              sx={{ borderRadius: 1 }}
                            />
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Skeleton
                          variant="rectangular"
                          width={120}
                          height={32}
                          sx={{ borderRadius: 1 }}
                        />
                        <Skeleton
                          variant="rectangular"
                          width={140}
                          height={32}
                          sx={{ borderRadius: 1 }}
                        />
                        <Skeleton
                          variant="rectangular"
                          width={80}
                          height={32}
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                </Box>
              </Card>
            ))}
          </Stack>

          {/* Pagination Skeleton */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Skeleton variant="rectangular" width={300} height={32} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
      </Card>
    </Stack>
  );
}
