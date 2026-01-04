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
      } else {
        // Default save behavior
        const response = await fetch(`/api/projects/${currentProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project: currentProject,
            lastModified: currentProject.updatedAt,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            setSaving(false);
            return;
          }
          throw new Error('Save failed');
        }

        const data = await response.json();
        
        // Update local state with new timestamp (title is required for updateProjectMeta)
        if (currentProject.title) {
          updateProjectMeta({
            title: currentProject.title,
          });
        }
      }

      setSaving(false);
      markClean(new Date().toISOString());
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
