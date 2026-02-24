'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitFork, Plus, BookOpen, Loader2, ArrowRight, GitBranch } from 'lucide-react';
import { Button, Input, Label, Modal } from '@/components/ui';
import { useProjectStore } from '@/stores';
import type { ProjectSummary, Scene } from '@/types';

// ──────────────────────────────────────────────────────────────────────────────
// Fork modal
// ──────────────────────────────────────────────────────────────────────────────
interface ForkModalProps {
  scene: Scene;
  projectId: string;
  onClose: () => void;
}

function ForkModal({ scene, projectId, onClose }: ForkModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [branchName, setBranchName] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: branchName.trim() || 'New Branch',
          branchPointSceneId: scene.id,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      return data.project as ProjectSummary;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
      router.push(`/projects/${newProject.id}/scenes`);
    },
  });

  return (
    <Modal isOpen onClose={onClose} title="Fork Story Arc">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The new branch will inherit all scenes up to and including{' '}
          <span className="text-foreground font-medium">&ldquo;{scene.title}&rdquo;</span>. You can then
          add new scenes to continue the story in a different direction.
        </p>

        <div className="space-y-1">
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
                Forking…
              </>
            ) : (
              <>
                <GitFork className="w-4 h-4 mr-2" />
                Create Fork
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────
export default function BranchesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

  // Current project's scenes from the Zustand store
  const scenes = useProjectStore((s) => s.project?.scenes ?? []);
  const projectTitle = useProjectStore((s) => s.project?.title ?? '');

  // All projects (to find child branches of this project)
  const { data: projectsData, isLoading } = useQuery<{ projects: ProjectSummary[] }>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      return res.json();
    },
    staleTime: 30_000,
  });

  // Child branches of this project, keyed by their branchPointSceneId
  const branchesBySceneId = useMemo(() => {
    const map = new Map<string, ProjectSummary[]>();
    for (const p of projectsData?.projects ?? []) {
      if (p.parentId === projectId && p.branchPointSceneId) {
        const existing = map.get(p.branchPointSceneId) ?? [];
        map.set(p.branchPointSceneId, [...existing, p]);
      }
    }
    return map;
  }, [projectsData, projectId]);

  // Scenes sorted chronologically
  const sortedScenes = useMemo(
    () =>
      [...scenes].sort((a, b) => {
        const pa = a.timelinePosition ?? a.order;
        const pb = b.timelinePosition ?? b.order;
        return pa - pb;
      }),
    [scenes]
  );

  // Fork modal state
  const [forkingScene, setForkingScene] = useState<Scene | null>(null);

  const totalBranches = projectsData?.projects.filter((p) => p.parentId === projectId).length ?? 0;

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-foreground">Story Branches</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Fork the story arc at any scene to explore alternate timelines.
          {totalBranches > 0 && (
            <span className="ml-2 text-violet-500">
              {totalBranches} branch{totalBranches !== 1 ? 'es' : ''} so far.
            </span>
          )}
        </p>
      </div>

      {/* Story arc + fork indicators */}
      {sortedScenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <BookOpen className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Add scenes to the project first, then fork the story here.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical trunk line */}
          <div
            className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border"
            aria-hidden="true"
          />

          <ol className="space-y-0">
            {sortedScenes.map((scene, index) => {
              const branches = branchesBySceneId.get(scene.id) ?? [];
              const isLast = index === sortedScenes.length - 1;

              return (
                <li key={scene.id} className="relative flex gap-4">
                  {/* Node dot */}
                  <div className="flex-none z-10 mt-3.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${
                          branches.length > 0
                            ? 'border-violet-500 bg-violet-100 dark:bg-violet-900'
                            : 'border-border bg-background'
                        }`}
                    >
                      {branches.length > 0 && (
                        <GitFork className="w-2.5 h-2.5 text-violet-300" />
                      )}
                    </div>
                  </div>

                  {/* Scene card area */}
                  <div
                    className={`flex-1 min-w-0 pb-4 ${isLast ? '' : ''}`}
                  >
                    {/* Scene row */}
                    <div className="flex items-start gap-3 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-5 pt-2.5">
                          {scene.title || `Scene ${index + 1}`}
                        </p>
                        {scene.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {scene.description}
                          </p>
                        )}
                      </div>

                      {/* Fork button — shown on hover */}
                      <button
                        onClick={() => setForkingScene(scene)}
                        className="flex-none mt-2 flex items-center gap-1 text-xs text-muted-foreground
                                   hover:text-violet-600 transition-colors opacity-0 group-hover:opacity-100
                                   focus:opacity-100"
                      >
                        <GitFork className="w-3 h-3" />
                        Fork here
                      </button>
                    </div>

                    {/* Existing branch cards at this fork point */}
                    {branches.length > 0 && (
                      <div className="mt-2 ml-1 space-y-1.5">
                        {branches.map((branch) => (
                          <BranchCard key={branch.id} branch={branch} />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}

            {/* End of arc — always show "Fork from end" */}
            <li className="relative flex gap-4">
              <div className="flex-none z-10 mt-1.5">
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-border bg-background flex items-center justify-center">
                  <Plus className="w-2.5 h-2.5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 pb-4 pt-0.5">
                <button
                  onClick={() =>
                    sortedScenes.length > 0 &&
                    setForkingScene(sortedScenes[sortedScenes.length - 1])
                  }
                  className="text-xs text-muted-foreground hover:text-violet-600 transition-colors"
                >
                  + Fork from end of arc
                </button>
              </div>
            </li>
          </ol>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading branches…
        </div>
      )}

      {/* Fork modal */}
      {forkingScene && (
        <ForkModal
          scene={forkingScene}
          projectId={projectId}
          onClose={() => setForkingScene(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Branch card component
// ──────────────────────────────────────────────────────────────────────────────
function BranchCard({ branch }: { branch: ProjectSummary }) {
  const router = useRouter();

  return (
    <div
      className="flex items-center gap-2 bg-violet-950/40 border border-violet-800/40
                 rounded-md px-3 py-2 cursor-pointer hover:border-violet-600/60
                 hover:bg-violet-900/40 transition-colors group/card"
      onClick={() => router.push(`/projects/${branch.id}/scenes`)}
    >
        <GitFork className="w-3 h-3 text-violet-500 flex-none" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-violet-700 dark:text-violet-200 truncate">
          {branch.branchName ?? branch.title}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{branch.title}</p>
      </div>
      <ArrowRight
        className="w-3 h-3 text-muted-foreground flex-none opacity-0 group-hover/card:opacity-100
                   transition-opacity"
      />
    </div>
  );
}
