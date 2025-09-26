'use client';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
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

import { TeamTableRow } from '../team-table-row';
import { TeamCreateDialog } from '../team-create-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Team Name' },
  { id: 'members', label: 'Members', width: 120 },
  { id: 'createdAt', label: 'Created', width: 160 },
  { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function TeamListView({ teams = [], onCreateTeam, onUpdateTeam, onDeleteTeam, isLoading, showCreateDialog = false }) {
  const table = useTable();
  const confirm = useBoolean();
  const createDialog = useBoolean(showCreateDialog);

  const [tableData, setTableData] = useState(teams);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset = false;
  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleDeleteRow = useCallback(
    (id) => {
      const deleteRow = tableData.filter((row) => row.id !== id);
      setTableData(deleteRow);
      table.onUpdatePageDeleteRow(dataInPage.length);
    },
    [dataInPage.length, table, tableData]
  );

  const handleDeleteRows = useCallback(() => {
    const deleteRows = tableData.filter((row) => !table.selected.includes(row.id));
    setTableData(deleteRows);
    table.onUpdatePageDeleteRows({
      totalRowsInPage: dataInPage.length,
      totalRowsFiltered: dataFiltered.length,
    });
  }, [dataFiltered.length, dataInPage.length, table, tableData]);

  const handleEditRow = useCallback((team) => {
    // Handle edit logic here
    console.log('Edit team:', team);
  }, []);

  const handleViewRow = useCallback((slug) => {
    // Navigate to team dashboard
    window.location.href = `/dashboard/teams/${slug}`;
  }, []);

  const handleConfirmDelete = useCallback((team) => {
    setSelectedTeam(team);
    confirm.onTrue();
  }, [confirm]);

  const handleDelete = useCallback(async () => {
    if (selectedTeam && onDeleteTeam) {
      await onDeleteTeam(selectedTeam.slug);
      handleDeleteRow(selectedTeam.id);
      setSelectedTeam(null);
    }
    confirm.onFalse();
  }, [selectedTeam, onDeleteTeam, handleDeleteRow, confirm]);

  const handleCreateTeam = useCallback(async (teamData) => {
    if (onCreateTeam) {
      await onCreateTeam(teamData.name);
      createDialog.onFalse();
    }
  }, [onCreateTeam, createDialog]);

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Teams"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Teams' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={createDialog.onTrue}
            >
              Create Team
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={dataFiltered.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  dataFiltered.map((row) => row.id)
                )
              }
              action={
                <IconButton color="primary" onClick={handleDeleteRows}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              }
            />

            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
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
                  {dataInPage.map((row) => (
                    <TeamTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onDeleteRow={() => handleConfirmDelete(row)}
                      onEditRow={() => handleEditRow(row)}
                      onViewRow={() => handleViewRow(row.slug)}
                    />
                  ))}

                  <TableEmptyRows
                    height={table.dense ? 52 : 72}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            count={dataFiltered.length}
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            dense={table.dense}
            onChangeDense={table.onChangeDense}
          />
        </Card>
      </DashboardContent>

      <TeamCreateDialog
        open={createDialog.value}
        onClose={createDialog.onFalse}
        onCreate={handleCreateTeam}
      />

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete Team"
        content={
          <>
            Are you sure you want to delete <strong>{selectedTeam?.name}</strong>?
            <br />
            This action cannot be undone.
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator }) {
  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  return stabilizedThis.map((el) => el[0]);
}
