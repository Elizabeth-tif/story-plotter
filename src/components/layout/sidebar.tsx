'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Users,
  FileText,
  MapPin,
  GitBranch,
  Clock,
  StickyNote,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';

interface SidebarProps {
  projectId: string;
}

const navItems = [
  { name: 'Timeline', href: 'timeline', icon: Clock },
  { name: 'Scenes', href: 'scenes', icon: FileText },
  { name: 'Characters', href: 'characters', icon: Users },
  { name: 'Plotlines', href: 'plotlines', icon: GitBranch },
  { name: 'Locations', href: 'locations', icon: MapPin },
  { name: 'Notes', href: 'notes', icon: StickyNote },
  { name: 'Settings', href: 'settings', icon: Settings },
];

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarState, toggleSidebar } = useUIStore();
  const isCollapsed = sidebarState === 'collapsed';

  const currentPath = pathname.split('/').pop();

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-semibold">Story Plotter</span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={`/projects/${projectId}/${item.href}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Back to Dashboard */}
      <div className="p-4 border-t">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Back to Dashboard' : undefined}
        >
          <ChevronLeft className="h-5 w-5" />
          {!isCollapsed && <span>Back to Dashboard</span>}
        </Link>
      </div>
    </aside>
  );
}
