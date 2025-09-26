'use client';

import { useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import MenuList from '@mui/material/MenuList';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TeamTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow, onViewRow }) {
  const { id, name, slug, createdAt, _count } = row;


  const popover = useBoolean();

  const handleViewRow = useCallback(() => {
    onViewRow();
    popover.onFalse();
  }, [onViewRow, popover]);

  const handleEditRow = useCallback(() => {
    onEditRow();
    popover.onFalse();
  }, [onEditRow, popover]);

  const handleDeleteRow = useCallback(() => {
    onDeleteRow();
    popover.onFalse();
  }, [onDeleteRow, popover]);

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            inputProps={{
              id: `row-checkbox-${id}`,
              'aria-label': `Row checkbox`,
            }}
          />
        </TableCell>

        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar alt={name} sx={{ mr: 2 }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ maxWidth: 480 }}>
            <Box
              component="span"
              sx={{
                typography: 'subtitle2',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={handleViewRow}
            >
              {name}
            </Box>
            <Box component="span" sx={{ color: 'text.disabled', typography: 'body2', display: 'block' }}>
              /{slug}
            </Box>
          </Box>
        </TableCell>

        <TableCell>
          <Label variant="soft" color="info">
            {_count?.members || 0} {_count?.members === 1 ? 'member' : 'members'}
          </Label>
        </TableCell>

        <TableCell>{fDate(createdAt)}</TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton color={popover.value ? 'inherit' : 'default'} onClick={popover.onTrue}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <Popover
        open={popover.value}
        anchorEl={popover.anchorEl}
        onClose={popover.onFalse}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuList
          disablePadding
          sx={{
            p: 0.5,
            gap: 0.5,
            width: 140,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              px: 1,
              gap: 2,
              borderRadius: 0.75,
              [`&.${menuItemClasses.selected}`]: { bgcolor: 'action.selected' },
            },
          }}
        >
          <MenuItem onClick={handleViewRow}>
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>

          <MenuItem onClick={handleEditRow}>
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          <MenuItem onClick={handleDeleteRow} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </Popover>
    </>
  );
}
