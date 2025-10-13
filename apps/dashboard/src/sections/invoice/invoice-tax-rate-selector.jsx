'use client';

import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useStripeDataContext } from 'src/contexts/StripeDataContext';

import { Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InvoiceTaxRateSelector({ fieldName = 'taxRateId' }) {
  const { data: stripeData, loading } = useStripeDataContext();
  const { setValue } = useFormContext();
  
  // Debug form context
  console.log('🔍 TaxRateSelector - fieldName:', fieldName);
  console.log('🔍 TaxRateSelector - stripeData available:', !!stripeData);
  console.log('🔍 TaxRateSelector - taxRates count:', stripeData?.taxRates?.length || 0);

  const handleTaxRateChange = useCallback((taxRateId) => {
    console.log('🔄 Tax rate changed:', taxRateId);
    
    // Set the form value directly
    setValue(fieldName, taxRateId);
    
    if (!taxRateId) {
      console.log('❌ No tax rate selected');
      return;
    }
    
    const selectedTaxRate = stripeData?.taxRates?.find(rate => rate.id === taxRateId);
    if (selectedTaxRate) {
      console.log('✅ Selected tax rate:', {
        id: selectedTaxRate.id,
        percentage: selectedTaxRate.percentage,
        percentage_type: typeof selectedTaxRate.percentage,
        display_name: selectedTaxRate.display_name,
        jurisdiction: selectedTaxRate.jurisdiction,
        country: selectedTaxRate.country
      });
    } else {
      console.log('❌ Tax rate not found in Stripe data:', taxRateId);
      console.log('Available tax rates:', stripeData?.taxRates?.map(rate => ({ id: rate.id, percentage: rate.percentage, display_name: rate.display_name })));
    }
  }, [stripeData?.taxRates, setValue, fieldName]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: { md: 200 }, minWidth: { md: 120 } }}>
        <Field.Text
          size="small"
          label="Tax Rate"
          name={fieldName}
          placeholder="Loading tax rates..."
          disabled
          sx={{ maxWidth: { md: 200 } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Loading tax rates...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Stack spacing={1}>
      <Field.Select
        size="small"
        label="Tax Rate"
        name={fieldName}
        placeholder="Select tax rate"
        sx={{ maxWidth: { md: 200 }, minWidth: { md: 120 } }}
        onChange={(event) => {
          const value = event.target.value;
          console.log('🔄 Tax rate selector onChange triggered:', value);
          handleTaxRateChange(value);
        }}
      >
        <MenuItem value="">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="solar:file-remove-bold" />
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              No Tax
            </Typography>
          </Box>
        </MenuItem>

        {(stripeData?.taxRates || []).map((taxRate) => (
          <MenuItem key={taxRate.id} value={taxRate.id}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%', py: 0.5 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  {taxRate.display_name}
                </Typography>
                
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  {taxRate.description || 'Tax rate'}
                </Typography>

                {/* Tax Rate Details */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Rate: {taxRate.percentage}%
                  </Typography>
                  
                  {taxRate.jurisdiction && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Jurisdiction: {taxRate.jurisdiction}
                    </Typography>
                  )}
                  
                  {taxRate.country && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Country: {taxRate.country}
                    </Typography>
                  )}
                  
                  {taxRate.state && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      State: {taxRate.state}
                    </Typography>
                  )}
                  
                  {taxRate.tax_type && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Type: {taxRate.tax_type}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  {taxRate.percentage}%
                </Typography>
                {taxRate.inclusive && (
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 500 }}>
                    (inclusive)
                  </Typography>
                )}
                {!taxRate.inclusive && (
                  <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 500 }}>
                    (exclusive)
                  </Typography>
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Field.Select>

      {stripeData?.taxRates?.length === 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          No tax rates configured in Stripe
        </Typography>
      )}
    </Stack>
  );
}
