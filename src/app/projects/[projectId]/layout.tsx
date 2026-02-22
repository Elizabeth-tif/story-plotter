'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sidebar, Header } from '@/components/layout';
import { LoadingScreen } from '@/components/ui';
import { useProjectStore } from '@/stores';
import type { Project } from '@/types';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = use(params);
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
      setProject(data.project as Project);
    }
  }, [data, setProject]);

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
