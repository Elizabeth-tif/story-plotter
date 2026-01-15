'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Grid3X3, 
  List, 
  Search, 
  BookOpen,
  MoreVertical,
  Archive,
  Trash2,
  Copy,
  Edit,
  FolderOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  Modal,
  LoadingScreen,
  Badge,
} from '@/components/ui';
import { Header } from '@/components/layout';
import { useUIStore } from '@/stores';
import type { ProjectSummary } from '@/types';
import type { CreateProjectRequest } from '@/types/api';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectListView, setProjectListView } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectGenre, setNewProjectGenre] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Fetch projects
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      console.log('[Dashboard] Creating project:', data);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      console.log('[Dashboard] Create response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Dashboard] Create failed:', errorData);
        throw new Error(errorData.error || 'Failed to create project');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('[Dashboard] Project created, redirecting to:', `/projects/${data.project.id}/timeline`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateModalOpen(false);
      setNewProjectTitle('');
      setNewProjectGenre('');
      router.push(`/projects/${data.project.id}/timeline`);
    },
    onError: (error) => {
      console.error('[Dashboard] Create project error:', error);
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    
    createProjectMutation.mutate({
      title: newProjectTitle.trim(),
      genre: newProjectGenre.trim(),
    });
  };

  const projects: ProjectSummary[] = data?.projects || [];
  
  // Filter projects by search query
  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <LoadingScreen message="Loading your projects..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground mt-1">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={projectListView === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setProjectListView('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={projectListView === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setProjectListView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            {projects.length === 0 ? (
              <>
                <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
                <p className="text-muted-foreground mb-6">
                  Create your first project to get started
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Project
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">No projects found</h2>
                <p className="text-muted-foreground">
                  Try adjusting your search query
                </p>
              </>
            )}
          </div>
        )}

        {/* Project Grid/List */}
        {filteredProjects.length > 0 && (
          <div
            className={
              projectListView === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                view={projectListView}
                isMenuOpen={menuOpenId === project.id}
                onMenuToggle={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                onDelete={() => deleteProjectMutation.mutate(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        description="Start a new story project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Project Title
            </label>
            <Input
              id="title"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="My Amazing Story"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="genre" className="text-sm font-medium">
              Genre (optional)
            </label>
            <Input
              id="genre"
              value={newProjectGenre}
              onChange={(e) => setNewProjectGenre(e.target.value)}
              placeholder="Fantasy, Sci-Fi, Romance..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProjectMutation.isPending || !newProjectTitle.trim()}
            >
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectSummary;
  view: 'grid' | 'list';
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, view, isMenuOpen, onMenuToggle, onDelete }: ProjectCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/projects/${project.id}/timeline`);
  };

  if (view === 'list') {
    return (
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: project.settings.color || '#3B82F6' }}
              >
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{project.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {project.genre && <Badge variant="secondary">{project.genre}</Badge>}
                  <span>{project.wordCount.toLocaleString()} words</span>
                  <span>•</span>
                  <span>Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle();
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {isMenuOpen && (
                <ProjectMenu onDelete={onDelete} onClose={onMenuToggle} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: project.settings.color || '#3B82F6' }}
          >
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle();
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {isMenuOpen && (
              <ProjectMenu onDelete={onDelete} onClose={onMenuToggle} />
            )}
          </div>
        </div>
        <h3 className="font-semibold truncate mb-1">{project.title}</h3>
        {project.genre && (
          <Badge variant="secondary" className="mb-2">
            {project.genre}
          </Badge>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {project.description || 'No description'}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{project.wordCount.toLocaleString()} words</span>
          <span>{format(new Date(project.updatedAt), 'MMM d')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectMenu({ onDelete, onClose }: { onDelete: () => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-card shadow-lg z-50">
        <div className="p-1">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <Edit className="h-4 w-4" />
            Edit Details
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
          <hr className="my-1" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
