'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sidebar, Header } from '@/components/layout';
import { LoadingScreen } from '@/components/ui';
import { useProjectStore } from '@/stores';
import { useAutoSave } from '@/hooks';
import type { Project } from '@/types';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();
  const { setProject, setLoading, setError, project } = useProjectStore();

  const { data, isLoading, error} = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      console.log('[ProjectLayout] Fetching project:', projectId);
      const response = await fetch(`/api/projects/${projectId}`);
      console.log('[ProjectLayout] Response status:', response.status);
      
      if (response.status === 401) {
        router.push('/login');
        throw new Error('Unauthorized - please log in');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ProjectLayout] Error response:', errorData);
        throw new Error(errorData.error || `Failed to load project (${response.status})`);
      }
      
      const result = await response.json();
      console.log('[ProjectLayout] Project loaded:', result.project?.id);
      console.log('[ProjectLayout] Project data:', result.project);
      return result;
    },
    retry: false,
    refetchOnWindowFocus: false, // CRITICAL: Prevent refetch that overwrites unsaved changes
    refetchOnReconnect: false, // Prevent refetch on reconnect that could overwrite changes
  });

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (error) {
      setError(error.message);
    }
  }, [error, setError]);

  useEffect(() => {
    if (data?.project) {
      console.log('[ProjectLayout] Setting project in store:', data.project.id);
      console.log('[ProjectLayout] Project has:', {
        characters: data.project.characters?.length || 0,
        scenes: data.project.scenes?.length || 0,
        plotlines: data.project.plotlines?.length || 0,
        locations: data.project.locations?.length || 0,
        notes: data.project.notes?.length || 0,
      });
      setProject(data.project as Project);
    } else if (data && !data.project) {
      console.error('[ProjectLayout] API returned success but no project data:', data);
    }
  }, [data, setProject]);

  // Enable auto-save for this project
  useAutoSave({
    interval: 5000, // Save every 5 seconds (changed from 30s to prevent data loss)
    enabled: !!project,
  });

  if (isLoading) {
    return <LoadingScreen message="Loading project..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Failed to load project</h2>
          <p className="text-muted-foreground mb-2">{error.message}</p>
          <p className="text-sm text-muted-foreground/70 mb-6">Project ID: {projectId}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data?.project) {
    console.error('[ProjectLayout] No project data available');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-2">This project doesn't exist or you don't have access to it.</p>
          <p className="text-sm text-muted-foreground/70 mb-6">Project ID: {projectId}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar projectId={projectId} />
      <div className="flex-1 flex flex-col">
        <Header projectTitle={project?.title} showSaveStatus />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
