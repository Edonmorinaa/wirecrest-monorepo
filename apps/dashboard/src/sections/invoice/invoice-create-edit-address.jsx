import { useFormContext } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { Iconify } from 'src/components/iconify';

import { TeamsAddressListDialog } from './address/teams-address-list-dialog';

// ----------------------------------------------------------------------

export function InvoiceCreateEditAddress() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

  const values = watch();

  const addressTo = useBoolean();

  const { invoiceFrom, invoiceTo } = values;

  return (
    <>
      <Stack
        divider={
          <Divider
            flexItem
            orientation={mdUp ? 'vertical' : 'horizontal'}
            sx={{ borderStyle: 'dashed' }}
          />
        }
        sx={{ p: 3, gap: { xs: 3, md: 5 }, flexDirection: { xs: 'column', md: 'row' } }}
      >
        <Stack sx={{ width: 1 }}>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.disabled', flexGrow: 1 }}>
              From:
            </Typography>
          </Box>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Wirecrest Inc.</Typography>
            <Typography variant="body2">123 Business Ave, Suite 100</Typography>
            <Typography variant="body2">San Francisco, CA 12345, USA</Typography>
            <Typography variant="body2">+1-555-0123</Typography>
            <Typography variant="body2">billing@wirecrest.com</Typography>
          </Stack>
        </Stack>

        <Stack sx={{ width: 1 }}>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.disabled', flexGrow: 1 }}>
              To:
            </Typography>

            <IconButton onClick={addressTo.onTrue}>
              <Iconify icon={invoiceTo ? 'solar:pen-bold' : 'mingcute:add-line'} />
            </IconButton>
          </Box>

          {invoiceTo ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{invoiceTo?.name}</Typography>
              <Typography variant="body2" sx={{ color: 'primary.main' }}>
                @{invoiceTo?.slug}
              </Typography>
              <Typography variant="body2">
                {invoiceTo?.address}, {invoiceTo?.city}, {invoiceTo?.state} {invoiceTo?.zipCode}
              </Typography>
              <Typography variant="body2">{invoiceTo?.phoneNumber}</Typography>
              <Typography variant="body2">{invoiceTo?.email}</Typography>
            </Stack>
          ) : (
            <Typography typography="caption" sx={{ color: 'error.main' }}>
              {errors.invoiceTo?.message}
            </Typography>
          )}
        </Stack>
      </Stack>

      <TeamsAddressListDialog
        title="Select Customer (Team)"
        open={addressTo.value}
        onClose={addressTo.onFalse}
        selected={(selectedId) => invoiceTo?.id === selectedId}
        onSelect={(team) => setValue('invoiceTo', team)}
      />
    </>
  );
}
