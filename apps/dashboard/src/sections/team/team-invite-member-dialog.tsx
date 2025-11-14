'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';

import {
  Dialog,
  Button,
  Select,
  MenuItem,
  TextField,
  InputLabel,
  Typography,
  DialogTitle,
  FormControl,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { trpc } from 'src/lib/trpc/client';

import { toast } from 'src/components/snackbar';
import LimitReachedModal from 'src/components/modals/LimitReachedModal';

interface TeamInviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TeamInviteMemberDialog({
  open,
  onClose,
  onSuccess,
}: TeamInviteMemberDialogProps) {
  const params = useParams();
  const teamSlug = params.slug as string;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'OWNER'>('MEMBER');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number } | null>(null);

  // tRPC mutation for creating invitation
  const utils = trpc.useUtils();
  const createInvitation = trpc.teams.createInvitation.useMutation({
    onSuccess: () => {
      utils.teams.getInvitations.invalidate({ slug: teamSlug });
      toast.success('Invitation sent successfully!');
      setEmail('');
      setRole('MEMBER');
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Failed to send invitation:', error);
      
      // Check if it's a quota limit error
      if (error?.message?.includes('seat limit') || error?.message?.includes('quota')) {
        setLimitInfo({ used: 0, limit: 0 });
        setShowLimitModal(true);
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
      }
    },
  });

  const handleInvite = async () => {
    await createInvitation.mutateAsync({
      slug: teamSlug,
      email,
      role,
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          {/* Email Input */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            margin="normal"
            required
            disabled={createInvitation.isPending}
          />

          {/* Role Select */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as 'MEMBER' | 'OWNER')}
              disabled={createInvitation.isPending}
            >
              <MenuItem value="MEMBER">Member</MenuItem>
              <MenuItem value="OWNER">Owner</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" mt={2}>
            An invitation will be sent to this email address.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={createInvitation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={!email || createInvitation.isPending}
          >
            {createInvitation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Limit Reached Modal - shown when quota error occurs */}
      {limitInfo && (
        <LimitReachedModal
          open={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          quotaType="seats"
          currentUsage={limitInfo.used}
          limit={limitInfo.limit}
          requiredPlan="Professional"
          teamSlug={teamSlug}
        />
      )}
    </>
  );
}
