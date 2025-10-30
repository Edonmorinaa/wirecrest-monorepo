'use client';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

const roleColors = {
  OWNER: 'error',
  ADMIN: 'warning',
  MEMBER: 'info',
};

const roleIcons = {
  OWNER: 'solar:crown-bold',
  ADMIN: 'solar:shield-check-bold',
  MEMBER: 'solar:user-bold',
};

export default function TenantMembersTab({ tenant }) {
  if (!tenant?.members || tenant.members.length === 0) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert
          severity="info"
          icon={<Iconify icon="solar:users-group-rounded-bold" width={24} />}
          sx={{ mb: 2 }}
        >
          <AlertTitle>No Members</AlertTitle>
          This tenant doesn't have any members yet.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h6">
          Team Members
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tenant.members.length} member{tenant.members.length !== 1 ? 's' : ''} in {tenant.name}
        </Typography>
      </Stack>

      <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
        {tenant.members.map((member, index) => {
          const roleColor = roleColors[member.role] || 'default';
          const roleIcon = roleIcons[member.role] || 'solar:user-bold';

          return (
            <Box key={member.id}>
              <ListItem
                sx={{
                  py: 2,
                  px: 3,
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: `${roleColor}.lighter`,
                      color: `${roleColor}.main`,
                    }}
                  >
                    <Iconify icon={roleIcon} width={24} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {member.user.name}
                      </Typography>
                      <Chip
                        icon={<Iconify icon={roleIcon} width={14} />}
                        label={member.role}
                        color={roleColor}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  }
                  secondary={
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Iconify icon="solar:letter-bold" width={16} sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {member.user.email}
                      </Typography>
                    </Stack>
                  }
                />
              </ListItem>
              {index < tenant.members.length - 1 && <Divider variant="inset" component="li" />}
            </Box>
          );
        })}
      </List>
    </Box>
  );
}

