'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '@/stores';

interface UseAutoSaveOptions {
  interval?: number; // in milliseconds
  onSave?: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave({
  interval = 5000, // 5 seconds default - changed from 30s to save more frequently
  onSave,
  enabled = true,
}: UseAutoSaveOptions = {}) {
  const { isDirty, isSaving, setSaving, project: currentProject, markClean } = useProjectStore();
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
        console.log('[AutoSave] Saving project:', currentProject.id, {
          characters: currentProject.characters?.length || 0,
          scenes: currentProject.scenes?.length || 0,
          plotlines: currentProject.plotlines?.length || 0,
          locations: currentProject.locations?.length || 0,
          notes: currentProject.notes?.length || 0,
        });
        const response = await fetch(`/api/projects/${currentProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project: currentProject,
            lastKnownTimestamp: currentProject.updatedAt,
            forceOverwrite: false, // Allow conflict detection but don't force
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
        console.log('[AutoSave] Save successful, new timestamp:', data.timestamp, 'version:', data.version);
        
        // Update store with new server timestamp and version
        markClean(data.timestamp, data.version);
      }

      setSaving(false);
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaving(false);
    } finally {
      isSavingRef.current = false;
    }
  }, [isDirty, currentProject, onSave, setSaving, enabled, markClean]);

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

  // Save when visibility changes (tab switching) - CRITICAL: save IMMEDIATELY before refetch
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && isDirty) {
        console.log('[AutoSave] Visibility changed, saving immediately...');
        await save();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDirty, save]);

  // Save when window loses focus (additional safety)
  useEffect(() => {
    const handleBlur = async () => {
      if (isDirty && enabled) {
        console.log('[AutoSave] Window blur detected, saving immediately...');
        await save();
      }
    };

    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isDirty, enabled, save]);

  return {
    save,
    isDirty,
    isSaving,
  };
}
