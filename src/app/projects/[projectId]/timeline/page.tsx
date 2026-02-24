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
import { useProjectStore, useScenes } from '@/stores';
import { Card, CardContent, Badge } from '@/components/ui';
import { Clock, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui';
import type { Scene } from '@/types';

// ============================================================
// Sortable timeline item
// ============================================================
interface TimelineItemProps {
  scene: Scene;
  index: number;
  povCharacterName?: string;
}

function TimelineItem({ scene, index, povCharacterName }: TimelineItemProps) {
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
    <div ref={setNodeRef} style={style} className="relative flex gap-4 pl-4">
      {/* Timeline dot */}
      <div
        className="absolute left-6 top-4 h-4 w-4 rounded-full border-4 border-background z-10 flex-shrink-0"
        style={{ backgroundColor: scene.color || '#3B82F6' }}
      />

      {/* Card */}
      <Card
        className={`flex-1 ml-8 transition-all ${
          isDragging ? 'border-primary shadow-lg' : 'hover:border-primary/50'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0 touch-none"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-5 w-5" />
            </button>

            {/* Content */}
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

            {/* Position badge */}
            <div className="flex-shrink-0 text-sm font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
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
  const { getCharacterById, reorderTimeline } = useProjectStore();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sorted list of scenes by timelinePosition, falling back to order
  const sortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => {
      const posA = a.timelinePosition ?? a.order;
      const posB = b.timelinePosition ?? b.order;
      return posA - posB;
    });
  }, [scenes]);

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Timeline</h1>
          <p className="text-muted-foreground">
            Drag scenes to rearrange the chronological order of your story
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => router.push(`/projects/${projectId}/scenes`)}
        >
          <Plus className="h-4 w-4" />
          Add Scene
        </Button>
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
            {/* Vertical timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

            <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sortedScenes.map((scene, index) => {
                  const povChar = scene.povCharacterId
                    ? getCharacterById(scene.povCharacterId)
                    : null;
                  return (
                    <TimelineItem
                      key={scene.id}
                      scene={scene}
                      index={index}
                      povCharacterName={povChar?.name}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>

          {/* Floating ghost card while dragging */}
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
