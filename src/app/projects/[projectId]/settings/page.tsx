'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Trash2, Download, Upload, History, AlertTriangle } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardContent,
  Label,
  Textarea,
  ConfirmModal,
  Alert,
} from '@/components/ui';
import { useProjectStore, useAuthStore } from '@/stores';
import { updateProjectSchema, type UpdateProjectInput } from '@/lib/validations';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    currentProject,
    updateProjectMetadata,
    clearProject,
    setProject,
    isDirty,
  } = useProjectStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: formDirty },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      title: currentProject?.title || '',
      description: currentProject?.description || '',
      genre: currentProject?.genre || '',
      targetWordCount: currentProject?.targetWordCount || undefined,
    },
  });

  const handleUpdateProject = (data: UpdateProjectInput) => {
    updateProjectMetadata(data);
    setSuccessMessage('Project settings updated');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportProject = async () => {
    if (!currentProject) return;
    setIsExporting(true);

    try {
      const exportData = {
        exportVersion: '1.0',
        exportDate: new Date().toISOString(),
        project: currentProject,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentProject.title.replace(/[^a-z0-9]/gi, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage('Project exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.project || !data.project.title) {
        throw new Error('Invalid project file format');
      }

      // Merge imported data with current project
      if (currentProject) {
        const mergedProject = {
          ...currentProject,
          characters: [...currentProject.characters, ...data.project.characters],
          scenes: [...currentProject.scenes, ...data.project.scenes],
          plotlines: [...currentProject.plotlines, ...data.project.plotlines],
          locations: [...currentProject.locations, ...data.project.locations],
          notes: [...currentProject.notes, ...data.project.notes],
          timeline: {
            ...currentProject.timeline,
            events: [
              ...currentProject.timeline.events,
              ...data.project.timeline.events,
            ],
          },
        };
        setProject(mergedProject);
      }

      setSuccessMessage('Data imported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to import file. Make sure it\'s a valid project export.');
    }

    // Reset input
    event.target.value = '';
  };

  const handleDeleteProject = async () => {
    if (!currentProject || !user) return;

    try {
      const response = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        clearProject();
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  if (!currentProject) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  const totalWordCount = currentProject.scenes.reduce((sum, s) => sum + s.wordCount, 0);
  const progress = currentProject.targetWordCount
    ? Math.min(Math.round((totalWordCount / currentProject.targetWordCount) * 100), 100)
    : 0;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      {successMessage && (
        <Alert variant="success" className="mb-6">
          {successMessage}
        </Alert>
      )}

      {/* General Settings */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">General</h2>
          <form onSubmit={handleSubmit(handleUpdateProject)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input id="title" {...register('title')} />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input id="genre" {...register('genre')} placeholder="Fantasy, Sci-Fi, Romance..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="A brief description of your story..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetWordCount">Target Word Count</Label>
              <Input
                id="targetWordCount"
                type="number"
                {...register('targetWordCount', { valueAsNumber: true })}
                placeholder="80000"
              />
              {currentProject.targetWordCount && (
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {totalWordCount.toLocaleString()} / {currentProject.targetWordCount.toLocaleString()} words
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={!formDirty}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{currentProject.characters.length}</p>
              <p className="text-sm text-muted-foreground">Characters</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{currentProject.scenes.length}</p>
              <p className="text-sm text-muted-foreground">Scenes</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{currentProject.plotlines.length}</p>
              <p className="text-sm text-muted-foreground">Plotlines</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{currentProject.locations.length}</p>
              <p className="text-sm text-muted-foreground">Locations</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{currentProject.notes.length}</p>
              <p className="text-sm text-muted-foreground">Notes</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{totalWordCount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Words</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">
                {currentProject.scenes.filter((s) => s.status === 'complete').length}
              </p>
              <p className="text-sm text-muted-foreground">Complete Scenes</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">
                {currentProject.timeline.events.length}
              </p>
              <p className="text-sm text-muted-foreground">Timeline Events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export/Import */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Export & Import</h2>
          
          {importError && (
            <Alert variant="destructive" className="mb-4">
              {importError}
            </Alert>
          )}

          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExportProject}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Project'}
            </Button>

            <label>
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  Import Data
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="sr-only"
                onChange={handleImportProject}
              />
            </label>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Export your project as JSON or import data from another project.
          </p>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Version History</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              View and restore previous versions of your project.
            </p>
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" />
              View History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Danger Zone</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all its data.
              </p>
            </div>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Are you sure you want to delete "${currentProject.title}"? This action cannot be undone and all data will be permanently lost.`}
        confirmText="Delete Project"
        variant="destructive"
      />
    </div>
  );
}
