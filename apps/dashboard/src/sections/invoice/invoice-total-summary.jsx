import Box from '@mui/material/Box';

import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

export function InvoiceTotalSummary({
  sx,
  subtotal,
  taxAmount = 0,
  taxRate,
  totalAmount,
  ...other
}) {
  const rowStyles = {
    display: 'flex',
    alignItems: 'center',
  };

  const labelStyles = {
    color: 'text.secondary',
  };

  const valueStyles = {
    width: 160,
  };

  return (
    <Box
      sx={[
        {
          mt: 3,
          gap: 2,
          display: 'flex',
          textAlign: 'right',
          typography: 'body2',
          alignItems: 'flex-end',
          flexDirection: 'column',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={rowStyles}>
        <Box component="span" sx={labelStyles}>
          Subtotal
        </Box>
        <Box component="span" sx={[valueStyles, { fontWeight: 'fontWeightSemiBold' }]}>
          {fCurrency(subtotal) || '-'}
        </Box>
      </Box>

      {taxAmount > 0 && taxRate && (
        <Box sx={rowStyles}>
          <Box component="span" sx={labelStyles}>
            Tax ({taxRate.display_name || `${taxRate.percentage}%`})
          </Box>
          <Box component="span" sx={valueStyles}>
            {fCurrency(taxAmount)}
          </Box>
        </Box>
      )}

      <Box sx={[rowStyles, { typography: 'subtitle1' }]}>
        <Box component="span">Total</Box>
        <Box component="span" sx={valueStyles}>
        {totalAmount != null ? fCurrency(totalAmount) : '-'}
        </Box>
      </Box>
    </Box>
  );
}
