'use client';

import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/ui/sidebar';
import { useAuth, signOut } from '@wirecrest/auth-next';
import { useRouter, useParams } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  LogOut, 
  Shield, 
  Settings, 
  Building,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

// Import navigation configs
import { adminNavData } from 'src/layouts/nav-config-admin';
import { getUserNavData } from 'src/layouts/nav-config-user';
import { getTenantAdminNavData } from 'src/layouts/nav-config-tenant-admin';
import { getTenantMemberNavData } from 'src/layouts/nav-config-tenant-member';

// ----------------------------------------------------------------------

function DashboardContent({ children }) {
  const { user, loading, authenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  // Get team slug from URL params
  const teamSlug = params?.slug;
  
  // Get user's super role and team role
  const userSuperRole = user?.superRole;
  const userTeamRole = user?.teamRole; // This would come from your user data

  // Determine which navigation config to use
  const getNavigationData = () => {
    // Super Admin gets admin navigation
    if (userSuperRole === 'ADMIN') {
      return adminNavData;
    }
    
    // Support users get admin navigation
    if (userSuperRole === 'SUPPORT') {
      return adminNavData;
    }
    
    // Regular users get navigation based on their team role
    if (userSuperRole === 'USER') {
      if (userTeamRole === 'ADMIN') {
        return getTenantAdminNavData(teamSlug);
      } else {
        return getTenantMemberNavData(teamSlug);
      }
    }
    
    // Fallback to user navigation
    return getUserNavData(teamSlug);
  };

  const navigationData = getNavigationData();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authenticated && !loading) {
      router.push('/auth/sign-in');
    }
  }, [authenticated, loading, router]);

  // Route protection - redirect if user tries to access unauthorized routes
  useEffect(() => {
    if (!user?.superRole || loading) return;

    const currentPath = window.location.pathname;
    const userRole = user?.superRole;

    // Admin users should not access team routes
    if (userRole === 'ADMIN' && currentPath.startsWith('/dashboard/teams')) {
      router.replace('/dashboard/superadmin');
      return;
    }

    // Admin users should not access regular user routes
    if (userRole === 'ADMIN' && currentPath.startsWith('/dashboard') && !currentPath.startsWith('/dashboard/superadmin')) {
      router.replace('/dashboard/superadmin');
      return;
    }

    // Regular users should not access admin routes
    if (userRole === 'USER' && currentPath.startsWith('/dashboard/superadmin')) {
      router.replace('/dashboard');
      return;
    }

    // Support users can access admin routes but not team routes
    if (userRole === 'SUPPORT' && currentPath.startsWith('/dashboard/teams')) {
      router.replace('/dashboard/superadmin');
      return;
    }
  }, [session, status, router]);

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  // Show loading while not authenticated
  if (!session) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/sign-in' });
  };

  const getUserInitials = (name) => name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  const getRoleBadge = () => {
    if (userSuperRole === 'ADMIN') {
      return (
        <Badge variant="destructive" className="text-xs">
          <Shield className="w-3 h-3 mr-1" />
          Super Admin
        </Badge>
      );
    }
    if (userSuperRole === 'SUPPORT') {
      return (
        <Badge variant="secondary" className="text-xs">
          <User className="w-3 h-3 mr-1" />
          Support
        </Badge>
      );
    }
    if (userTeamRole === 'ADMIN') {
      return (
        <Badge variant="default" className="text-xs">
          <Building className="w-3 h-3 mr-1" />
          Team Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <User className="w-3 h-3 mr-1" />
        Member
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar className="border-r">
        <div className="flex h-full flex-col gap-2">
          {/* Header */}
          <div className="flex h-[60px] items-center border-b px-2">
            <div className="flex items-center gap-2 px-4">
              <Building className="h-6 w-6" />
              <span className="font-semibold">ReputAction</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-auto">
            <nav className="grid items-start px-2 text-sm font-medium">
              {navigationData.map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-2">
                  {section.subheader && (
                    <h4 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.subheader}
                    </h4>
                  )}
                  {section.items?.map((item, itemIndex) => (
                    <SidebarItem
                      key={itemIndex}
                      item={item}
                      isActive={window.location.pathname === item.path}
                      userSuperRole={userSuperRole}
                      userTeamRole={userTeamRole}
                    />
                  ))}
                </div>
              ))}
            </nav>
          </div>

          {/* User Profile */}
          <div className="border-t p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={session.user?.image} alt={session.user?.name} />
                    <AvatarFallback>
                      {getUserInitials(session.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{session.user?.name}</span>
                    <span className="text-xs text-muted-foreground">{session.user?.email}</span>
                  </div>
                  {getRoleBadge()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1">
            {/* Breadcrumb or page title can go here */}
          </div>
          <div className="flex items-center gap-2">
            {teamSlug && userSuperRole === 'USER' && (
              <Badge variant="outline">
                <Building className="w-3 h-3 mr-1" />
                {teamSlug}
              </Badge>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function SidebarItem({ item, isActive, userSuperRole, userTeamRole }) {
  const router = useRouter();

  const handleClick = () => {
    if (!item.path) return;

    // Check if user can access this route
    const canAccessRoute = (() => {
      // Admin routes - only accessible by ADMIN and SUPPORT
      if (item.path.startsWith('/dashboard/superadmin')) {
        return userSuperRole === 'ADMIN' || userSuperRole === 'SUPPORT';
      }

      // Team routes - only accessible by USER
      if (item.path.startsWith('/dashboard/teams')) {
        return userSuperRole === 'USER';
      }

      // Regular dashboard routes - accessible by all authenticated users
      if (item.path.startsWith('/dashboard')) {
        return true;
      }

      return true;
    })();

    if (!canAccessRoute) {
      // Redirect to appropriate page based on role
      if (userSuperRole === 'ADMIN' || userSuperRole === 'SUPPORT') {
        router.push('/dashboard/superadmin');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    router.push(item.path);
  };

  return (
    <div className="space-y-1">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className="w-full justify-start gap-2"
        onClick={handleClick}
      >
        {item.icon}
        <span>{item.title}</span>
      </Button>
      
      {/* Render children if they exist */}
      {item.children && item.children.length > 0 && (
        <div className="ml-6 space-y-1">
          {item.children.map((child, childIndex) => (
            <Button
              key={childIndex}
              variant={window.location.pathname === child.path ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                // Check if user can access child route
                const canAccessChildRoute = (() => {
                  if (child.path.startsWith('/dashboard/superadmin')) {
                    return userSuperRole === 'ADMIN' || userSuperRole === 'SUPPORT';
                  }
                  if (child.path.startsWith('/dashboard/teams')) {
                    return userSuperRole === 'USER';
                  }
                  return true;
                })();

                if (!canAccessChildRoute) {
                  if (userSuperRole === 'ADMIN' || userSuperRole === 'SUPPORT') {
                    router.push('/dashboard/superadmin');
                  } else {
                    router.push('/dashboard');
                  }
                  return;
                }

                router.push(child.path);
              }}
            >
              {child.icon}
              <span>{child.title}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

/**
 * Main Dashboard Layout Component
 * 
 * This component wraps the entire dashboard with navigation and authentication
 */
export function DashboardLayout({ children, requiredRole = null }) {
  return (
    <DashboardContent>
      {children}
    </DashboardContent>
  );
}
