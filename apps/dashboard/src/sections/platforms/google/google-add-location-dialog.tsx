'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';

import {
  Dialog,
  Button,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { createGoogleProfile } from 'src/actions/platforms';

import { toast } from 'src/components/snackbar';
import LimitReachedModal from 'src/components/modals/LimitReachedModal';

interface GoogleAddLocationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GoogleAddLocationDialog({
  open,
  onClose,
  onSuccess,
}: GoogleAddLocationDialogProps) {
  const params = useParams();
  const teamSlug = params.slug as string;

  const [placeId, setPlaceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number } | null>(null);

  const handleAddLocation = async () => {
    setSubmitting(true);
    try {
      await createGoogleProfile(teamSlug, { placeId });
      
      toast.success('Location added successfully!');
      setPlaceId('');
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to add location:', error);
      
      // Check if error is quota-related
      const errorMessage = error instanceof Error ? error.message : 'Failed to add location';
      if (errorMessage.includes('limit') || errorMessage.includes('quota')) {
        setLimitInfo({ used: 0, limit: 0 }); // Will be populated from error details
        setShowLimitModal(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Google Business Location</DialogTitle>
        <DialogContent>
          {/* Place ID Input */}
          <TextField
            fullWidth
            label="Google Place ID"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
            margin="normal"
            required
            disabled={submitting}
            helperText="Enter the Google Place ID for your business location"
          />

          <Typography variant="body2" color="text.secondary" mt={2}>
            💡 <strong>Tip:</strong> Find your Place ID using{' '}
            <a
              href="https://developers.google.com/maps/documentation/places/web-service/place-id"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google's Place ID Finder
            </a>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLocation}
            variant="contained"
            disabled={!placeId || submitting}
          >
            {submitting ? 'Adding...' : 'Add Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Limit Reached Modal - shown when quota error occurs */}
      {limitInfo && (
        <LimitReachedModal
          open={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          quotaType="locations"
          currentUsage={limitInfo.used}
          limit={limitInfo.limit}
          requiredPlan="Professional"
          teamSlug={teamSlug}
        />
      )}
    </>
  );
}
