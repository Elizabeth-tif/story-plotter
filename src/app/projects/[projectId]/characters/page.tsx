'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { Users, Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
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
import { useProjectStore, useCharacters } from '@/stores';
import { createCharacterSchema, type CreateCharacterInput } from '@/lib/validations';
import type { Character } from '@/types';

export default function CharactersPage() {
  const characters = useCharacters();
  const { addCharacter, updateCharacter, deleteCharacter } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState<Character | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredCharacters = characters.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCharacter = (data: CreateCharacterInput) => {
    const now = new Date().toISOString();
    const newCharacter: Character = {
      id: uuidv4(),
      name: data.name,
      role: data.role || '',
      age: data.age,
      description: data.description || '',
      relationships: [],
      metadata: {},
      color: data.color,
      tags: data.tags || [],
      order: characters.length,
      createdAt: now,
      updatedAt: now,
    };
    addCharacter(newCharacter);
    setIsCreateModalOpen(false);
  };

  const handleUpdateCharacter = (data: CreateCharacterInput) => {
    if (!editingCharacter) return;
    updateCharacter(editingCharacter.id, {
      name: data.name,
      role: data.role,
      age: data.age,
      description: data.description,
      color: data.color,
      tags: data.tags,
    });
    setEditingCharacter(null);
  };

  const handleDeleteCharacter = () => {
    if (!deletingCharacter) return;
    deleteCharacter(deletingCharacter.id);
    setDeletingCharacter(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Characters</h1>
          <p className="text-muted-foreground">
            {characters.length} {characters.length === 1 ? 'character' : 'characters'}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Character
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search characters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty State */}
      {filteredCharacters.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          {characters.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-2">No characters yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first character to start building your story
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Character
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">No characters found</h2>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </>
          )}
        </div>
      )}

      {/* Character Grid */}
      {filteredCharacters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              isMenuOpen={menuOpenId === character.id}
              onMenuToggle={() => setMenuOpenId(menuOpenId === character.id ? null : character.id)}
              onEdit={() => {
                setEditingCharacter(character);
                setMenuOpenId(null);
              }}
              onDelete={() => {
                setDeletingCharacter(character);
                setMenuOpenId(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CharacterFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCharacter}
        title="Create Character"
      />

      {/* Edit Modal */}
      <CharacterFormModal
        isOpen={!!editingCharacter}
        onClose={() => setEditingCharacter(null)}
        onSubmit={handleUpdateCharacter}
        title="Edit Character"
        defaultValues={editingCharacter || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingCharacter}
        onClose={() => setDeletingCharacter(null)}
        onConfirm={handleDeleteCharacter}
        title="Delete Character"
        description={`Are you sure you want to delete "${deletingCharacter?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

interface CharacterCardProps {
  character: Character;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CharacterCard({ character, isMenuOpen, onMenuToggle, onEdit, onDelete }: CharacterCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
            style={{ backgroundColor: character.color || '#6B7280' }}
          >
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              character.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle();
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={onMenuToggle} />
                <div className="absolute right-0 top-full mt-1 w-36 rounded-md border bg-card shadow-lg z-50">
                  <div className="p-1">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                      onClick={onEdit}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                      onClick={onDelete}
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
        <h3 className="font-semibold truncate">{character.name}</h3>
        {character.role && (
          <Badge variant="secondary" className="mt-1">
            {character.role}
          </Badge>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
          {character.description || 'No description'}
        </p>
        {character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {character.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted">
                {tag}
              </span>
            ))}
            {character.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{character.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CharacterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCharacterInput) => void;
  title: string;
  defaultValues?: Partial<Character>;
}

function CharacterFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  defaultValues,
}: CharacterFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCharacterInput>({
    resolver: zodResolver(createCharacterSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      role: defaultValues?.role || '',
      age: defaultValues?.age,
      description: defaultValues?.description || '',
      color: defaultValues?.color || '#6B7280',
      tags: defaultValues?.tags || [],
    },
  });

  const handleFormSubmit = (data: CreateCharacterInput) => {
    onSubmit(data);
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} placeholder="Character name" />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              {...register('role')}
              placeholder="Protagonist, Villain..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              {...register('age', { valueAsNumber: true })}
              placeholder="25"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of the character..."
            rows={3}
          />
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
            <Input {...register('color')} placeholder="#6B7280" className="flex-1" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Create Character'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
