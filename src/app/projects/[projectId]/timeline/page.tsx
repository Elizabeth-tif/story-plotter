'use client';

import { useMemo } from 'react';
import { useProjectStore, useScenes, usePlotlines } from '@/stores';
import { Card, CardContent, Badge } from '@/components/ui';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui';

export default function TimelinePage() {
  const scenes = useScenes();
  const plotlines = usePlotlines();
  const { getCharacterById } = useProjectStore();

  // Sort scenes by timeline position or order
  const sortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => {
      if (a.timelinePosition !== undefined && b.timelinePosition !== undefined) {
        return a.timelinePosition - b.timelinePosition;
      }
      return a.order - b.order;
    });
  }, [scenes]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Timeline</h1>
          <p className="text-muted-foreground">
            Visualize the chronological order of your scenes
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Scene
        </Button>
      </div>

      {/* Timeline View */}
      {sortedScenes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Timeline events */}
          <div className="space-y-4">
            {sortedScenes.map((scene, index) => {
              const povCharacter = scene.povCharacterId 
                ? getCharacterById(scene.povCharacterId)
                : null;

              return (
                <div key={scene.id} className="relative flex gap-4 pl-4">
                  {/* Timeline dot */}
                  <div
                    className="absolute left-6 top-4 h-4 w-4 rounded-full border-4 border-background z-10"
                    style={{ backgroundColor: scene.color || '#3B82F6' }}
                  />
                  
                  {/* Scene card */}
                  <Card className="flex-1 ml-8 hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
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
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {povCharacter && (
                              <span>POV: {povCharacter.name}</span>
                            )}
                            {scene.location && (
                              <span>📍 {scene.location}</span>
                            )}
                            {scene.timestamp && (
                              <span>🕐 {scene.timestamp}</span>
                            )}
                            <span>{scene.wordCount.toLocaleString()} words</span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          #{index + 1}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Your timeline is empty</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Start by creating scenes to visualize your story's chronology on the timeline.
      </p>
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        Create First Scene
      </Button>
    </div>
  );
}
