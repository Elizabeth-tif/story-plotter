'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  GitFork,
  Plus,
  BookOpen,
  Loader2,
  GitBranch,
  Trash2,
  ChevronDown,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { Button, Input, Label, Modal } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useProjectStore, useBranches } from '@/stores';
import type { Scene, StoryBranch } from '@/types';

// ──────────────────────────────────────────────────────────────────────────────
// Create-branch modal
// ──────────────────────────────────────────────────────────────────────────────
interface CreateBranchModalProps {
  scene: Scene;
  projectId: string;
  onClose: () => void;
  onCreated: (branch: StoryBranch) => void;
}

const BRANCH_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

function CreateBranchModal({ scene, projectId, onClose, onCreated }: CreateBranchModalProps) {
  const { addBranch } = useProjectStore();
  const [branchName, setBranchName] = useState('');
  const [color, setColor] = useState(BRANCH_COLORS[0]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: branchName.trim() || 'New Branch',
          branchPointSceneId: scene.id,
          color,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create branch');
      return data.branch as StoryBranch;
    },
    onSuccess: (branch) => {
      addBranch(branch);
      onCreated(branch);
      onClose();
    },
  });

  return (
    <Modal isOpen onClose={onClose} title="Create Branch">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Branch the story after{' '}
          <span className="text-foreground font-medium">&ldquo;{scene.title}&rdquo;</span>. You can then
          add divergent scenes to this branch.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="branch-name">Branch name</Label>
          <Input
            id="branch-name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="e.g. Dark Timeline, Alternate Ending…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !mutation.isPending) mutation.mutate();
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Branch color</Label>
          <div className="flex gap-2 flex-wrap">
            {BRANCH_COLORS.map((c) => (
              <button
                key={c}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-400">{(mutation.error as Error).message}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <GitFork className="w-4 h-4 mr-2" />
                Create Branch
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Branch detail panel
// ──────────────────────────────────────────────────────────────────────────────
interface BranchPanelProps {
  branch: StoryBranch;
  forkSceneTitle: string;
  projectId: string;
  onDeleted: () => void;
}

function BranchPanel({ branch, forkSceneTitle, projectId, onDeleted }: BranchPanelProps) {
  const { deleteBranch } = useProjectStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/branch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: branch.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
    },
    onSuccess: () => {
      deleteBranch(branch.id);
      onDeleted();
    },
  });

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderLeftColor: branch.color ?? '#8B5CF6', borderLeftWidth: 3 }}
    >
      {/* Branch header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-card">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <Circle className="w-3 h-3 flex-shrink-0" style={{ color: branch.color ?? '#8B5CF6', fill: branch.color ?? '#8B5CF6' }} />

        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{branch.name}</span>
          <span className="text-xs text-muted-foreground ml-2">
            forks from &ldquo;{forkSceneTitle}&rdquo;
          </span>
        </div>

        <Badge variant="secondary" className="text-xs">
          {branch.scenes.length} scene{branch.scenes.length !== 1 ? 's' : ''}
        </Badge>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-400">Delete?</span>
            <Button
              size="sm"
              variant="destructive"
              className="h-6 px-2 text-xs"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => setConfirmDelete(false)}
            >
              No
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-muted-foreground hover:text-red-400 transition-colors"
            aria-label="Delete branch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Branch scenes */}
      {isExpanded && (
        <div className="px-4 py-3 bg-card/50 border-t border-border">
          {branch.scenes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No scenes yet. Go to{' '}
              <span className="text-foreground">Timeline</span> to see this branch and add scenes to it.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {branch.scenes.map((scene, idx) => (
                <li key={scene.id} className="flex items-start gap-2 text-sm">
                  <span className="text-xs text-muted-foreground font-mono mt-0.5 w-5 text-right flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{scene.title || 'Untitled scene'}</p>
                    {scene.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {scene.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    className="ml-auto text-[10px] flex-shrink-0"
                    variant={
                      scene.status === 'complete'
                        ? 'success'
                        : scene.status === 'in-progress'
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {scene.status}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────
export default function BranchesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const scenes = useProjectStore((s) => s.project?.scenes ?? []);
  const branches = useBranches();

  const sortedScenes = useMemo(
    () =>
      [...scenes].sort(
        (a, b) => (a.timelinePosition ?? a.order) - (b.timelinePosition ?? b.order)
      ),
    [scenes]
  );

  // Map: branchPointSceneId -> branches
  const branchesBySceneId = useMemo(() => {
    const map = new Map<string, StoryBranch[]>();
    for (const b of branches) {
      const existing = map.get(b.branchPointSceneId) ?? [];
      map.set(b.branchPointSceneId, [...existing, b]);
    }
    return map;
  }, [branches]);

  const sceneMap = useMemo(
    () => new Map(scenes.map((s) => [s.id, s])),
    [scenes]
  );

  const [forkingScene, setForkingScene] = useState<Scene | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-semibold">Story Branches</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Branches live inside this project and diverge at a chosen scene.
            {branches.length > 0 && (
              <span className="ml-2 text-violet-500">
                {branches.length} branch{branches.length !== 1 ? 'es' : ''}.
              </span>
            )}
          </p>
        </div>

        {sortedScenes.length > 0 && (
          <Button
            className="gap-2"
            onClick={() => setForkingScene(sortedScenes[sortedScenes.length - 1])}
          >
            <Plus className="w-4 h-4" />
            New Branch
          </Button>
        )}
      </div>

      {/* Scene trunk + fork list */}
      {sortedScenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <BookOpen className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Add scenes to the project first, then create branches here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: main trunk with fork points */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Main Trunk
            </h2>
            <div className="relative">
              <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-border" />
              <ol className="space-y-1">
                {sortedScenes.map((scene, idx) => {
                  const hasBranches = (branchesBySceneId.get(scene.id)?.length ?? 0) > 0;
                  return (
                    <li key={scene.id} className="relative flex items-start gap-3 group">
                      <div
                        className={`relative z-10 mt-2 w-4 h-4 rounded-full border-2 flex-shrink-0
                          ${hasBranches
                            ? 'border-violet-500 bg-violet-500/20'
                            : 'border-border bg-background'
                          }`}
                      />
                      <div className="flex-1 min-w-0 py-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {scene.title || `Scene ${idx + 1}`}
                          </p>
                          {hasBranches && (
                            <Badge variant="secondary" className="text-[10px]">
                              {branchesBySceneId.get(scene.id)!.length} branch
                              {branchesBySceneId.get(scene.id)!.length !== 1 ? 'es' : ''}
                            </Badge>
                          )}
                        </div>
                        {scene.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {scene.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setForkingScene(scene)}
                        className="flex-shrink-0 mt-2 flex items-center gap-1 text-xs text-muted-foreground
                                   hover:text-violet-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <GitFork className="w-3 h-3" />
                        Branch here
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* Right: branch list */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Branches ({branches.length})
            </h2>
            {branches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <GitFork className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No branches yet. Hover over a scene on the left and click &ldquo;Branch here&rdquo;.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {branches.map((branch) => {
                  const forkScene = sceneMap.get(branch.branchPointSceneId);
                  return (
                    <BranchPanel
                      key={branch.id}
                      branch={branch}
                      forkSceneTitle={forkScene?.title ?? 'unknown scene'}
                      projectId={projectId}
                      onDeleted={() => {
                        if (activeBranchId === branch.id) setActiveBranchId(null);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create branch modal */}
      {forkingScene && (
        <CreateBranchModal
          scene={forkingScene}
          projectId={projectId}
          onClose={() => setForkingScene(null)}
          onCreated={(b) => setActiveBranchId(b.id)}
        />
      )}
    </div>
  );
}

