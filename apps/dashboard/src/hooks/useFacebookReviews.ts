'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getFacebookReviews } from 'src/actions/facebook-reviews';

interface FacebookReviewFilters {
  page?: number;
  limit?: number;
  isRecommended?: boolean;
  hasLikes?: boolean;
  hasComments?: boolean;
  hasPhotos?: boolean;
  hasTags?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  isRead?: boolean;
  isImportant?: boolean;
  minLikes?: number;
  maxLikes?: number;
  minComments?: number;
  maxComments?: number;
}

export function useFacebookReviews(filters: FacebookReviewFilters = {}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { slug } = params;

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    recommendationRate: 0,
    recommendedCount: 0,
    notRecommendedCount: 0,
    totalLikes: 0,
    totalComments: 0,
    totalPhotos: 0,
    averageEngagement: 0,
    sentimentScore: 0,
    qualityScore: 0,
    unread: 0,
    withPhotos: 0,
    withTags: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Combine URL params with passed filters
  const combinedFilters = useMemo(() => ({
    page: parseInt(searchParams.get('page') || filters.page?.toString() || '1'),
    limit: parseInt(searchParams.get('limit') || filters.limit?.toString() || '25'),
    isRecommended: searchParams.get('isRecommended') === 'true' ? true : 
                   searchParams.get('isRecommended') === 'false' ? false : 
                   searchParams.get('isRecommended') === '' ? undefined :
                   filters.isRecommended,
    hasLikes: searchParams.get('hasLikes') === 'true' ? true : 
              searchParams.get('hasLikes') === 'false' ? false : 
              searchParams.get('hasLikes') === '' ? undefined :
              filters.hasLikes,
    hasComments: searchParams.get('hasComments') === 'true' ? true : 
                 searchParams.get('hasComments') === 'false' ? false : 
                 searchParams.get('hasComments') === '' ? undefined :
                 filters.hasComments,
    hasPhotos: searchParams.get('hasPhotos') === 'true' ? true : 
               searchParams.get('hasPhotos') === 'false' ? false : 
               searchParams.get('hasPhotos') === '' ? undefined :
               filters.hasPhotos,
    hasTags: searchParams.get('hasTags') === 'true' ? true : 
             searchParams.get('hasTags') === 'false' ? false : 
             searchParams.get('hasTags') === '' ? undefined :
             filters.hasTags,
    sentiment: searchParams.get('sentiment') as 'positive' | 'negative' | 'neutral' || filters.sentiment,
    search: searchParams.get('search') || filters.search,
    sortBy: searchParams.get('sortBy') || filters.sortBy || 'date',
    sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || filters.sortOrder || 'desc',
    startDate: searchParams.get('startDate') || filters.startDate,
    endDate: searchParams.get('endDate') || filters.endDate,
    isRead: searchParams.get('isRead') === 'true' ? true : 
            searchParams.get('isRead') === 'false' ? false : 
            searchParams.get('isRead') === '' ? undefined :
            filters.isRead,
    isImportant: searchParams.get('isImportant') === 'true' ? true : 
                 searchParams.get('isImportant') === 'false' ? false : 
                 searchParams.get('isImportant') === '' ? undefined :
                 filters.isImportant,
    minLikes: parseInt(searchParams.get('minLikes') || filters.minLikes?.toString() || '0') || undefined,
    maxLikes: parseInt(searchParams.get('maxLikes') || filters.maxLikes?.toString() || '0') || undefined,
    minComments: parseInt(searchParams.get('minComments') || filters.minComments?.toString() || '0') || undefined,
    maxComments: parseInt(searchParams.get('maxComments') || filters.maxComments?.toString() || '0') || undefined,
  }), [searchParams, filters]);

  const fetchReviews = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getFacebookReviews(slug as string, combinedFilters);
      
      setReviews(result.reviews);
      setStats(result.stats);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching Facebook reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, combinedFilters]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const refresh = useCallback(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    stats,
    pagination,
    loading,
    error,
    refresh,
    filters: combinedFilters,
  };
}
