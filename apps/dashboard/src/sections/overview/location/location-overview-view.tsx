'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import useTikTokBusinessProfile from 'src/hooks/useTikTokBusinessProfile';
import useInstagramBusinessProfile from 'src/hooks/useInstagramBusinessProfile';
import {
  useBookingProfile,
  useBookingReviews,
  useFacebookProfile,
  useFacebookReviews,
  useGoogleProfile,
  useGoogleReviews,
  useLocationBySlug,
  useTripAdvisorProfile,
  useTripAdvisorReviews,
} from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { PlatformCard } from './platform-card';
import { UnifiedStats } from './unified-stats';
import { RecentReviews } from './recent-reviews';
import { LocationWelcome } from './location-welcome';

// ----------------------------------------------------------------------

export function LocationOverviewView() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.slug as string;
  const locationSlug = params.locationSlug as string;

  // Get location data
  const { location, isLoading: locationLoading } = useLocationBySlug(teamSlug, locationSlug);
  const locationId = location?.id || '';
  const isValidLocationId = locationId && locationId.length > 20;

  // Fetch platform profiles and reviews (limited to recent)
  const { profile: googleProfile, isLoading: googleProfileLoading } = useGoogleProfile(
    locationId,
    isValidLocationId
  );
  const { allTimeStats: googleStats, isLoading: googleReviewsLoading } = useGoogleReviews(
    locationId,
    {},
    { page: 1, limit: 5 },
    isValidLocationId
  );

  const { profile: facebookProfile, isLoading: facebookProfileLoading } = useFacebookProfile(
    locationId,
    isValidLocationId
  );
  const { allTimeStats: facebookStats, isLoading: facebookReviewsLoading } = useFacebookReviews(
    locationId,
    {},
    { page: 1, limit: 5 },
    isValidLocationId
  );

  const { profile: tripadvisorProfile, isLoading: tripadvisorProfileLoading } =
    useTripAdvisorProfile(locationId, isValidLocationId);
  const { allTimeStats: tripadvisorStats, isLoading: tripadvisorReviewsLoading } =
    useTripAdvisorReviews(locationId, {}, { page: 1, limit: 5 }, isValidLocationId);

  const { profile: bookingProfile, isLoading: bookingProfileLoading } = useBookingProfile(
    locationId,
    isValidLocationId
  );
  const { allTimeStats: bookingStats, isLoading: bookingReviewsLoading } = useBookingReviews(
    locationId,
    {},
    { page: 1, limit: 5 },
    isValidLocationId
  );

  // Fetch social media profiles
  const { businessProfile: instagramProfile, isLoading: instagramLoading } =
    useInstagramBusinessProfile(teamSlug);
  const { businessProfile: tiktokProfile, isLoading: tiktokLoading } =
    useTikTokBusinessProfile(teamSlug);

  // Calculate unified statistics
  const unifiedStats = useMemo(() => {
    const totalReviews =
      (googleStats?.totalReviews || 0) +
      (facebookStats?.totalReviews || 0) +
      (tripadvisorStats?.totalReviews || 0) +
      (bookingStats?.totalReviews || 0);

    const unreadReviews =
      (googleStats?.unread || 0) +
      (facebookStats?.unread || 0) +
      (tripadvisorStats?.unread || 0) +
      (bookingStats?.unread || 0);

    const repliedReviews =
      (googleStats?.withResponse || 0) +
      (facebookStats?.withResponse || 0) +
      (tripadvisorStats?.withResponse || 0) +
      (bookingStats?.withResponse || 0);

    // Calculate weighted average rating
    const facebookAvgRating =
      (facebookStats?.recommendationRate || 0) * 5 + (1 - (facebookStats?.recommendationRate || 0)) * 1;
    const totalRatings =
      (googleStats?.totalReviews || 0) * (googleStats?.averageRating || 0) +
      (facebookStats?.totalReviews || 0) * facebookAvgRating +
      (tripadvisorStats?.totalReviews || 0) * (tripadvisorStats?.averageRating || 0) +
      (bookingStats?.totalReviews || 0) * (bookingStats?.averageRating || 0);
    const averageRating = totalReviews > 0 ? totalRatings / totalReviews : 0;

    const responseRate = totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0;

    return {
      totalReviews,
      unreadReviews,
      repliedReviews,
      averageRating,
      responseRate,
    };
  }, [googleStats, facebookStats, tripadvisorStats, bookingStats]);

  // Check if any platform is connected
  const hasConnectedPlatforms = !!(
    googleProfile ||
    facebookProfile ||
    tripadvisorProfile ||
    bookingProfile ||
    instagramProfile ||
    tiktokProfile
  );

  const isLoading =
    locationLoading ||
    googleProfileLoading ||
    facebookProfileLoading ||
    tripadvisorProfileLoading ||
    bookingProfileLoading ||
    instagramLoading ||
    tiktokLoading;

  if (locationLoading) {
    return (
      <DashboardContent>
        <Typography>Loading location data...</Typography>
      </DashboardContent>
    );
  }

  if (!location) {
    return (
      <DashboardContent>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            Location not found
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            The location you are looking for does not exist or you don&apos;t have access to it.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push(paths.dashboard.teams.bySlug(teamSlug))}
            sx={{ mt: 2 }}
          >
            Back to Locations
          </Button>
        </Card>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Overview"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: teamSlug, href: paths.dashboard.teams.bySlug(teamSlug) },
          { name: location.name || locationSlug, href: '#' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        {/* Welcome Section */}
        <Grid size={{ xs: 12 }}>
          <LocationWelcome
            locationName={location.name || locationSlug}
            address={location.address || 'No address available'}
            stats={unifiedStats}
            isLoading={isLoading}
          />
        </Grid>

        {/* Unified Stats */}
        <Grid size={{ xs: 12 }}>
          <UnifiedStats stats={unifiedStats} isLoading={isLoading} />
        </Grid>

        {/* Platform Cards */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Connected Platforms
          </Typography>
          <Grid container spacing={3}>
            {/* Review Platforms */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <PlatformCard
                platform="google"
                icon="logos:google-icon"
                title="Google Business"
                stats={{
                  totalReviews: googleStats?.totalReviews || 0,
                  averageRating: googleStats?.averageRating || 0,
                  unread: googleStats?.unread || 0,
                }}
                connected={!!googleProfile}
                isLoading={googleProfileLoading || googleReviewsLoading}
                onNavigate={() =>
                  router.push(`/${locationSlug}/google/overview`)
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <PlatformCard
                platform="facebook"
                icon="logos:facebook"
                title="Facebook"
                stats={{
                  totalReviews: facebookStats?.totalReviews || 0,
                  recommendationRate: facebookStats?.recommendationRate
                    ? facebookStats.recommendationRate * 100
                    : 0,
                  unread: facebookStats?.unread || 0,
                }}
                connected={!!facebookProfile}
                isLoading={facebookProfileLoading || facebookReviewsLoading}
                onNavigate={() =>
                  router.push(`/${locationSlug}/facebook/overview`)
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <PlatformCard
                platform="tripadvisor"
                icon="simple-icons:tripadvisor"
                title="TripAdvisor"
                stats={{
                  totalReviews: tripadvisorStats?.totalReviews || 0,
                  averageRating: tripadvisorStats?.averageRating || 0,
                  unread: tripadvisorStats?.unread || 0,
                }}
                connected={!!tripadvisorProfile}
                isLoading={tripadvisorProfileLoading || tripadvisorReviewsLoading}
                onNavigate={() =>
                  router.push(`/${locationSlug}/tripadvisor/overview`)
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <PlatformCard
                platform="booking"
                icon="simple-icons:bookingdotcom"
                title="Booking.com"
                stats={{
                  totalReviews: bookingStats?.totalReviews || 0,
                  averageRating: bookingStats?.averageRating || 0,
                  unread: bookingStats?.unread || 0,
                }}
                connected={!!bookingProfile}
                isLoading={bookingProfileLoading || bookingReviewsLoading}
                onNavigate={() =>
                  router.push(`/${locationSlug}/booking/overview`)
                }
              />
            </Grid>

            {/* Social Media Platforms */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <PlatformCard
                platform="instagram"
                icon="skill-icons:instagram"
                title="Instagram"
                stats={{
                  followers: instagramProfile?.currentFollowersCount || 0,
                  posts: instagramProfile?.currentMediaCount || 0,
                  engagement: 0,
                }}
                connected={!!instagramProfile}
                isLoading={instagramLoading}
                onNavigate={() => router.push(`/instagram`)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <PlatformCard
                platform="tiktok"
                icon="logos:tiktok-icon"
                title="TikTok"
                stats={{
                  followers: tiktokProfile?.followerCount || 0,
                  videos: tiktokProfile?.videoCount || 0,
                  hearts: tiktokProfile?.heartCount || 0,
                }}
                connected={!!tiktokProfile}
                isLoading={tiktokLoading}
                onNavigate={() => router.push(`/tiktok`)}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        {hasConnectedPlatforms && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="solar:inbox-bold" />}
                    onClick={() => router.push(`/${locationSlug}/inbox`)}
                  >
                    View All Reviews
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Iconify icon="solar:chart-2-bold" />}
                    onClick={() => router.push(`/${locationSlug}/google/overview`)}
                  >
                    Analytics
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Iconify icon="solar:settings-bold" />}
                    onClick={() => router.push(`/${locationSlug}/google`)}
                  >
                    Platform Settings
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Reviews from all platforms */}
        {hasConnectedPlatforms && (
          <Grid size={{ xs: 12 }}>
            <RecentReviews locationId={locationId} isEnabled={isValidLocationId} />
          </Grid>
        )}

        {/* Empty State */}
        {!hasConnectedPlatforms && !isLoading && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 5, textAlign: 'center' }}>
              <Iconify icon="solar:link-broken" width={64} sx={{ mb: 2, color: 'text.secondary' }} />
              <Typography variant="h5" gutterBottom>
                No Platforms Connected
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Connect your business platforms to start managing reviews and social media in one
                place.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:link-bold" />}
                onClick={() => router.push(`/${locationSlug}/google`)}
              >
                Connect Platforms
              </Button>
            </Card>
          </Grid>
        )}
      </Grid>
    </DashboardContent>
  );
}

