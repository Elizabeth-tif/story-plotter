'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  Plus,
  BookOpen,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button, Input, Modal, Label } from '@/components/ui';
import type { ProjectSummary } from '@/types';

// --------------------------------------------------------
// Types
// --------------------------------------------------------
interface TreeNode {
  project: ProjectSummary;
  children: TreeNode[];
}

// --------------------------------------------------------
// Build tree from flat list of projects
// --------------------------------------------------------
function buildTree(projects: ProjectSummary[], rootId: string): TreeNode | null {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const childrenOf = new Map<string, ProjectSummary[]>();
  for (const p of projects) {
    if (p.parentId) {
      if (!childrenOf.has(p.parentId)) childrenOf.set(p.parentId, []);
      childrenOf.get(p.parentId)!.push(p);
    }
  }

  function build(id: string): TreeNode | null {
    const project = byId.get(id);
    if (!project) return null;
    const children = (childrenOf.get(id) || [])
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => build(c.id))
      .filter((n): n is TreeNode => n !== null);
    return { project, children };
  }

  return build(rootId);
}

// Walk up parentId chain to find absolute root
function findRoot(projects: ProjectSummary[], startId: string): string {
  const byId = new Map(projects.map((p) => [p.id, p]));
  let id = startId;
  while (true) {
    const p = byId.get(id);
    if (!p || !p.parentId) return id;
    id = p.parentId;
  }
}

// --------------------------------------------------------
// Single tree node component (recursive)
// --------------------------------------------------------
interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
  currentProjectId: string;
  onBranch: (projectId: string) => void;
}

