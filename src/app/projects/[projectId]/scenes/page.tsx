'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { FileText, Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardContent,
  Modal,
  Label,
  Textarea,
  Badge,
  ConfirmModal,
} from '@/components/ui';
import { useProjectStore, useScenes, useCharacters } from '@/stores';
import { createSceneSchema, type CreateSceneInput } from '@/lib/validations';
import type { Scene } from '@/types';

export default function ScenesPage() {
  const scenes = useScenes();
  const characters = useCharacters();
  const { addScene, updateScene, deleteScene } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [deletingScene, setDeletingScene] = useState<Scene | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredScenes = scenes.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateScene = (data: CreateSceneInput) => {
    console.log('[ScenesPage] Creating scene with data:', data);
    const now = new Date().toISOString();
    const newScene: Scene = {
      id: uuidv4(),
      title: data.title,
      description: data.description || '',
      content: data.content || '',
      povCharacterId: data.povCharacterId,
      location: data.location,
      status: data.status || 'draft',
      wordCount: 0,
      color: data.color,
      tags: data.tags || [],
      attachments: [],
      order: scenes.length,
      createdAt: now,
      updatedAt: now,
    };
    console.log('[ScenesPage] New scene object:', newScene);
    addScene(newScene);
    console.log('[ScenesPage] Scene added to store');
    setIsCreateModalOpen(false);
  };

  const handleUpdateScene = (data: CreateSceneInput) => {
    if (!editingScene) return;
    updateScene(editingScene.id, {
      title: data.title,
      description: data.description,
      povCharacterId: data.povCharacterId,
      location: data.location,
      status: data.status,
      color: data.color,
      tags: data.tags,
    });
    setEditingScene(null);
  };

  const handleDeleteScene = () => {
    if (!deletingScene) return;
    deleteScene(deletingScene.id);
    setDeletingScene(null);
  };

  const sortedScenes = [...filteredScenes].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Scenes</h1>
          <p className="text-muted-foreground">
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'} •{' '}
            {scenes.reduce((sum, s) => sum + s.wordCount, 0).toLocaleString()} total words
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Scene
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search scenes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty State */}
      {sortedScenes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          {scenes.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-2">No scenes yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first scene to start writing your story
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Scene
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">No scenes found</h2>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </>
          )}
        </div>
      )}

      {/* Scene List */}
      {sortedScenes.length > 0 && (
        <div className="space-y-3">
          {sortedScenes.map((scene, index) => {
            const povCharacter = scene.povCharacterId
              ? characters.find((c) => c.id === scene.povCharacterId)
              : null;

            return (
              <Card
                key={scene.id}
                className="hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: scene.color || '#6B7280' }}
                      >
                        <span className="text-white font-semibold">{index + 1}</span>
                      </div>
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
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {scene.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {povCharacter && <span>POV: {povCharacter.name}</span>}
                          {scene.location && <span>📍 {scene.location}</span>}
                          <span>{scene.wordCount.toLocaleString()} words</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === scene.id ? null : scene.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {menuOpenId === scene.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-36 rounded-md border bg-card shadow-lg z-50">
                            <div className="p-1">
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                                onClick={() => {
                                  setEditingScene(scene);
                                  setMenuOpenId(null);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                                onClick={() => {
                                  setDeletingScene(scene);
                                  setMenuOpenId(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <SceneFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateScene}
        title="Create Scene"
        characters={characters}
      />

      {/* Edit Modal */}
      <SceneFormModal
        isOpen={!!editingScene}
        onClose={() => setEditingScene(null)}
        onSubmit={handleUpdateScene}
        title="Edit Scene"
        characters={characters}
        defaultValues={editingScene || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingScene}
        onClose={() => setDeletingScene(null)}
        onConfirm={handleDeleteScene}
        title="Delete Scene"
        description={`Are you sure you want to delete "${deletingScene?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

interface SceneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSceneInput) => void;
  title: string;
  characters: { id: string; name: string }[];
  defaultValues?: Partial<Scene>;
}

function SceneFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  characters,
  defaultValues,
}: SceneFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSceneInput>({
    resolver: zodResolver(createSceneSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
      povCharacterId: defaultValues?.povCharacterId || '',
      location: defaultValues?.location || '',
      status: defaultValues?.status || 'draft',
      color: defaultValues?.color || '#6B7280',
      tags: defaultValues?.tags || [],
    },
  });

  const handleFormSubmit = (data: CreateSceneInput) => {
    console.log('[SceneForm] Submitting scene data:', data);
    onSubmit(data);
    reset();
  };

  const handleFormError = (errors: any) => {
    console.error('[SceneForm] Validation errors:', errors);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-lg">
      <form onSubmit={handleSubmit(handleFormSubmit, handleFormError)} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" {...register('title')} placeholder="Scene title" />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of the scene..."
            rows={2}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="povCharacterId">POV Character</Label>
            <select
              id="povCharacterId"
              {...register('povCharacterId')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No POV</option>
              {characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="Forest, Castle..."
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register('status')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="in-progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="color"
                {...register('color')}
                className="h-10 w-14 rounded-md border cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Create Scene'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
