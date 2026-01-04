'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Save,
  Cloud,
  CloudOff,
  Check,
  Loader2,
  User,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore, useAuthStore } from '@/stores';
import { Button } from '@/components/ui';

interface HeaderProps {
  projectTitle?: string;
  showSaveStatus?: boolean;
}

export function Header({ projectTitle, showSaveStatus = false }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isDirty, isSaving, lastSavedAt, saveError } = useProjectStore();
  const [isOnline, setIsOnline] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getSaveStatus = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        text: 'Offline',
        className: 'text-yellow-500',
      };
    }
    if (saveError) {
      return {
        icon: CloudOff,
        text: 'Save failed',
        className: 'text-destructive',
      };
    }
    if (isSaving) {
      return {
        icon: Loader2,
        text: 'Saving...',
        className: 'text-muted-foreground animate-spin',
      };
    }
    if (isDirty) {
      return {
        icon: Cloud,
        text: 'Unsaved changes',
        className: 'text-yellow-500',
      };
    }
    if (lastSavedAt) {
      const date = new Date(lastSavedAt);
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        icon: Check,
        text: `Saved at ${time}`,
        className: 'text-green-500',
      };
    }
    return {
      icon: Cloud,
      text: 'All changes saved',
      className: 'text-muted-foreground',
    };
  };

  const saveStatus = getSaveStatus();
  const StatusIcon = saveStatus.icon;

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {projectTitle && (
          <h1 className="text-lg font-semibold truncate max-w-[300px]">
            {projectTitle}
          </h1>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Save Status */}
        {showSaveStatus && (
          <div className="flex items-center gap-2 text-sm">
            <StatusIcon className={cn('h-4 w-4', saveStatus.className)} />
            <span className="text-muted-foreground hidden sm:inline">
              {saveStatus.text}
            </span>
          </div>
        )}

        {/* Search */}
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <Search className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline text-sm font-medium">
              {user?.name || user?.email || 'User'}
            </span>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-card shadow-lg z-50">
                <div className="p-2">
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
