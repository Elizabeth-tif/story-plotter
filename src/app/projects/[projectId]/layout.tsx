'use client';

import { use, useEffect } from 'react';
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
  const { setProject, setLoading, setError, project } = useProjectStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to load project');
      }
      return response.json();
    },
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Failed to load project</h2>
          <p className="text-muted-foreground">{error.message}</p>
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
