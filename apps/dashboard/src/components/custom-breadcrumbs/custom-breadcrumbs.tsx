'use client';

import { ReactNode, ComponentProps } from 'react';

import Breadcrumbs from '@mui/material/Breadcrumbs';
import { Theme, SxProps } from '@mui/material/styles';

import { BackLink } from './back-link';
import { MoreLinks } from './more-links';
import { BreadcrumbsLink } from './breadcrumb-link';
import {
  BreadcrumbsRoot,
  BreadcrumbsHeading,
  BreadcrumbsContent,
  BreadcrumbsContainer,
  BreadcrumbsSeparator,
} from './styles';

// ----------------------------------------------------------------------

export type TProps = {
  sx?: SxProps<Theme>;
  action?: ReactNode;
  backHref?: string;
  heading?: string;
  slots?: { breadcrumbs?: any };
  links?: { name: string; href: string; icon?: string }[];
  moreLinks?: { name: string; href: string }[];
  slotProps?: {
    heading?: ComponentProps<typeof BreadcrumbsHeading>;
    content?: ComponentProps<typeof BreadcrumbsContent>;
    container?: ComponentProps<typeof BreadcrumbsContainer>;
    breadcrumbs?: ComponentProps<typeof Breadcrumbs>;
    moreLinks?: ComponentProps<typeof MoreLinks>;
  };
  activeLast?: boolean;
};

export function CustomBreadcrumbs(props: TProps) {
  const { sx, action, backHref, heading, slots = {}, links = [], moreLinks = [], slotProps = {}, activeLast = false, ...other } = props;
  const lastLink = links[links.length - 1]?.name;

  const renderHeading = () => (
    <BreadcrumbsHeading {...slotProps?.heading}>
      {backHref ? <BackLink href={backHref} label={heading} /> : heading}
    </BreadcrumbsHeading>
  );

  const renderLinks = () =>
    slots?.breadcrumbs ?? (
      <Breadcrumbs separator={<BreadcrumbsSeparator />} {...slotProps?.breadcrumbs}>
        {links.map((link, index) => (
          <BreadcrumbsLink
            key={link.name ?? index}
            icon={link.icon}
            href={link.href}
            name={link.name}
            disabled={link.name === lastLink && !activeLast}
          />
        ))}
      </Breadcrumbs>
    );

  const renderMoreLinks = () => <MoreLinks links={moreLinks} {...slotProps?.moreLinks} />;

  return (
    <BreadcrumbsRoot sx={sx} {...other}>
      <BreadcrumbsContainer {...slotProps?.container}>
        <BreadcrumbsContent {...slotProps?.content}>
          {(heading || backHref) && renderHeading()}
          {(!!links.length || slots?.breadcrumbs) && renderLinks()}
        </BreadcrumbsContent>
        {action}
      </BreadcrumbsContainer>

      {!!moreLinks?.length && renderMoreLinks()}
    </BreadcrumbsRoot>
  );
}
