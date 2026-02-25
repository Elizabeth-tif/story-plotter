'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '@/stores';

interface UseAutoSaveOptions {
  /**
   * Milliseconds to wait after the **last** mutation before saving.
   * Defaults to 2 000 ms — saves almost immediately after the user stops making changes.
   */
  debounceMs?: number;
  /**
   * Maximum ms a dirty project can stay unsaved regardless of ongoing mutations.
   * Defaults to 30 000 ms.
   */
  maxIntervalMs?: number;
  /** Legacy alias — maps to maxIntervalMs when maxIntervalMs is not provided. */
  interval?: number;
  onSave?: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave({
  debounceMs = 2000,
  maxIntervalMs,
  interval,
  onSave,
  enabled = true,
}: UseAutoSaveOptions = {}) {
  const resolvedMaxInterval = maxIntervalMs ?? interval ?? 30000;

  const { isDirty, isSaving, setSaving, markClean } = useProjectStore();
  const isSavingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Core save ─────────────────────────────────────────────────────────────
  // Reads fresh state via getState() to avoid stale-closure bugs.
  const save = useCallback(async () => {
    const state = useProjectStore.getState();
    if (!state.isDirty || isSavingRef.current || !state.project || !enabled) {
      return;
    }

    // Cancel any pending debounce — we're saving now
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    isSavingRef.current = true;
    setSaving(true);

    try {
      if (onSave) {
        await onSave();
        markClean(new Date().toISOString());
      } else {
        const { project, lastKnownTimestamp } = state;
        console.log('[AutoSave] Saving project:', project.id, {
          version: project.version,
          characters: project.characters?.length ?? 0,
          scenes: project.scenes?.length ?? 0,
          plotlines: project.plotlines?.length ?? 0,
          locations: project.locations?.length ?? 0,
          notes: project.notes?.length ?? 0,
        });

        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          // keepalive: true — request survives page unload / navigation
          keepalive: true,
          body: JSON.stringify({
            project,
            lastKnownTimestamp: lastKnownTimestamp ?? project.updatedAt,
            forceOverwrite: false,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            console.log('[AutoSave] Conflict detected — skipping');
            return;
          }
          const errText = await response.text().catch(() => String(response.status));
          console.error('[AutoSave] Save failed:', errText);
          throw new Error(`Save failed (${response.status})`);
        }

        const data = await response.json();
        console.log('[AutoSave] Saved — timestamp:', data.timestamp, 'version:', data.version);
        markClean(data.timestamp, data.version);
      }
    } catch (err) {
      console.error('[AutoSave] Unhandled error:', err);
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }, [enabled, onSave, setSaving, markClean]);

  // Keep a stable ref so subscription callbacks always call the latest `save`
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);

  // ─── Debounce-on-mutation ──────────────────────────────────────────────────
  // Subscribes to the `project` object. Every store mutation creates a new
  // reference (spread), so this fires on every individual change.
  useEffect(() => {
    if (!enabled) return;

    const schedule = () => {
      if (!useProjectStore.getState().isDirty) return;

      // Reset debounce window
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        saveRef.current();
      }, debounceMs);

      // Start max-staleness guard once per dirty period
      if (!maxTimerRef.current) {
        maxTimerRef.current = setTimeout(() => {
          maxTimerRef.current = null;
          saveRef.current();
        }, resolvedMaxInterval);
      }
    };

    const unsub = useProjectStore.subscribe(
      (s) => s.project,
      (project, prev) => {
        if (project !== prev && project !== null) schedule();
      }
    );

    return () => {
      unsub();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    };
  }, [enabled, debounceMs, resolvedMaxInterval]);

  // Cancel max-staleness timer once a save completes
  useEffect(() => {
    if (!isDirty && maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, [isDirty]);

  // ─── Immediate save on tab hide / window blur ──────────────────────────────
  useEffect(() => {
    const onHide = () => {
      if (useProjectStore.getState().isDirty && enabled) saveRef.current();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onHide);
    };
  }, [enabled]);

  // ─── Page-unload — keepalive fetch survives the browser closing the page ───
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useProjectStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = '';
        // keepalive: true (set inside save) lets the request survive page close
        saveRef.current();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return { save, isDirty, isSaving };
}
