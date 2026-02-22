'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '@/stores';

interface UseAutoSaveOptions {
  interval?: number; // in milliseconds
  onSave?: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave({
  interval = 30000, // 30 seconds default
  onSave,
  enabled = true,
}: UseAutoSaveOptions = {}) {
  const { isDirty, isSaving, setSaving, project: currentProject, markClean, updateProjectMeta } = useProjectStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (!isDirty || isSavingRef.current || !currentProject || !enabled) {
      return;
    }

    isSavingRef.current = true;
    setSaving(true);

    try {
      if (onSave) {
        await onSave();
        markClean(new Date().toISOString());
      } else {
        // Default save behavior
        console.log('[AutoSave] Saving project:', currentProject.id);
        const response = await fetch(`/api/projects/${currentProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project: currentProject,
            lastKnownTimestamp: currentProject.updatedAt,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            console.log('[AutoSave] Conflict detected');
            setSaving(false);
            isSavingRef.current = false;
            return;
          }
          const errorText = await response.text();
          console.error('[AutoSave] Save failed:', response.status, errorText);
          throw new Error('Save failed');
        }

        const data = await response.json();
        console.log('[AutoSave] Save successful, new timestamp:', data.timestamp);
        markClean(data.timestamp);
      }

      setSaving(false);
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaving(false);
    } finally {
      isSavingRef.current = false;
    }
  }, [isDirty, currentProject, onSave, setSaving, enabled, markClean, updateProjectMeta]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const scheduleAutoSave = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        save();
        scheduleAutoSave();
      }, interval);
    };

    scheduleAutoSave();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [interval, save, enabled]);

  // Save when the page is about to unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        // Modern browsers require returnValue to be set
        event.returnValue = '';
        // Try to save (may not complete)
        save();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, save]);

  // Save when visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isDirty) {
        save();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDirty, save]);

  return {
    save,
    isDirty,
    isSaving,
  };
}
