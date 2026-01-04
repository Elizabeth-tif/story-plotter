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
  const { isDirty, saveStatus, setSaveStatus, currentProject } = useProjectStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (!isDirty || isSavingRef.current || !currentProject || !enabled) {
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

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
            setSaveStatus('conflict');
            return;
          }
          throw new Error('Save failed');
        }

        const data = await response.json();
        
        // Update local state with new timestamp
        useProjectStore.getState().updateProjectMetadata({
          updatedAt: data.project.updatedAt,
          version: data.project.version,
        });
      }

      setSaveStatus('saved');
      useProjectStore.getState().markClean();
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [isDirty, currentProject, onSave, setSaveStatus, enabled]);

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
    saveStatus,
    isDirty,
    isSaving: saveStatus === 'saving',
  };
}
