'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { Layers, Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
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
import { useProjectStore, usePlotlines, useScenes } from '@/stores';
import { createPlotlineSchema, type CreatePlotlineInput } from '@/lib/validations';
import type { Plotline } from '@/types';

export default function PlotlinesPage() {
  const plotlines = usePlotlines();
  const scenes = useScenes();
  const { addPlotline, updatePlotline, deletePlotline } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlotline, setEditingPlotline] = useState<Plotline | null>(null);
  const [deletingPlotline, setDeletingPlotline] = useState<Plotline | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredPlotlines = plotlines.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePlotline = (data: CreatePlotlineInput) => {
    const now = new Date().toISOString();
    const newPlotline: Plotline = {
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      color: data.color || '#8B5CF6',
      sceneIds: [],
      order: plotlines.length,
      createdAt: now,
      updatedAt: now,
    };
    addPlotline(newPlotline);
    setIsCreateModalOpen(false);
  };

  const handleUpdatePlotline = (data: CreatePlotlineInput) => {
    if (!editingPlotline) return;
    updatePlotline(editingPlotline.id, {
      name: data.name,
      description: data.description,
      color: data.color,
    });
    setEditingPlotline(null);
  };

  const handleDeletePlotline = () => {
    if (!deletingPlotline) return;
    deletePlotline(deletingPlotline.id);
    setDeletingPlotline(null);
  };

  const sortedPlotlines = [...filteredPlotlines].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Plotlines</h1>
          <p className="text-muted-foreground">
            {plotlines.length} {plotlines.length === 1 ? 'plotline' : 'plotlines'}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Plotline
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search plotlines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty State */}
      {sortedPlotlines.length === 0 && (
        <div className="text-center py-12">
          <Layers className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          {plotlines.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-2">No plotlines yet</h2>
              <p className="text-muted-foreground mb-6">
                Create plotlines to organize your story&apos;s narrative threads
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Plotline
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">No plotlines found</h2>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </>
          )}
        </div>
      )}

      {/* Plotline Grid */}
      {sortedPlotlines.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlotlines.map((plotline) => {
            const sceneCount = plotline.sceneIds.length;
            const associatedScenes = scenes.filter((s) =>
              plotline.sceneIds.includes(s.id)
            );
            const completedScenes = associatedScenes.filter(
              (s) => s.status === 'complete'
            ).length;
            const progress =
              sceneCount > 0 ? Math.round((completedScenes / sceneCount) * 100) : 0;

            return (
              <Card
                key={plotline.id}
                className="hover:border-primary/50 transition-colors group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: plotline.color }}
                      />
                      <h3 className="font-semibold truncate">{plotline.name}</h3>
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === plotline.id ? null : plotline.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {menuOpenId === plotline.id && (
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
                                  setEditingPlotline(plotline);
                                  setMenuOpenId(null);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                                onClick={() => {
                                  setDeletingPlotline(plotline);
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

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                    {plotline.description || 'No description'}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
                      </span>
                      {sceneCount > 0 && (
                        <Badge variant={progress === 100 ? 'success' : 'secondary'}>
                          {progress}% complete
                        </Badge>
                      )}
                    </div>

                    {sceneCount > 0 && (
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: plotline.color,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <PlotlineFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePlotline}
        title="Create Plotline"
      />

      {/* Edit Modal */}
      <PlotlineFormModal
        isOpen={!!editingPlotline}
        onClose={() => setEditingPlotline(null)}
        onSubmit={handleUpdatePlotline}
        title="Edit Plotline"
        defaultValues={editingPlotline || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingPlotline}
        onClose={() => setDeletingPlotline(null)}
        onConfirm={handleDeletePlotline}
        title="Delete Plotline"
        description={`Are you sure you want to delete "${deletingPlotline?.name}"? This will not delete any scenes.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

interface PlotlineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlotlineInput) => void;
  title: string;
  defaultValues?: Partial<Plotline>;
}

function PlotlineFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  defaultValues,
}: PlotlineFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePlotlineInput>({
    resolver: zodResolver(createPlotlineSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      color: defaultValues?.color || '#8B5CF6',
    },
  });

  const handleFormSubmit = (data: CreatePlotlineInput) => {
    onSubmit(data);
    reset();
  };

  const presetColors = [
    '#EF4444', // red
    '#F97316', // orange
    '#EAB308', // yellow
    '#22C55E', // green
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} placeholder="Main Plot, Romance, Mystery..." />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe this narrative thread..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {presetColors.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input
                    type="radio"
                    {...register('color')}
                    value={color}
                    className="sr-only"
                  />
                  <div
                    className="h-8 w-8 rounded-md border-2 border-transparent hover:border-foreground/50 transition-colors"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
            <input
              type="color"
              {...register('color')}
              className="h-8 w-8 rounded-md border cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Create Plotline'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
