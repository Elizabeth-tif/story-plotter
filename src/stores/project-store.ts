import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  Project, 
  Character, 
  Scene, 
  Plotline, 
  Location, 
  Note,
  Timeline,
  TimelineEvent,
  StoryBranch,
} from '@/types';

interface ProjectState {
  // Current project data
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Dirty state tracking
  isDirty: boolean;
  lastSavedAt: string | null;
  lastKnownTimestamp: string | null;
  
  // Auto-save state
  isSaving: boolean;
  saveError: string | null;
  
  // Actions - Project
  setProject: (project: Project | null) => void;
  updateProjectMeta: (updates: Partial<Pick<Project, 'title' | 'description' | 'genre' | 'settings'>>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Save state
  markDirty: () => void;
  markClean: (timestamp: string, version?: number) => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
  setLastKnownTimestamp: (timestamp: string) => void;
  
  // Actions - Characters
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  reorderCharacters: (orderedIds: string[]) => void;
  
  // Actions - Scenes
  addScene: (scene: Scene) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  reorderScenes: (orderedIds: string[]) => void;
  
  // Actions - Plotlines
  addPlotline: (plotline: Plotline) => void;
  updatePlotline: (id: string, updates: Partial<Plotline>) => void;
  deletePlotline: (id: string) => void;
  reorderPlotlines: (orderedIds: string[]) => void;
  
  // Actions - Locations
  addLocation: (location: Location) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  reorderLocations: (orderedIds: string[]) => void;
  
  // Actions - Notes
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  
  // Actions - Branches
  addBranch: (branch: StoryBranch) => void;
  updateBranch: (id: string, updates: Partial<Omit<StoryBranch, 'scenes'>>) => void;
  deleteBranch: (id: string) => void;
  addSceneToBranch: (branchId: string, scene: Scene) => void;
  updateBranchScene: (branchId: string, sceneId: string, updates: Partial<Scene>) => void;
  deleteBranchScene: (branchId: string, sceneId: string) => void;
  reorderBranchScenes: (branchId: string, orderedIds: string[]) => void;

  // Actions - Timeline
  updateTimeline: (timeline: Timeline) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (id: string) => void;
  reorderTimeline: (orderedSceneIds: string[]) => void;
  
  // Computed
  getCharacterById: (id: string) => Character | undefined;
  getSceneById: (id: string) => Scene | undefined;
  getPlotlineById: (id: string) => Plotline | undefined;
  getLocationById: (id: string) => Location | undefined;
  getNoteById: (id: string) => Note | undefined;
  getTotalWordCount: () => number;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    project: null,
    isLoading: false,
    error: null,
    isDirty: false,
    lastSavedAt: null,
    lastKnownTimestamp: null,
    isSaving: false,
    saveError: null,
    
    // Project actions
    setProject: (project) => set({ 
      project, 
      isDirty: false, 
      error: null,
      lastKnownTimestamp: project?.updatedAt ?? null
    }),
    
    updateProjectMeta: (updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: { ...state.project, ...updates },
        isDirty: true,
      };
    }),
    
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    
    // Save state actions
    markDirty: () => set({ isDirty: true }),
    markClean: (timestamp, version) => set((state) => ({ 
      isDirty: false, 
      lastSavedAt: timestamp,
      lastKnownTimestamp: timestamp,
      // CRITICAL: Update project's updatedAt and version to match server
      project: state.project ? { 
        ...state.project, 
        updatedAt: timestamp,
        ...(version !== undefined && { version }),
      } : null,
    })),
    setSaving: (isSaving) => set({ isSaving }),
    setSaveError: (saveError) => set({ saveError }),
    setLastKnownTimestamp: (timestamp) => set({ lastKnownTimestamp: timestamp }),
    
    // Character actions
    addCharacter: (character) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          characters: [...state.project.characters, character],
        },
        isDirty: true,
      };
    }),
    
    updateCharacter: (id, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          characters: state.project.characters.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        },
        isDirty: true,
      };
    }),
    
    deleteCharacter: (id) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          characters: state.project.characters.filter((c) => c.id !== id),
        },
        isDirty: true,
      };
    }),
    
    reorderCharacters: (orderedIds) => set((state) => {
      if (!state.project) return state;
      const characterMap = new Map(state.project.characters.map((c) => [c.id, c]));
      const reordered = orderedIds
        .map((id, index) => {
          const char = characterMap.get(id);
          return char ? { ...char, order: index } : null;
        })
        .filter((c): c is Character => c !== null);
      
      return {
        project: { ...state.project, characters: reordered },
        isDirty: true,
      };
    }),
    
    // Scene actions
    addScene: (scene) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          scenes: [...state.project.scenes, scene],
        },
        isDirty: true,
      };
    }),
    
    updateScene: (id, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          scenes: state.project.scenes.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        },
        isDirty: true,
      };
    }),
    
    deleteScene: (id) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          scenes: state.project.scenes.filter((s) => s.id !== id),
          timeline: {
            ...state.project.timeline,
            events: state.project.timeline.events.filter((e) => e.sceneId !== id),
          },
        },
        isDirty: true,
      };
    }),
    
    reorderScenes: (orderedIds) => set((state) => {
      if (!state.project) return state;
      const sceneMap = new Map(state.project.scenes.map((s) => [s.id, s]));
      const reordered = orderedIds
        .map((id, index) => {
          const scene = sceneMap.get(id);
          return scene ? { ...scene, order: index } : null;
        })
        .filter((s): s is Scene => s !== null);
      
      return {
        project: { ...state.project, scenes: reordered },
        isDirty: true,
      };
    }),
    
    // Plotline actions
    addPlotline: (plotline) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          plotlines: [...state.project.plotlines, plotline],
        },
        isDirty: true,
      };
    }),
    
    updatePlotline: (id, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          plotlines: state.project.plotlines.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        },
        isDirty: true,
      };
    }),
    
    deletePlotline: (id) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          plotlines: state.project.plotlines.filter((p) => p.id !== id),
          timeline: {
            ...state.project.timeline,
            events: state.project.timeline.events.map((e) =>
              e.plotlineId === id ? { ...e, plotlineId: undefined } : e
            ),
          },
        },
        isDirty: true,
      };
    }),
    
    reorderPlotlines: (orderedIds) => set((state) => {
      if (!state.project) return state;
      const plotlineMap = new Map(state.project.plotlines.map((p) => [p.id, p]));
      const reordered = orderedIds
        .map((id, index) => {
          const plotline = plotlineMap.get(id);
          return plotline ? { ...plotline, order: index } : null;
        })
        .filter((p): p is Plotline => p !== null);
      
      return {
        project: { ...state.project, plotlines: reordered },
        isDirty: true,
      };
    }),
    
    // Location actions
    addLocation: (location) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          locations: [...state.project.locations, location],
        },
        isDirty: true,
      };
    }),
    
    updateLocation: (id, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          locations: state.project.locations.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        },
        isDirty: true,
      };
    }),
    
    deleteLocation: (id) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          locations: state.project.locations.filter((l) => l.id !== id),
        },
        isDirty: true,
      };
    }),
    
    reorderLocations: (orderedIds) => set((state) => {
      if (!state.project) return state;
      const locationMap = new Map(state.project.locations.map((l) => [l.id, l]));
      const reordered = orderedIds
        .map((id, index) => {
          const location = locationMap.get(id);
          return location ? { ...location, order: index } : null;
        })
        .filter((l): l is Location => l !== null);
      
      return {
        project: { ...state.project, locations: reordered },
        isDirty: true,
      };
    }),
    
    // Note actions
    addNote: (note) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          notes: [...state.project.notes, note],
        },
        isDirty: true,
      };
    }),
    
    updateNote: (id, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          notes: state.project.notes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
          ),
        },
        isDirty: true,
      };
    }),
    
    deleteNote: (id) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          notes: state.project.notes.filter((n) => n.id !== id),
        },
        isDirty: true,
      };
    }),
    
    // Branch actions
    addBranch: (branch) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          branches: [...(state.project.branches ?? []), branch],
        },
        isDirty: true,
      };
    }),

    updateBranch: (id, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          branches: (state.project.branches ?? []).map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          ),
        },
        isDirty: true,
      };
    }),

    deleteBranch: (id) => set((state) => {
      if (!state.project) return state;
      // Cascade-delete all descendants
      const toDelete = new Set<string>();
      const collect = (branchId: string) => {
        toDelete.add(branchId);
        for (const b of state.project!.branches ?? []) {
          if (b.parentBranchId === branchId) collect(b.id);
        }
      };
      collect(id);
      return {
        project: {
          ...state.project,
          branches: (state.project.branches ?? []).filter((b) => !toDelete.has(b.id)),
        },
        isDirty: true,
      };
    }),

    addSceneToBranch: (branchId, scene) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          branches: (state.project.branches ?? []).map((b) =>
            b.id === branchId
              ? { ...b, scenes: [...b.scenes, scene], updatedAt: new Date().toISOString() }
              : b
          ),
        },
        isDirty: true,
      };
    }),

    updateBranchScene: (branchId, sceneId, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          branches: (state.project.branches ?? []).map((b) =>
            b.id === branchId
              ? {
                  ...b,
                  scenes: b.scenes.map((s) =>
                    s.id === sceneId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        },
        isDirty: true,
      };
    }),

    deleteBranchScene: (branchId, sceneId) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          branches: (state.project.branches ?? []).map((b) =>
            b.id === branchId
              ? {
                  ...b,
                  scenes: b.scenes.filter((s) => s.id !== sceneId),
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        },
        isDirty: true,
      };
    }),

    reorderBranchScenes: (branchId, orderedIds) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          branches: (state.project.branches ?? []).map((b) => {
            if (b.id !== branchId) return b;
            const sceneMap = new Map(b.scenes.map((s) => [s.id, s]));
            const reordered = orderedIds
              .map((id, index) => {
                const scene = sceneMap.get(id);
                return scene ? { ...scene, order: index } : null;
              })
              .filter((s): s is Scene => s !== null);
            return { ...b, scenes: reordered, updatedAt: new Date().toISOString() };
          }),
        },
        isDirty: true,
      };
    }),

    // Timeline actions
    updateTimeline: (timeline) => set((state) => {
      if (!state.project) return state;
      return {
        project: { ...state.project, timeline },
        isDirty: true,
      };
    }),
    
    addTimelineEvent: (event) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            events: [...state.project.timeline.events, event],
          },
        },
        isDirty: true,
      };
    }),
    
    updateTimelineEvent: (id, updates) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            events: state.project.timeline.events.map((e) =>
              e.id === id ? { ...e, ...updates } : e
            ),
          },
        },
        isDirty: true,
      };
    }),
    
    deleteTimelineEvent: (id) => set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            events: state.project.timeline.events.filter((e) => e.id !== id),
          },
        },
        isDirty: true,
      };
    }),

    reorderTimeline: (orderedSceneIds) => set((state) => {
      if (!state.project) return state;
      // Update timelinePosition on each scene based on new order
      const positionMap = new Map(orderedSceneIds.map((id, index) => [id, index]));
      const updatedScenes = state.project.scenes.map((scene) => {
        const newPos = positionMap.get(scene.id);
        if (newPos !== undefined) {
          return { ...scene, timelinePosition: newPos };
        }
        return scene;
      });
      // Re-order the events array to match new positions
      const updatedEvents = [...state.project.timeline.events].sort((a, b) => {
        const posA = positionMap.get(a.sceneId) ?? Infinity;
        const posB = positionMap.get(b.sceneId) ?? Infinity;
        return posA - posB;
      }).map((e, index) => ({ ...e, position: index }));
      return {
        project: {
          ...state.project,
          scenes: updatedScenes,
          timeline: { ...state.project.timeline, events: updatedEvents },
        },
        isDirty: true,
      };
    }),
    
    // Computed getters
    getCharacterById: (id) => get().project?.characters.find((c) => c.id === id),
    getSceneById: (id) => get().project?.scenes.find((s) => s.id === id),
    getPlotlineById: (id) => get().project?.plotlines.find((p) => p.id === id),
    getLocationById: (id) => get().project?.locations.find((l) => l.id === id),
    getNoteById: (id) => get().project?.notes.find((n) => n.id === id),
    getTotalWordCount: () => 
      get().project?.scenes.reduce((sum, scene) => sum + scene.wordCount, 0) ?? 0,
  }))
);

// Selector hooks for optimized re-renders
export const useCharacters = () => useProjectStore((state) => state.project?.characters ?? []);
export const useScenes = () => useProjectStore((state) => state.project?.scenes ?? []);
export const usePlotlines = () => useProjectStore((state) => state.project?.plotlines ?? []);
export const useLocations = () => useProjectStore((state) => state.project?.locations ?? []);
export const useNotes = () => useProjectStore((state) => state.project?.notes ?? []);
export const useTimeline = () => useProjectStore((state) => state.project?.timeline);
export const useBranches = () => useProjectStore((state) => state.project?.branches ?? []);
export const useProjectMeta = () => useProjectStore((state) => 
  state.project ? {
    id: state.project.id,
    title: state.project.title,
    description: state.project.description,
    genre: state.project.genre,
    settings: state.project.settings,
  } : null
);