function TreeNodeView({ node, depth, currentProjectId, onBranch }: TreeNodeViewProps) {
  const router = useRouter();
  const isCurrent = node.project.id === currentProjectId;
  const isRoot = !node.project.parentId;

  return (
    <div className={`relative ${depth > 0 ? 'ml-8' : ''}`}>
      {/* Vertical connector line from parent */}
      {depth > 0 && (
        <div className="absolute -left-8 top-0 bottom-1/2 w-px bg-border" />
      )}
      {/* Horizontal connector */}
      {depth > 0 && (
        <div className="absolute -left-8 top-1/2 w-8 h-px bg-border" />
      )}
      {/* Vertical connector to next sibling (drawn by parent) */}

      {/* Node card */}
      <div
        className={`relative rounded-lg border p-3 mb-2 transition-all flex items-center gap-3 ${
          isCurrent
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30 cursor-pointer'
        }`}
        onClick={() => {
          if (!isCurrent) router.push(`/projects/${node.project.id}/timeline`);
        }}
        role={isCurrent ? undefined : 'button'}
        tabIndex={isCurrent ? undefined : 0}
        onKeyDown={(e) => {
          if (!isCurrent && (e.key === 'Enter' || e.key === ' '))
            router.push(`/projects/${node.project.id}/timeline`);
        }}
      >
        {/* Icon */}
        <div
          className="h-9 w-9 rounded-md flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: node.project.settings?.color || '#3B82F6' }}
        >
          {isRoot ? (
            <BookOpen className="h-4 w-4 text-white" />
          ) : (
            <GitBranch className="h-4 w-4 text-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>
              {node.project.title}
            </span>
            {node.project.branchName && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {node.project.branchName}
              </span>
            )}
            {isCurrent && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">
                current
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{node.project.wordCount?.toLocaleString() ?? 0} words</span>
            <span>updated {format(new Date(node.project.updatedAt), 'MMM d, yyyy')}</span>
            {node.children.length > 0 && (
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {node.children.length} {node.children.length === 1 ? 'branch' : 'branches'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onBranch(node.project.id);
            }}
          >
            <Plus className="h-3 w-3" />
            Branch
          </Button>
          {!isCurrent && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/projects/${node.project.id}/timeline`);
              }}
              title="Open project"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="relative">
          {/* Vertical line connecting sibling branches */}
          <div className="absolute left-0 top-0 bottom-4 w-px bg-border" style={{ left: -1 }} />
          {node.children.map((child) => (
            <TreeNodeView
              key={child.project.id}
              node={child}
              depth={depth + 1}
              currentProjectId={currentProjectId}
              onBranch={onBranch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------
// Main page
// --------------------------------------------------------
export default function BranchesPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const currentProjectId = params?.projectId as string;

  const [branchingFromId, setBranchingFromId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchTitle, setBranchTitle] = useState('');

  // Fetch all user projects (we need them to build the full tree)
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json() as Promise<{ projects: ProjectSummary[] }>;
    },
    staleTime: 30_000,
  });

  const createBranchMutation = useMutation({
    mutationFn: async ({
      projectId,
      branchName,
      title,
    }: {
      projectId: string;
      branchName: string;
      title: string;
    }) => {
      const res = await fetch(`/api/projects/${projectId}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName, title }),
      });
      if (!res.ok) throw new Error('Failed to create branch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setBranchingFromId(null);
      setBranchName('');
      setBranchTitle('');
    },
  });

  // Build the tree
  const tree = useMemo(() => {
    const projects = data?.projects ?? [];
    if (!projects.length) return null;
    const rootId = findRoot(projects, currentProjectId);
    return buildTree(projects, rootId);
  }, [data, currentProjectId]);

  const branchingFromProject = useMemo(() => {
    if (!branchingFromId) return null;
    return data?.projects.find((p) => p.id === branchingFromId) ?? null;
  }, [branchingFromId, data]);

  const handleOpenBranchModal = (projectId: string) => {
    const parent = data?.projects.find((p) => p.id === projectId);
    setBranchingFromId(projectId);
    setBranchName('');
    setBranchTitle(parent ? `${parent.title} — ` : '');
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchingFromId || !branchName.trim()) return;
    createBranchMutation.mutate({
      projectId: branchingFromId,
      branchName: branchName.trim(),
      title: branchTitle.trim() || `${branchingFromProject?.title ?? 'Project'} — ${branchName.trim()}`,
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Story Branches
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore alternate storylines branching from your original story
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => handleOpenBranchModal(currentProjectId)}
        >
          <Plus className="h-4 w-4" />
          New Branch
        </Button>
      </div>

      {/* Tree */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading story tree...
        </div>
      ) : !tree ? (
        <EmptyState onBranch={() => handleOpenBranchModal(currentProjectId)} />
      ) : (
        <div className="max-w-2xl">
          <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">
            Story tree
          </p>
          <TreeNodeView
            node={tree}
            depth={0}
            currentProjectId={currentProjectId}
            onBranch={handleOpenBranchModal}
          />
        </div>
      )}

      {/* Create Branch Modal */}
      <Modal
        isOpen={!!branchingFromId}
        onClose={() => setBranchingFromId(null)}
        title="Create Branch"
        description={
          branchingFromProject
            ? `Branch off from "${branchingFromProject.title}"`
            : 'Create a new story branch'
        }
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="branchName">Branch Name</Label>
            <Input
              id="branchName"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. Alternative Ending, Dark Timeline..."
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              A short label to identify this story fork
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branchTitle">Project Title (optional)</Label>
            <Input
              id="branchTitle"
              value={branchTitle}
              onChange={(e) => setBranchTitle(e.target.value)}
              placeholder="Leave blank to auto-generate"
            />
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">What gets copied</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>All scenes, characters, plotlines</li>
              <li>Locations, notes, timeline</li>
              <li>Project settings and genre</li>
            </ul>
            <p className="mt-2">Changes in the branch won't affect the original.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setBranchingFromId(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!branchName.trim() || createBranchMutation.isPending}
              className="gap-2"
            >
              {createBranchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Branching...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  Create Branch
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function EmptyState({ onBranch }: { onBranch: () => void }) {
  return (
    <div className="text-center py-12">
      <GitBranch className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
      <h2 className="text-xl font-semibold mb-2">No branches yet</h2>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Create a branch to explore an alternate version of your story without losing the original.
      </p>
      <Button onClick={onBranch} className="gap-2">
        <Plus className="h-4 w-4" />
        Create First Branch
      </Button>
    </div>
  );
}
