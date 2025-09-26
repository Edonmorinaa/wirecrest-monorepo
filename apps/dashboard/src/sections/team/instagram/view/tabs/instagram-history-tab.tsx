'use client';

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

interface HistoryDataPoint {
  date: string;
  followersCount: number;
  followersDelta: number;
  followingCount: number;
  mediaCount: number;
  mediaDelta: number;
  engagementRate: number;
  engagementRateDelta: number;
}

interface InstagramHistoryTabProps {
  data: HistoryDataPoint[] | null;
  startDate: Date;
  endDate: Date;
}

export function InstagramHistoryTab({ data, startDate, endDate }: InstagramHistoryTabProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  console.log('History tab - Data received:', {
    hasData: !!data,
    dataLength: data?.length || 0,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    data
  });

  // Debug delta calculations
  if (data && data.length > 0) {
    console.log('History tab - Delta calculations debug:', {
      firstItem: data[0],
      secondItem: data[1],
      sampleDeltas: data.slice(0, 3).map(item => ({
        date: item.date,
        followersDelta: item.followersDelta,
        mediaDelta: item.mediaDelta,
        engagementRateDelta: item.engagementRateDelta
      }))
    });
  }

  // Handle missing or invalid data
  if (!data || data.length === 0) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No historical data available for the selected date range.
        </Typography>
      </Alert>
    );
  }

  const formatNumber = (num: number | null | undefined): string => {
    if (num == null || isNaN(num)) return '0';
    // Show full numbers with comma separators
    return num.toLocaleString();
  };

  const formatDelta = (delta: number | null | undefined): string => {
    if (delta == null || isNaN(delta)) return '0';
    if (delta > 0) return `+${formatNumber(delta)}`;
    if (delta < 0) return formatNumber(delta);
    return '0';
  };

  const formatPercentageDelta = (delta: number | null | undefined): string => {
    if (delta == null || isNaN(delta)) return '0%';
    if (delta > 0) return `+${delta.toFixed(1)}%`;
    if (delta < 0) return `${delta.toFixed(1)}%`;
    return '0%';
  };

  const getDeltaColor = (delta: number | null | undefined): 'success' | 'error' | 'default' => {
    if (delta == null || isNaN(delta)) return 'default';
    if (delta > 0) return 'success';
    if (delta < 0) return 'error';
    return 'default';
  };

  const formatPercentage = (num: number | null | undefined): string => {
    if (num == null || isNaN(num)) return '0%';
    return `${num.toFixed(1)}%`;
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Safe data access with fallbacks and sort by date (newest first)
  const safeHistoryData: HistoryDataPoint[] = data
    .map(item => ({
      date: item?.date || '',
      followersCount: item?.followersCount || 0,
      followersDelta: item?.followersDelta || 0,
      followingCount: item?.followingCount || 0,
      followingDelta: item?.followingDelta || 0,
      mediaCount: item?.mediaCount || 0,
      mediaDelta: item?.mediaDelta || 0,
      engagementRate: item?.engagementRate || 0,
      engagementRateDelta: item?.engagementRateDelta || 0
    }))
    .sort((a, b) => 
      // Sort by date in descending order (newest first)
       new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  // Pagination
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = safeHistoryData.slice(startIndex, endIndex);

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Historical Data
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Followers</TableCell>
                  <TableCell align="right">Following</TableCell>
                  <TableCell align="right">Media</TableCell>
                  <TableCell align="right">Engagement Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(row.date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography variant="body2">
                          {formatNumber(row.followersCount)}
                        </Typography>
                        <Chip
                          size="small"
                          label={formatDelta(row.followersDelta)}
                          color={getDeltaColor(row.followersDelta)}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography variant="body2">
                          {formatNumber(row.followingCount)}
                        </Typography>
                        <Chip
                          size="small"
                          label={formatDelta(row.followingDelta)}
                          color={getDeltaColor(row.followingDelta)}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography variant="body2">
                          {formatNumber(row.mediaCount)}
                        </Typography>
                        <Chip
                          size="small"
                          label={formatDelta(row.mediaDelta)}
                          color={getDeltaColor(row.mediaDelta)}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography variant="body2">
                          {formatPercentage(row.engagementRate)}
                        </Typography>
                        <Chip
                          size="small"
                          label={formatPercentageDelta(row.engagementRateDelta)}
                          color={getDeltaColor(row.engagementRateDelta)}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={safeHistoryData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
