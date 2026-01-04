'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { StickyNote, Plus, Search, MoreVertical, Edit, Trash2, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
import { useProjectStore, useNotes } from '@/stores';
import { createNoteSchema, type CreateNoteInput } from '@/lib/validations';
import type { Note } from '@/types';

export default function NotesPage() {
  const notes = useNotes();
  const { addNote, updateNote, deleteNote } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'All Notes' },
    { value: 'general', label: 'General' },
    { value: 'world-building', label: 'World Building' },
    { value: 'research', label: 'Research' },
    { value: 'character', label: 'Character' },
    { value: 'plot', label: 'Plot' },
  ];

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === 'all' || n.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort: pinned first, then by updated date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleCreateNote = (data: CreateNoteInput) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      title: data.title,
      content: data.content || '',
      category: data.category || 'general',
      color: data.color,
      isPinned: false,
      tags: data.tags || [],
      attachments: [],
      linkedEntities: [],
      createdAt: now,
      updatedAt: now,
    };
    addNote(newNote);
    setIsCreateModalOpen(false);
  };

  const handleUpdateNote = (data: CreateNoteInput) => {
    if (!editingNote) return;
    updateNote(editingNote.id, {
      title: data.title,
      content: data.content,
      category: data.category,
      color: data.color,
      tags: data.tags,
    });
    setEditingNote(null);
  };

  const handleTogglePin = (note: Note) => {
    updateNote(note.id, { isPinned: !note.isPinned });
    setMenuOpenId(null);
  };

  const handleDeleteNote = () => {
    if (!deletingNote) return;
    deleteNote(deletingNote.id);
    setDeletingNote(null);
  };

  const getCategoryLabel = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat?.label || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: '#6B7280',
      'world-building': '#8B5CF6',
      research: '#3B82F6',
      character: '#EC4899',
      plot: '#F97316',
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-muted-foreground">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} •{' '}
            {notes.filter((n) => n.isPinned).length} pinned
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={filterCategory === cat.value ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {sortedNotes.length === 0 && (
        <div className="text-center py-12">
          <StickyNote className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          {notes.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-2">No notes yet</h2>
              <p className="text-muted-foreground mb-6">
                Keep track of ideas, research, and world-building details
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Note
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">No notes found</h2>
              <p className="text-muted-foreground">Try adjusting your search or filter</p>
            </>
          )}
        </div>
      )}

      {/* Notes Grid */}
      {sortedNotes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedNotes.map((note) => (
            <Card
              key={note.id}
              className={`hover:border-primary/50 transition-colors group ${
                note.isPinned ? 'ring-2 ring-amber-400/50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {note.isPinned && (
                      <Pin className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold truncate">{note.title}</h3>
                  </div>
                  <div className="relative flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === note.id ? null : note.id);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {menuOpenId === note.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-36 rounded-md border bg-card shadow-lg z-50">
                          <div className="p-1">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                              onClick={() => handleTogglePin(note)}
                            >
                              <Pin className="h-4 w-4" />
                              {note.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                              onClick={() => {
                                setEditingNote(note);
                                setMenuOpenId(null);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                              onClick={() => {
                                setDeletingNote(note);
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

                <p className="text-sm text-muted-foreground line-clamp-4 mb-3 min-h-[4.5rem]">
                  {note.content || 'No content'}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: getCategoryColor(note.category) + '20',
                      color: getCategoryColor(note.category),
                    }}
                  >
                    {getCategoryLabel(note.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <NoteFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateNote}
        title="Create Note"
        categories={categories.filter((c) => c.value !== 'all')}
      />

      {/* Edit Modal */}
      <NoteFormModal
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        onSubmit={handleUpdateNote}
        title="Edit Note"
        categories={categories.filter((c) => c.value !== 'all')}
        defaultValues={editingNote || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingNote}
        onClose={() => setDeletingNote(null)}
        onConfirm={handleDeleteNote}
        title="Delete Note"
        description={`Are you sure you want to delete "${deletingNote?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateNoteInput) => void;
  title: string;
  categories: { value: string; label: string }[];
  defaultValues?: Partial<Note>;
}

function NoteFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  categories,
  defaultValues,
}: NoteFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      content: defaultValues?.content || '',
      category: defaultValues?.category || 'general',
      color: defaultValues?.color || '#6B7280',
      tags: defaultValues?.tags || [],
    },
  });

  const handleFormSubmit = (data: CreateNoteInput) => {
    onSubmit(data);
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" {...register('title')} placeholder="Note title" />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            {...register('content')}
            placeholder="Write your note here..."
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            {...register('category')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Create Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
