import React, { createContext, useContext, useState, useCallback } from 'react';

interface GenerationTask {
  id: string;
  menuName: string;
  startedAt: number;
}

interface GenerationContextType {
  activeTasks: GenerationTask[];
  isGenerating: boolean;
  startGenerating: (menuName: string) => string; // returns task ID
  stopGenerating: (taskId: string) => void;
  clearAllTasks: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export const GenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTasks, setActiveTasks] = useState<GenerationTask[]>([]);

  const startGenerating = useCallback((menuName: string): string => {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task: GenerationTask = {
      id: taskId,
      menuName,
      startedAt: Date.now(),
    };
    setActiveTasks(prev => [...prev, task]);
    return taskId;
  }, []);

  const stopGenerating = useCallback((taskId: string) => {
    setActiveTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const clearAllTasks = useCallback(() => {
    setActiveTasks([]);
  }, []);

  const isGenerating = activeTasks.length > 0;

  return (
    <GenerationContext.Provider value={{ activeTasks, isGenerating, startGenerating, stopGenerating, clearAllTasks }}>
      {children}
    </GenerationContext.Provider>
  );
};

export const useGeneration = (): GenerationContextType => {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
};
