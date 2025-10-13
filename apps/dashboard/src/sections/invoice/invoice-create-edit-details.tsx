import { sumBy } from 'es-toolkit';
import { useEffect, useCallback } from 'react';
import { useWatch, useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { StripeData, ServiceOption } from 'src/hooks/useStripeData';

import { useStripeDataContext } from 'src/contexts/StripeDataContext';

import { Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { InvoiceTotalSummary } from './invoice-total-summary';
import { InvoiceTaxRateSelector } from './invoice-tax-rate-selector';

// ----------------------------------------------------------------------

// Type definitions
interface InvoiceItemData {
  id: string;
  title: string;
  description: string;
  service: string;
  quantity: number;
  price: number;
  total: number;
}

interface FieldNames {
  title: string;
  description: string;
  service: string;
  total: string;
}

interface InvoiceItemProps {
  onRemoveItem: () => void;
  fieldNames: FieldNames;
}

// Default item will be set dynamically based on Stripe data
export const getDefaultItem = (): InvoiceItemData => ({
  id: '',
  title: '',
  description: '',
  service: '',       // nothing selected initially
  price: 0,
  quantity: 1,
  total: 0,
});

// Helper function to get service options from Stripe data
const getServiceOptions = (stripeData: StripeData | null): ServiceOption[] => {
  console.log('getServiceOptions - Input stripeData:', stripeData);
  if (!stripeData?.serviceOptions) {
    console.log('getServiceOptions - No serviceOptions found, returning empty array');
    return [];
  }
  console.log('getServiceOptions - Found serviceOptions:', stripeData.serviceOptions.length);
  return stripeData.serviceOptions;
};

const getFieldNames = (index: number): FieldNames => ({
  title: `items[${index}].title`,
  description: `items[${index}].description`,
  service: `items[${index}].service`,
  total: `items[${index}].total`,
});

export function InvoiceCreateEditDetails() {
  const { control, setValue, getValues } = useFormContext();
  const { data: stripeData, loading: stripeLoading, error: stripeError } = useStripeDataContext();

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const items: InvoiceItemData[] = useWatch({ name: 'items' }) || [];

  // Watch for tax rate changes
  const watchedTaxRateId = useWatch({ name: 'taxRateId' });

  // Get service options from Stripe data
  const serviceOptions = getServiceOptions(stripeData);

  // Debug: Log service options for troubleshooting
  console.log('InvoiceCreateEditDetails - Service options:', serviceOptions);
  console.log('InvoiceCreateEditDetails - Stripe data:', stripeData);
  console.log('InvoiceCreateEditDetails - Service options length:', serviceOptions.length);
  console.log('InvoiceCreateEditDetails - Service options details:', serviceOptions.map(s => ({ label: s.product.name, price: s.price.unit_amount, value: s.product.id })));

  const subtotal: number = sumBy(items, (item) => {
    // Get the service price from the selected service
    const selectedService = stripeData?.serviceOptions?.find(service => service.product.id === item.service);
    return selectedService?.price.unit_amount ? selectedService.price.unit_amount / 100 : 0;
  });
  
  // Get selected tax rate
  const selectedTaxRateId = watchedTaxRateId || getValues('taxRateId');
  const selectedTaxRate = stripeData?.taxRates?.find(
    (rate) => rate.id === watchedTaxRateId
  );
  
  
  // Calculate tax amount
  // Handles both percentage (e.g., 18 for 18%) and decimal (e.g., 0.18 for 18%) formats robustly
  const taxAmount: number = selectedTaxRate
    ? (() => {
        const rate = Number(selectedTaxRate.percentage);
        if (isNaN(rate) || rate === 0) return 0;
        // If rate is between 0 and 1, treat as decimal (e.g., 0.18)
        // If rate is >= 1, treat as percent (e.g., 18)
        return subtotal * (rate > 1 ? rate / 100 : rate);
      })()
    : 0;

  // Calculate total with proper tax and shipping
  const totalAmount: number = subtotal + taxAmount;

  // Debug logging
  console.log('🧮 Tax Calculation Debug:', {
    subtotal,
    selectedTaxRateId,
    selectedTaxRate: selectedTaxRate ? {
      id: selectedTaxRate.id,
      percentage: selectedTaxRate.percentage,
      percentage_type: typeof selectedTaxRate.percentage,
      display_name: selectedTaxRate.display_name
    } : null,
    taxAmount,
    taxAmount_calculation: selectedTaxRate ? `${subtotal} * ${selectedTaxRate.percentage}${selectedTaxRate.percentage > 1 ? ' / 100' : ''} = ${taxAmount}` : 'No tax rate',
    totalAmount,
    calculation_breakdown: {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    },
    formValues: {
      taxRateId: getValues('taxRateId'),
      watchedTaxRateId
    }
  });

  // Update form values when calculations change
  useEffect(() => {
    setValue('subtotal', subtotal);
    setValue('totalAmount', totalAmount);
    setValue('taxes', taxAmount);
  }, [setValue, subtotal, totalAmount, taxAmount]);

  // Show loading state for service options
  if (stripeLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          Loading services and tax rates...
        </Typography>
      </Box>
    );
  }

  // Show error state if Stripe data failed to load
  if (stripeError) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          Failed to load Stripe data: {stripeError}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          You can still create invoice items manually
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ color: 'text.disabled', mb: 3 }}>
        Details:
      </Typography>

      <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />} spacing={3}>
        {fields.map((item, index) => (
          <InvoiceItem
            key={item.id}
            fieldNames={getFieldNames(index)}
            onRemoveItem={() => remove(index)}
          />
        ))}
      </Stack>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          gap: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <Button
          size="small"
          color="primary"
          startIcon={<Iconify icon="mingcute:add-line" className="" height={20} sx={{}} />}
          onClick={() => append(getDefaultItem())}
          sx={{ flexShrink: 0 }}
        >
          Add item
        </Button>

        <Box
          sx={{
            gap: 2,
            width: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >

          <InvoiceTaxRateSelector fieldName="taxRateId" />
        </Box>
      </Box>

      <InvoiceTotalSummary
        subtotal={subtotal}
        taxAmount={taxAmount}
        taxRate={selectedTaxRate}
        totalAmount={totalAmount}
        sx={{}}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function InvoiceItem({ onRemoveItem, fieldNames }: InvoiceItemProps) {
  const { setValue } = useFormContext();
  const { data: stripeData } = useStripeDataContext();

  // Get service options from Stripe data
  const serviceOptions = getServiceOptions(stripeData);

  const handleSelectService = useCallback(
    (serviceValue: string) => {
      const selectedService = serviceOptions.find((s) => s.product.id === serviceValue);
  
      if (selectedService) {
        setValue(fieldNames.service, selectedService.product.id);
        setValue(fieldNames.total, selectedService.price.unit_amount ? selectedService.price.unit_amount / 100 : 0);
      }
    },
    [fieldNames.service, fieldNames.total, setValue, serviceOptions]
  );

  const handleClearService = useCallback(() => {
    setValue(fieldNames.service, '');
    setValue(fieldNames.total, 0);
  }, [fieldNames.service, fieldNames.total, setValue]);

  return (
    <Box
      sx={{
        gap: 1.5,
        display: 'flex',
        alignItems: 'flex-end',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          gap: 2,
          width: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Field.Text
          size="small"
          name={fieldNames.title}
          label="Title"
          helperText=""
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <Field.Text
          multiline
          maxRows={3}
          size="small"
          name={fieldNames.description}
          label="Description"
          helperText=""
          slotProps={{ inputLabel: { shrink: true } }}
        />


<Field.Select
  size="small"
  name={fieldNames.service}
  label="Service"
  helperText=""
  slotProps={{ inputLabel: { shrink: true } }}
  sx={{ maxWidth: { md: 160 } }}
>
  <MenuItem
    value=""
    onClick={handleClearService}
    sx={{ fontStyle: 'italic', color: 'text.secondary' }}
  >
    None
  </MenuItem>

  <Divider sx={{ borderStyle: 'dashed' }} />

  {serviceOptions.length > 0 ? (
    serviceOptions.map((service) => (
      <MenuItem
        key={service.product.id}
        value={service.product.id} // ✅ use product id as value
        onClick={() => handleSelectService(service.product.id)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {service.product.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {service.product.description}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
            ${service.price.unit_amount ? (service.price.unit_amount / 100).toFixed(2) : '0.00'}
          </Typography>
        </Box>
      </MenuItem>
    ))
  ) : (
    <MenuItem disabled>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          No services available
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {stripeData ? 'No Stripe products found' : 'Stripe data not loaded'}
        </Typography>
      </Box>
    </MenuItem>
  )}
</Field.Select>

      </Box>

      <Button
        size="small"
        color="error"
        startIcon={<Iconify icon="solar:trash-bin-trash-bold" className="" height={20} sx={{}} />}
        onClick={onRemoveItem}
      >
        Remove
      </Button>
    </Box>
  );
}
