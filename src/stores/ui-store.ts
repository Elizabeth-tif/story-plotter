import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type View = 'timeline' | 'characters' | 'scenes' | 'plotlines' | 'locations' | 'notes' | 'settings';
type SidebarState = 'expanded' | 'collapsed';

interface UIState {
  // Sidebar
  sidebarState: SidebarState;
  toggleSidebar: () => void;
  setSidebarState: (state: SidebarState) => void;
  
  // Current view
  currentView: View;
  setCurrentView: (view: View) => void;
  
  // Selected items
  selectedCharacterId: string | null;
  selectedSceneId: string | null;
  selectedPlotlineId: string | null;
  selectedLocationId: string | null;
  selectedNoteId: string | null;
  
  setSelectedCharacter: (id: string | null) => void;
  setSelectedScene: (id: string | null) => void;
  setSelectedPlotline: (id: string | null) => void;
  setSelectedLocation: (id: string | null) => void;
  setSelectedNote: (id: string | null) => void;
  clearAllSelections: () => void;
  
  // Modals
  isCreateCharacterModalOpen: boolean;
  isCreateSceneModalOpen: boolean;
  isCreatePlotlineModalOpen: boolean;
  isCreateLocationModalOpen: boolean;
  isCreateNoteModalOpen: boolean;
  isCreateProjectModalOpen: boolean;
  isConflictModalOpen: boolean;
  isDeleteConfirmModalOpen: boolean;
  isExportModalOpen: boolean;
  isVersionHistoryModalOpen: boolean;
  
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
  closeAllModals: () => void;
  
  // Delete confirmation
  deleteTarget: { type: string; id: string; name: string } | null;
  setDeleteTarget: (target: { type: string; id: string; name: string } | null) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  toggleSearch: () => void;
  
  // View preferences
  projectListView: 'grid' | 'list';
  setProjectListView: (view: 'grid' | 'list') => void;
  
  // Sort preferences
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Filter preferences
  filters: Record<string, string[]>;
  setFilter: (key: string, values: string[]) => void;
  clearFilters: () => void;
}

type ModalType = 
  | 'createCharacter' 
  | 'createScene' 
  | 'createPlotline' 
  | 'createLocation' 
  | 'createNote'
  | 'createProject'
  | 'conflict'
  | 'deleteConfirm'
  | 'export'
  | 'versionHistory';

const modalKeyMap: Record<ModalType, keyof UIState> = {
  createCharacter: 'isCreateCharacterModalOpen',
  createScene: 'isCreateSceneModalOpen',
  createPlotline: 'isCreatePlotlineModalOpen',
  createLocation: 'isCreateLocationModalOpen',
  createNote: 'isCreateNoteModalOpen',
  createProject: 'isCreateProjectModalOpen',
  conflict: 'isConflictModalOpen',
  deleteConfirm: 'isDeleteConfirmModalOpen',
  export: 'isExportModalOpen',
  versionHistory: 'isVersionHistoryModalOpen',
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarState: 'expanded',
      toggleSidebar: () => set((state) => ({ 
        sidebarState: state.sidebarState === 'expanded' ? 'collapsed' : 'expanded' 
      })),
      setSidebarState: (sidebarState) => set({ sidebarState }),
      
      // Current view
      currentView: 'timeline',
      setCurrentView: (currentView) => set({ currentView }),
      
      // Selected items
      selectedCharacterId: null,
      selectedSceneId: null,
      selectedPlotlineId: null,
      selectedLocationId: null,
      selectedNoteId: null,
      
      setSelectedCharacter: (id) => set({ selectedCharacterId: id }),
      setSelectedScene: (id) => set({ selectedSceneId: id }),
      setSelectedPlotline: (id) => set({ selectedPlotlineId: id }),
      setSelectedLocation: (id) => set({ selectedLocationId: id }),
      setSelectedNote: (id) => set({ selectedNoteId: id }),
      clearAllSelections: () => set({
        selectedCharacterId: null,
        selectedSceneId: null,
        selectedPlotlineId: null,
        selectedLocationId: null,
        selectedNoteId: null,
      }),
      
      // Modals
      isCreateCharacterModalOpen: false,
      isCreateSceneModalOpen: false,
      isCreatePlotlineModalOpen: false,
      isCreateLocationModalOpen: false,
      isCreateNoteModalOpen: false,
      isCreateProjectModalOpen: false,
      isConflictModalOpen: false,
      isDeleteConfirmModalOpen: false,
      isExportModalOpen: false,
      isVersionHistoryModalOpen: false,
      
      openModal: (modal) => set({ [modalKeyMap[modal]]: true }),
      closeModal: (modal) => set({ [modalKeyMap[modal]]: false }),
      closeAllModals: () => set({
        isCreateCharacterModalOpen: false,
        isCreateSceneModalOpen: false,
        isCreatePlotlineModalOpen: false,
        isCreateLocationModalOpen: false,
        isCreateNoteModalOpen: false,
        isCreateProjectModalOpen: false,
        isConflictModalOpen: false,
        isDeleteConfirmModalOpen: false,
        isExportModalOpen: false,
        isVersionHistoryModalOpen: false,
      }),
      
      // Delete confirmation
      deleteTarget: null,
      setDeleteTarget: (deleteTarget) => set({ deleteTarget }),
      
      // Search
      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      isSearchOpen: false,
      toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
      
      // View preferences
      projectListView: 'grid',
      setProjectListView: (projectListView) => set({ projectListView }),
      
      // Sort preferences
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      
      // Filter preferences
      filters: {},
      setFilter: (key, values) => set((state) => ({
        filters: { ...state.filters, [key]: values }
      })),
      clearFilters: () => set({ filters: {} }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarState: state.sidebarState,
        projectListView: state.projectListView,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
