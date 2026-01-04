'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { MapPin, Plus, Search, MoreVertical, Edit, Trash2, Grid, List } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardContent,
  Modal,
  Label,
  Textarea,
  ConfirmModal,
} from '@/components/ui';
import { useProjectStore, useLocations, useScenes } from '@/stores';
import { createLocationSchema, type CreateLocationInput } from '@/lib/validations';
import type { Location } from '@/types';

export default function LocationsPage() {
  const locations = useLocations();
  const scenes = useScenes();
  const { addLocation, updateLocation, deleteLocation } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredLocations = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateLocation = (data: CreateLocationInput) => {
    const now = new Date().toISOString();
    const newLocation: Location = {
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      imageUrl: data.imageUrl,
      images: [],
      color: data.color || '#10B981',
      tags: data.tags || [],
      attachments: [],
      metadata: {},
      order: locations.length,
      createdAt: now,
      updatedAt: now,
    };
    addLocation(newLocation);
    setIsCreateModalOpen(false);
  };

  const handleUpdateLocation = (data: CreateLocationInput) => {
    if (!editingLocation) return;
    updateLocation(editingLocation.id, {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      color: data.color,
      tags: data.tags,
    });
    setEditingLocation(null);
  };

  const handleDeleteLocation = () => {
    if (!deletingLocation) return;
    deleteLocation(deletingLocation.id);
    setDeletingLocation(null);
  };

  // Count scenes per location
  const getSceneCount = (locationName: string) => {
    return scenes.filter(
      (s) => s.location?.toLowerCase() === locationName.toLowerCase()
    ).length;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted-foreground">
            {locations.length} {locations.length === 1 ? 'location' : 'locations'}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex rounded-lg border bg-muted/50 p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 px-3"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredLocations.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          {locations.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-2">No locations yet</h2>
              <p className="text-muted-foreground mb-6">
                Add locations where your story takes place
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Location
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">No locations found</h2>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </>
          )}
        </div>
      )}

      {/* Grid View */}
      {filteredLocations.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLocations.map((location) => {
            const sceneCount = getSceneCount(location.name);

            return (
              <Card
                key={location.id}
                className="hover:border-primary/50 transition-colors group overflow-hidden"
              >
                {location.imageUrl ? (
                  <div className="aspect-video relative bg-muted">
                    <img
                      src={location.imageUrl}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <h3 className="absolute bottom-2 left-3 right-3 font-semibold text-white truncate">
                      {location.name}
                    </h3>
                  </div>
                ) : (
                  <div
                    className="aspect-video flex items-center justify-center"
                    style={{ backgroundColor: location.color + '20' }}
                  >
                    <MapPin
                      className="h-12 w-12"
                      style={{ color: location.color }}
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  {!location.imageUrl && (
                    <h3 className="font-semibold truncate mb-1">{location.name}</h3>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                    {location.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
                    </span>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === location.id ? null : location.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {menuOpenId === location.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-0 bottom-full mb-1 w-36 rounded-md border bg-card shadow-lg z-50">
                            <div className="p-1">
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                                onClick={() => {
                                  setEditingLocation(location);
                                  setMenuOpenId(null);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                                onClick={() => {
                                  setDeletingLocation(location);
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

      {/* List View */}
      {filteredLocations.length > 0 && viewMode === 'list' && (
        <div className="space-y-2">
          {filteredLocations.map((location) => {
            const sceneCount = getSceneCount(location.name);

            return (
              <Card
                key={location.id}
                className="hover:border-primary/50 transition-colors group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {location.imageUrl ? (
                      <img
                        src={location.imageUrl}
                        alt={location.name}
                        className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: location.color + '20' }}
                      >
                        <MapPin className="h-6 w-6" style={{ color: location.color }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{location.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {location.description || 'No description'}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground flex-shrink-0">
                      {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
                    </span>
                    <div className="relative flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === location.id ? null : location.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {menuOpenId === location.id && (
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
                                  setEditingLocation(location);
                                  setMenuOpenId(null);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                                onClick={() => {
                                  setDeletingLocation(location);
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
      <LocationFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateLocation}
        title="Create Location"
      />

      {/* Edit Modal */}
      <LocationFormModal
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        onSubmit={handleUpdateLocation}
        title="Edit Location"
        defaultValues={editingLocation || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingLocation}
        onClose={() => setDeletingLocation(null)}
        onConfirm={handleDeleteLocation}
        title="Delete Location"
        description={`Are you sure you want to delete "${deletingLocation?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLocationInput) => void;
  title: string;
  defaultValues?: Partial<Location>;
}

function LocationFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  defaultValues,
}: LocationFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLocationInput>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      imageUrl: defaultValues?.imageUrl || '',
      color: defaultValues?.color || '#10B981',
      tags: defaultValues?.tags || [],
    },
  });

  const handleFormSubmit = (data: CreateLocationInput) => {
    onSubmit(data);
    reset();
  };

  const presetColors = [
    '#10B981', // emerald
    '#14B8A6', // teal
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#F97316', // orange
    '#EAB308', // yellow
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} placeholder="Forest, Castle, Village..." />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe this location..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            {...register('imageUrl')}
            placeholder="https://example.com/image.jpg"
            type="url"
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
            {defaultValues ? 'Save Changes' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
