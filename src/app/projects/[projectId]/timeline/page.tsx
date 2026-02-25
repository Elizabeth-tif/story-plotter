'use client';

import { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProjectStore, useScenes, useBranches } from '@/stores';
import { Card, CardContent, Badge } from '@/components/ui';
import {
  Clock,
  Plus,
  GripVertical,
  GitBranch,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { Scene, StoryBranch } from '@/types';

// ============================================================
// Sortable trunk item
// ============================================================
interface TrunkItemProps {
  scene: Scene;
  index: number;
  povCharacterName?: string;
  branchesAtNode: StoryBranch[];
}

function TrunkItem({ scene, index, povCharacterName, branchesAtNode }: TrunkItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Main trunk row */}
      <div className="relative flex gap-4 pl-4">
        {/* Timeline dot */}
        <div
          className={`absolute left-6 top-4 h-4 w-4 rounded-full border-4 border-background z-10 flex-shrink-0
            ${branchesAtNode.length > 0 ? 'ring-2 ring-violet-500/60' : ''}`}
          style={{ backgroundColor: scene.color || '#3B82F6' }}
        />

        <Card
          className={`flex-1 ml-8 transition-all ${
            isDragging ? 'border-primary shadow-lg' : 'hover:border-primary/50'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <button
                {...attributes}
                {...listeners}
                className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0 touch-none"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-5 w-5" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{scene.title}</h3>
                  <Badge
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
                  {branchesAtNode.length > 0 && (
                    <Badge variant="outline" className="gap-1 text-violet-500 border-violet-500/40">
                      <GitBranch className="w-2.5 h-2.5" />
                      {branchesAtNode.length}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {scene.description || 'No description'}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {povCharacterName && <span>POV: {povCharacterName}</span>}
                  {scene.location && <span>📍 {scene.location}</span>}
                  {scene.timestamp && <span>🕐 {scene.timestamp}</span>}
                  <span>{scene.wordCount.toLocaleString()} words</span>
                </div>
              </div>

              <div className="flex-shrink-0 text-sm font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                #{index + 1}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch sub-trees at this node */}
      {branchesAtNode.map((branch) => (
        <BranchSubTree key={branch.id} branch={branch} />
      ))}
    </div>
  );
}

// ============================================================
// Branch sub-tree (indented, collapsible, tree-connected)
// ============================================================
function BranchSubTree({ branch }: { branch: StoryBranch }) {
  const [expanded, setExpanded] = useState(true);
  const color = branch.color ?? '#8B5CF6';

  return (
    // ml-8 = 32px — aligns the left edge with the trunk spine (left-8), so our
    // connector arm starts exactly where the trunk line is and goes rightward.
    <div className="relative ml-8 mt-1 mb-2">
      {/* Horizontal arm: trunk spine → branch header */}
      <div
        className="absolute left-0 top-[13px] w-7 h-0.5 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Branch content, pushed right so arm lands on the GitBranch icon */}
      <div className="pl-8">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 hover:opacity-80 transition-opacity"
          style={{ color }}
        >
          <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{branch.name}</span>
          <span className="text-muted-foreground font-normal ml-1">
            ({branch.scenes.length} scene{branch.scenes.length !== 1 ? 's' : ''})
          </span>
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground ml-0.5" />
          )}
        </button>

        {expanded && (
          <div className="relative">
            {/* Vertical colored line running down the branch */}
            {branch.scenes.length > 0 && (
              <div
                className="absolute left-[-5px] top-0 bottom-4 w-0.5 rounded-full"
                style={{ backgroundColor: color, opacity: 0.45 }}
              />
            )}

            {branch.scenes.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-2 pb-2 italic">
                No scenes yet — add scenes via the Branches page.
              </p>
            ) : (
              <div className="space-y-2">
                {[...branch.scenes]
                  .sort((a, b) => (a.timelinePosition ?? a.order) - (b.timelinePosition ?? b.order))
                  .map((scene, idx) => (
                    <BranchSceneCard
                      key={scene.id}
                      scene={scene}
                      index={idx}
                      branchColor={color}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Branch scene card (read-only in tree view)
// ============================================================
function BranchSceneCard({
  scene,
  index,
  branchColor,
}: {
  scene: Scene;
  index: number;
  branchColor: string;
}) {
  return (
    <div className="relative flex gap-3 pl-2">
      <div
        className="absolute left-[-1px] top-4 h-3 w-3 rounded-full border-2 border-background z-10 flex-shrink-0"
        style={{ backgroundColor: branchColor }}
      />
      <Card className="flex-1 ml-5 hover:border-primary/30 transition-all">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-semibold truncate">{scene.title}</h4>
                <Badge
                  variant={
                    scene.status === 'complete'
                      ? 'success'
                      : scene.status === 'in-progress'
                      ? 'warning'
                      : 'secondary'
                  }
                  className="text-[10px]"
                >
                  {scene.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {scene.description || 'No description'}
              </p>
            </div>
            <div className="flex-shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded px-1 py-0.5">
              #{index + 1}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Drag overlay ghost card shown while dragging
// ============================================================
function GhostCard({ scene }: { scene: Scene }) {
  return (
    <div className="relative flex gap-4 pl-4">
      <div
        className="absolute left-6 top-4 h-4 w-4 rounded-full border-4 border-background z-10"
        style={{ backgroundColor: scene.color || '#3B82F6' }}
      />
      <Card className="flex-1 ml-8 border-primary shadow-2xl rotate-1 opacity-95">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold truncate">{scene.title}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================
export default function TimelinePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const scenes = useScenes();
  const branches = useBranches();
  const { getCharacterById, reorderTimeline } = useProjectStore();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sorted main trunk
  const sortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => {
      const posA = a.timelinePosition ?? a.order;
      const posB = b.timelinePosition ?? b.order;
      return posA - posB;
    });
  }, [scenes]);

  // Branches keyed by fork scene id
  const branchesBySceneId = useMemo(() => {
    const map = new Map<string, StoryBranch[]>();
    for (const b of branches) {
      const list = map.get(b.branchPointSceneId) ?? [];
      map.set(b.branchPointSceneId, [...list, b]);
    }
    return map;
  }, [branches]);

  const sortedIds = useMemo(() => sortedScenes.map((s) => s.id), [sortedScenes]);
  const activeScene = activeId ? sortedScenes.find((s) => s.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = sortedIds.indexOf(active.id as string);
    const newIndex = sortedIds.indexOf(over.id as string);
    const newOrder = arrayMove(sortedIds, oldIndex, newIndex);

    reorderTimeline(newOrder);
  }

  const totalBranchScenes = branches.reduce((sum, b) => sum + b.scenes.length, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">Timeline</h1>
            {branches.length > 0 && (
              <Badge variant="outline" className="gap-1 text-violet-500 border-violet-500/40">
                <GitBranch className="w-3 h-3" />
                {branches.length} branch{branches.length !== 1 ? 'es' : ''}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Drag trunk scenes to rearrange chronological order. Branches fork off at their anchor scene.
            {totalBranchScenes > 0 && (
              <span className="ml-1">({totalBranchScenes} branch scene{totalBranchScenes !== 1 ? 's' : ''})</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {branches.length === 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push(`/projects/${projectId}/branches`)}
            >
              <GitBranch className="h-4 w-4" />
              Add Branch
            </Button>
          )}
          <Button
            className="gap-2"
            onClick={() => router.push(`/projects/${projectId}/scenes`)}
          >
            <Plus className="h-4 w-4" />
            Add Scene
          </Button>
        </div>
      </div>

      {sortedScenes.length === 0 ? (
        <EmptyState onAddScene={() => router.push(`/projects/${projectId}/scenes`)} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="relative">
            {/* Vertical main trunk line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

            <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sortedScenes.map((scene, index) => {
                  const povChar = scene.povCharacterId
                    ? getCharacterById(scene.povCharacterId)
                    : null;
                  const branchesAtNode = branchesBySceneId.get(scene.id) ?? [];
                  return (
                    <TrunkItem
                      key={scene.id}
                      scene={scene}
                      index={index}
                      povCharacterName={povChar?.name}
                      branchesAtNode={branchesAtNode}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>

          <DragOverlay>
            {activeScene ? <GhostCard scene={activeScene} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function EmptyState({ onAddScene }: { onAddScene: () => void }) {
  return (
    <div className="text-center py-12">
      <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Your timeline is empty</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Start by creating scenes to visualize and arrange your story's chronology.
      </p>
      <Button onClick={onAddScene} className="gap-2">
        <Plus className="h-4 w-4" />
        Create First Scene
      </Button>
    </div>
  );
}

