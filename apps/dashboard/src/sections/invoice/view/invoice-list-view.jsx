'use client';

import { sumBy } from 'es-toolkit';
import { useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useInvoices } from 'src/hooks/useInvoices';

import { fIsAfter, fIsBetween } from 'src/utils/format-time';

import { INVOICE_SERVICE_OPTIONS } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  rowInPage,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { InvoiceAnalytic } from '../invoice-analytic';
import { InvoiceTableRow } from '../invoice-table-row';
import { InvoiceTableToolbar } from '../invoice-table-toolbar';
import { InvoiceTableFiltersResult } from '../invoice-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'number', label: 'Customer' },
  { id: 'created', label: 'Create' },
  { id: 'due_date', label: 'Due' },
  { id: 'total', label: 'Amount' },
  { id: 'sent', label: 'Sent', align: 'center' },
  { id: 'status', label: 'Status' },
  { id: '' },
];

// ----------------------------------------------------------------------

export function InvoiceListView() {
  const theme = useTheme();

  const table = useTable({ defaultOrderBy: 'created' });

  const confirmDialog = useBoolean();

  const filters = useSetState({
    name: '',
    service: [],
    status: 'all',
    startDate: null,
    endDate: null,
    // Add cumulative status filters
    statusFilters: [],
  });
  const { state: currentFilters, setState: updateFilters } = filters;

  // Use real Stripe invoice data instead of mock data
  const { 
    invoices: tableData, 
    loading, 
    refreshing,
    error, 
    deleteInvoice: apiDeleteInvoice, 
    bulkOperation 
  } = useInvoices({
    // Don't pass status to useInvoices - handle it client-side for cumulative filtering
    search: currentFilters.name,
    startDate: currentFilters.startDate,
    endDate: currentFilters.endDate,
    service: currentFilters.service,
  });

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: currentFilters,
    dateError,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!currentFilters.name ||
    currentFilters.service.length > 0 ||
    currentFilters.status !== 'all' ||
    (currentFilters.statusFilters && currentFilters.statusFilters.length > 0) ||
    (!!currentFilters.startDate && !!currentFilters.endDate);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const getInvoiceLength = (status) => tableData.filter((item) => item.status === status).length;

  const getTotalAmount = (status) =>
    sumBy(
      tableData.filter((item) => item.status === status),
      (invoice) => invoice.total / 100
    );

  const getPercentByStatus = (status) => (getInvoiceLength(status) / tableData.length) * 100;

  const TABS = [
    {
      value: 'all',
      label: 'All',
      color: 'default',
      count: tableData.length,
    },
    {
      value: 'paid',
      label: 'Paid',
      color: 'success',
      count: getInvoiceLength('paid'),
    },
    {
      value: 'pending',
      label: 'Pending',
      color: 'warning',
      count: getInvoiceLength('pending'),
    },
    {
      value: 'overdue',
      label: 'Overdue',
      color: 'error',
      count: getInvoiceLength('overdue'),
    },
    {
      value: 'draft',
      label: 'Draft',
      color: 'default',
      count: getInvoiceLength('draft'),
    },
    {
      value: 'void',
      label: 'Void',
      color: 'error',
      count: getInvoiceLength('void'),
    },
  ];

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await apiDeleteInvoice(id);
        toast.success('Delete success!');
        table.onUpdatePageDeleteRow(dataInPage.length);
      } catch (err) {
        console.error('Failed to delete invoice:', err);
        toast.error('Failed to delete invoice');
      }
    },
    [apiDeleteInvoice, dataInPage.length, table]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      // Use bulk delete operation
      await bulkOperation('delete', table.selected);
      
      toast.success('Delete success!');
      table.onUpdatePageDeleteRows(dataInPage.length, dataFiltered.length);
    } catch (err) {
      console.error('Failed to delete invoices:', err);
      toast.error('Failed to delete invoices');
    }
  }, [bulkOperation, dataFiltered.length, dataInPage.length, table]);

  const handleFilterStatus = useCallback(
    (event, newValue) => {
      table.onResetPage();
      
      if (newValue === 'all') {
        // Clear all status filters
        updateFilters({ 
          status: 'all',
          statusFilters: []
        });
      } else {
        // Add to cumulative status filters
        const currentStatusFilters = currentFilters.statusFilters || [];
        let newStatusFilters;
        
        if (currentStatusFilters.includes(newValue)) {
          // Remove if already selected (toggle off)
          newStatusFilters = currentStatusFilters.filter(s => s !== newValue);
        } else {
          // Add to filters (toggle on)
          newStatusFilters = [...currentStatusFilters, newValue];
        }
        
        updateFilters({ 
          status: newValue, // Keep the main status for UI
          statusFilters: newStatusFilters
        });
      }
    },
    [updateFilters, table, currentFilters.statusFilters]
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {table.selected.length} </strong> items?
        </>
      }
      action={
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            handleDeleteRows();
            confirmDialog.onFalse();
          }}
        >
          Delete
        </Button>
      }
    />
  );

  // Show loading screen while fetching data
  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <LoadingScreen />
          <Box sx={{ typography: 'body2', color: 'text.secondary', mt: 2 }}>
            Loading invoices... If this takes too long, check the browser console for errors.
          </Box>
        </Box>
      </DashboardContent>
    );
  }

  // Show error message if there was an error
  if (error) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Iconify icon="solar:danger-bold" sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Box sx={{ typography: 'h6', mb: 1 }}>Error loading invoices</Box>
          <Box sx={{ typography: 'body2', color: 'text.secondary', mb: 2 }}>{error}</Box>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Invoice', href: paths.dashboard.invoice.root },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.invoice.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              Add invoice
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card sx={{ mb: { xs: 3, md: 5 } }}>
          <Scrollbar sx={{ minHeight: 108 }}>
            <Stack
              divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
              sx={{ py: 2, flexDirection: 'row' }}
            >
              <InvoiceAnalytic
                title="Total"
                total={tableData.length}
                percent={100}
                price={sumBy(tableData, (invoice) => invoice.total / 100)}
                icon="solar:bill-list-bold-duotone"
                color={theme.vars.palette.info.main}
              />

              <InvoiceAnalytic
                title="Paid"
                total={getInvoiceLength('paid')}
                percent={getPercentByStatus('paid')}
                price={getTotalAmount('paid')}
                icon="solar:file-check-bold-duotone"
                color={theme.vars.palette.success.main}
              />

              <InvoiceAnalytic
                title="Pending"
                total={getInvoiceLength('pending')}
                percent={getPercentByStatus('pending')}
                price={getTotalAmount('pending')}
                icon="solar:sort-by-time-bold-duotone"
                color={theme.vars.palette.warning.main}
              />

              <InvoiceAnalytic
                title="Overdue"
                total={getInvoiceLength('overdue')}
                percent={getPercentByStatus('overdue')}
                price={getTotalAmount('overdue')}
                icon="solar:bell-bing-bold-duotone"
                color={theme.vars.palette.error.main}
              />

              <InvoiceAnalytic
                title="Draft"
                total={getInvoiceLength('draft')}
                percent={getPercentByStatus('draft')}
                price={getTotalAmount('draft')}
                icon="solar:file-corrupted-bold-duotone"
                color={theme.vars.palette.text.secondary}
              />
            </Stack>
          </Scrollbar>
        </Card>

        <Card>
          <Tabs
            value={currentFilters.status}
            onChange={handleFilterStatus}
            sx={{
              px: { md: 2.5 },
              boxShadow: `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
              opacity: refreshing ? 0.7 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {TABS.map((tab) => {
              const isActive = currentFilters.statusFilters?.includes(tab.value) || 
                              (tab.value === 'all' && currentFilters.status === 'all');
              const isFiltered = currentFilters.statusFilters?.includes(tab.value);
              
              return (
                <Tab
                  key={tab.value}
                  value={tab.value}
                  label={tab.label}
                  iconPosition="end"
                  icon={
                    <Label
                      variant={isActive ? 'filled' : 'soft'}
                      color={tab.color}
                    >
                      {tab.count}
                    </Label>
                  }
                  sx={{
                    // Visual indicator for active filters
                    backgroundColor: isFiltered ? 'action.selected' : 'transparent',
                    borderBottom: isFiltered ? '2px solid' : 'none',
                    borderBottomColor: 'primary.main',
                  }}
                />
              );
            })}
          </Tabs>

          <InvoiceTableToolbar
            filters={filters}
            dateError={dateError}
            onResetPage={table.onResetPage}
            options={{ services: INVOICE_SERVICE_OPTIONS.map((option) => option.name) }}
          />

          {canReset && (
            <InvoiceTableFiltersResult
              filters={filters}
              onResetPage={table.onResetPage}
              totalResults={dataFiltered.length}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={dataFiltered.length}
              onSelectAllRows={(checked) => {
                table.onSelectAllRows(
                  checked,
                  dataFiltered.map((row) => row.id)
                );
              }}
              action={
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title="Send">
                    <IconButton 
                      color="primary"
                      onClick={async () => {
                        try {
                          await bulkOperation('send', table.selected);
                          toast.success(`${table.selected.length} invoice(s) sent successfully!`);
                          table.onSelectAllRows(false, []);
                        } catch (err) {
                          console.error('Failed to send invoices:', err);
                          toast.error('Failed to send invoices');
                        }
                      }}
                    >
                      <Iconify icon="custom:send-fill" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Download">
                    <IconButton 
                      color="primary"
                      onClick={() => {
                        // TODO: Implement bulk PDF download
                        toast.info('Bulk download feature coming soon');
                      }}
                    >
                      <Iconify icon="solar:download-bold" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Print">
                    <IconButton 
                      color="primary"
                      onClick={() => {
                        window.print();
                      }}
                    >
                      <Iconify icon="solar:printer-minimalistic-bold" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete">
                    <IconButton color="primary" onClick={confirmDialog.onTrue}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />

            <Scrollbar sx={{ minHeight: 444 }}>
              <Table 
                size={table.dense ? 'small' : 'medium'} 
                sx={{ 
                  minWidth: 800,
                  opacity: refreshing ? 0.6 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataFiltered.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <InvoiceTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        editHref={paths.dashboard.invoice.edit(row.id)}
                        detailsHref={paths.dashboard.invoice.details(row.id)}
                      />
                    ))}

                  <TableEmptyRows
                    height={table.dense ? 56 : 56 + 20}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={dataFiltered.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      </DashboardContent>

      {renderConfirmDialog()}
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters, dateError }) {
  const { name, status, service, startDate, endDate, statusFilters } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter((invoice) => {
      const invoiceTo = invoice.metadata?.invoiceTo ? JSON.parse(invoice.metadata.invoiceTo) : null;
      return [invoice.number, invoice.customer_name, invoiceTo?.name, invoiceTo?.company, invoiceTo?.phoneNumber].some((field) =>
        field?.toLowerCase().includes(name.toLowerCase())
      );
    });
  }

  // Apply cumulative status filters
  if (statusFilters && statusFilters.length > 0) {
    inputData = inputData.filter((invoice) => statusFilters.includes(invoice.status));
  } else if (status !== 'all') {
    // Fallback to single status filter for backward compatibility
    inputData = inputData.filter((invoice) => invoice.status === status);
  }

  if (service.length) {
    inputData = inputData.filter((invoice) =>
      invoice.lines?.data?.some((filterItem) => service.includes(filterItem.description))
    );
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((invoice) => fIsBetween(new Date(invoice.created * 1000), startDate, endDate));
    }
  }

  return inputData;
}
