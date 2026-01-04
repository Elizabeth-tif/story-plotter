'use client';

import { useState, useCallback } from 'react';
import type { Project } from '@/types';

interface ConflictData {
  localVersion: Project;
  serverVersion: Project;
  serverTimestamp: string;
}

interface UseConflictResolutionReturn {
  conflict: ConflictData | null;
  isConflictModalOpen: boolean;
  showConflict: (local: Project, server: Project, timestamp: string) => void;
  resolveWithLocal: () => Project;
  resolveWithServer: () => Project;
  resolveWithMerge: () => Project;
  clearConflict: () => void;
}

export function useConflictResolution(): UseConflictResolutionReturn {
  const [conflict, setConflict] = useState<ConflictData | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const showConflict = useCallback(
    (local: Project, server: Project, timestamp: string) => {
      setConflict({
        localVersion: local,
        serverVersion: server,
        serverTimestamp: timestamp,
      });
      setIsConflictModalOpen(true);
    },
    []
  );

  const clearConflict = useCallback(() => {
    setConflict(null);
    setIsConflictModalOpen(false);
  }, []);

  const resolveWithLocal = useCallback((): Project => {
    if (!conflict) throw new Error('No conflict to resolve');
    
    const resolved = {
      ...conflict.localVersion,
      version: conflict.serverVersion.version + 1,
      updatedAt: new Date().toISOString(),
    };
    
    clearConflict();
    return resolved;
  }, [conflict, clearConflict]);

  const resolveWithServer = useCallback((): Project => {
    if (!conflict) throw new Error('No conflict to resolve');
    
    clearConflict();
    return conflict.serverVersion;
  }, [conflict, clearConflict]);

  const resolveWithMerge = useCallback((): Project => {
    if (!conflict) throw new Error('No conflict to resolve');

    const { localVersion, serverVersion } = conflict;
    
    // Smart merge strategy:
    // 1. For arrays (characters, scenes, etc.): union by ID, prefer newer item
    // 2. For metadata: prefer local changes
    // 3. Update version and timestamp

    const mergeArrays = <T extends { id: string; updatedAt: string }>(
      local: T[],
      server: T[]
    ): T[] => {
      const merged = new Map<string, T>();
      
      // Add all server items
      server.forEach((item) => merged.set(item.id, item));
      
      // Add/update with local items (prefer newer)
      local.forEach((item) => {
        const existing = merged.get(item.id);
        if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
          merged.set(item.id, item);
        }
      });
      
      return Array.from(merged.values());
    };

    const mergedProject: Project = {
      ...serverVersion,
      // Prefer local metadata if changed
      title: localVersion.title !== serverVersion.title ? localVersion.title : serverVersion.title,
      description: localVersion.description,
      genre: localVersion.genre,
      targetWordCount: localVersion.targetWordCount,
      // Merge arrays
      characters: mergeArrays(localVersion.characters, serverVersion.characters),
      scenes: mergeArrays(localVersion.scenes, serverVersion.scenes),
      plotlines: mergeArrays(localVersion.plotlines, serverVersion.plotlines),
      locations: mergeArrays(localVersion.locations, serverVersion.locations),
      notes: mergeArrays(localVersion.notes, serverVersion.notes),
      // Merge timeline events
      timeline: {
        ...serverVersion.timeline,
        events: mergeArrays(
          localVersion.timeline.events,
          serverVersion.timeline.events
        ),
      },
      // Update version info
      version: serverVersion.version + 1,
      updatedAt: new Date().toISOString(),
    };

    clearConflict();
    return mergedProject;
  }, [conflict, clearConflict]);

  return {
    conflict,
    isConflictModalOpen,
    showConflict,
    resolveWithLocal,
    resolveWithServer,
    resolveWithMerge,
    clearConflict,
  };
}

// Conflict resolution modal component
import { AlertTriangle, Monitor, Cloud, GitMerge } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: ConflictData | null;
  onResolveLocal: () => void;
  onResolveServer: () => void;
  onResolveMerge: () => void;
}

export function ConflictModal({
  isOpen,
  onClose,
  conflict,
  onResolveLocal,
  onResolveServer,
  onResolveMerge,
}: ConflictModalProps) {
  if (!conflict) return null;

  const localUpdated = formatDistanceToNow(new Date(conflict.localVersion.updatedAt), {
    addSuffix: true,
  });
  const serverUpdated = formatDistanceToNow(new Date(conflict.serverVersion.updatedAt), {
    addSuffix: true,
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sync Conflict Detected" className="max-w-lg">
      <div className="mt-4 space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            Your project was modified on another device. Choose how to resolve this conflict.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            onClick={onResolveLocal}
            className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-colors text-left"
          >
            <Monitor className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Keep Local Changes</p>
              <p className="text-sm text-muted-foreground">
                Use your current version (modified {localUpdated})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {conflict.localVersion.characters.length} characters,{' '}
                {conflict.localVersion.scenes.length} scenes
              </p>
            </div>
          </button>

          <button
            onClick={onResolveServer}
            className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-colors text-left"
          >
            <Cloud className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Use Server Version</p>
              <p className="text-sm text-muted-foreground">
                Discard local changes (server updated {serverUpdated})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {conflict.serverVersion.characters.length} characters,{' '}
                {conflict.serverVersion.scenes.length} scenes
              </p>
            </div>
          </button>

          <button
            onClick={onResolveMerge}
            className="flex items-start gap-3 p-4 rounded-lg border border-primary/50 hover:bg-accent/50 transition-colors text-left bg-primary/5"
          >
            <GitMerge className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Smart Merge (Recommended)</p>
              <p className="text-sm text-muted-foreground">
                Combine changes from both versions intelligently
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Keeps newer items from each version
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
