'use client';

import * as Zod from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const TeamSchema = Zod.object({
  name: Zod.string().min(1, { message: 'Team name is required!' }),
});

// ----------------------------------------------------------------------

export function TeamCreateDialog({ open, onClose, onCreate }) {
  const methods = useForm({
    resolver: zodResolver(TeamSchema),
    defaultValues: {
      name: '',
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await onCreate(data);
      reset();
    } catch (error) {
      console.error('Error creating team:', error);
    }
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { maxWidth: 420 },
      }}
    >
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Create New Team</DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Field.Text
              name="name"
              label="Team Name"
              placeholder="Enter team name"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>

          <LoadingButton
            type="submit"
            variant="contained"
            loading={isSubmitting}
          >
            Create Team
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
