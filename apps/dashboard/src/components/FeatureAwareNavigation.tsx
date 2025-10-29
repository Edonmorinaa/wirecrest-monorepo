'use client';

import React from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

import {
  Box,
  List,
  Chip,
  Divider,
  ListItem,
  Collapse,
  Typography,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';
import {
  Google as GoogleIcon,
  YouTube as YouTubeIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  children?: NavigationItem[];
}

interface FeatureAwareNavigationProps {
  tenantId: string;
  currentPath?: string;
}

const PLATFORM_ITEMS: NavigationItem[] = [
  {
    id: 'google',
    label: 'Google Business',
    icon: <GoogleIcon />,
    href: '/dashboard/teams/[slug]/google',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: <FacebookIcon />,
    href: '/dashboard/teams/[slug]/facebook',
  },
  {
    id: 'tripadvisor',
    label: 'TripAdvisor',
    icon: <FacebookIcon />, // TODO: Add TripAdvisor icon
    href: '/dashboard/teams/[slug]/tripadvisor',
  },
  {
    id: 'booking',
    label: 'Booking.com',
    icon: <FacebookIcon />, // TODO: Add Booking icon
    href: '/dashboard/teams/[slug]/booking',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: <InstagramIcon />,
    href: '/dashboard/teams/[slug]/instagram',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: <YouTubeIcon />,
    href: '/dashboard/teams/[slug]/tiktok',
  }
];

// Advanced items removed - there are no "advanced" features implemented
// All features are platform-specific (Google, Facebook, Instagram, TikTok, etc.)
// Automation/scraping is a BASE feature, not gated
const ADVANCED_ITEMS: NavigationItem[] = [];

export function FeatureAwareNavigation({ tenantId, currentPath }: FeatureAwareNavigationProps) {
  const { features, loading } = useFeatureFlags(tenantId);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = currentPath?.includes(item.href.replace('/dashboard/teams/[slug]', ''));

      return (
          <ListItem disablePadding>
            <ListItemButton
              href={item.href}
              selected={isActive}
              sx={{ pl: level * 2 + 2 }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
              <Chip 
                label="Available" 
                size="small" 
                color="success" 
                variant="outlined"
              />
            </ListItemButton>
          </ListItem>
      );

      return (
          <ListItem disablePadding>
            <ListItemButton
              href={item.href}
              selected={isActive}
              onClick={hasChildren ? () => handleToggleExpand(item.id) : undefined}
              sx={{ pl: level * 2 + 2 }}
            >
              <ListItemIcon>
                {hasChildren ? (isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />) : item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
              <Chip 
                label="Available" 
                size="small" 
                color="success" 
                variant="outlined"
              />
            </ListItemButton>
          </ListItem>
          
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.children?.map(child => renderNavigationItem(child, level + 1))}
              </List>
            </Collapse>
          )}
      );
        
    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          href={item.href}
          selected={isActive}
          onClick={hasChildren ? () => handleToggleExpand(item.id) : undefined}
          sx={{ pl: level * 2 + 2 }}
        >
          <ListItemIcon>
            {hasChildren ? (isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />) : item.icon}
          </ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </ListItem>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading navigation...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <List>
        {/* Platform Navigation */}
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Platforms
        </Typography>
        {PLATFORM_ITEMS.map(item => renderNavigationItem(item))}
        
        <Divider sx={{ my: 1 }} />
        
        {/* Advanced Features */}
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Advanced Features
        </Typography>
        {ADVANCED_ITEMS.map(item => renderNavigationItem(item))}
        
        <Divider sx={{ my: 1 }} />
        
        {/* Feature Status Summary */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Feature Status
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {Object.entries(features).filter(([_, enabled]) => enabled).map(([feature, _]) => (
              <Chip
                key={feature}
                label={feature.replace('.', ' ')}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      </List>
    </Box>
  );
}

export default FeatureAwareNavigation;
