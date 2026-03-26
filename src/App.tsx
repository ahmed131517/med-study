/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, BookOpen, Trash2, Moon, Sun, User, Plus, Layout, FolderPlus, GripVertical, Edit2, Check, X, AlertCircle, Play, Pause, RotateCcw, Timer, CheckCircle2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Feature {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

interface Day {
  id: number;
  day: number | string;
  title: string;
  done: boolean;
  notes: Record<string, string>;
  featureLabels?: Record<string, string>;
  hiddenFeatures?: string[];
  customFeatures?: { id: string; label: string; icon: string }[];
  completedFeatures?: string[];
}

type ViewMode = 'study' | 'settings';

const DEFAULT_FEATURES: Feature[] = [
  { id: 'lecture', label: 'Lecture Notes', icon: '📚', enabled: true },
  { id: 'summary', label: 'Summary', icon: '🧠', enabled: true },
  { id: 'case', label: 'Clinical Case', icon: '🩺', enabled: true },
  { id: 'treatment', label: 'Treatment Plan', icon: '💊', enabled: true },
  { id: 'redFlags', label: 'Red Flags', icon: '❗', enabled: true },
];

const INITIAL_FOLDERS = ["Endocrine", "Cardiology", "ICU", "Revision"];

const generateStructuredDays = (folders: string[]): Record<string, Day[]> => {
  const data: Record<string, Day[]> = {};
  folders.forEach(f => data[f] = []);

  for (let i = 1; i <= 300; i++) {
    let folder = "Revision";
    if (i <= 50) folder = "Endocrine";
    else if (i <= 120) folder = "Cardiology";
    else if (i <= 200) folder = "ICU";

    if (data[folder]) {
      data[folder].push({
        id: i,
        day: i,
        title: `Day ${i} - Add Topic`,
        done: false,
        notes: {
          lecture: "",
          summary: "",
          case: "",
          treatment: "",
          redFlags: ""
        }
      });
    }
  }

  return data;
};

const loadSavedState = () => {
  try {
    const saved = localStorage.getItem('studyHubState');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return null;
};

export default function StudySystem() {
  const savedState = loadSavedState();

  const [folders, setFolders] = useState<string[]>(savedState?.folders || INITIAL_FOLDERS);
  const [features, setFeatures] = useState<Feature[]>(savedState?.features || DEFAULT_FEATURES);
  const [data, setData] = useState<Record<string, Day[]>>(savedState?.data || generateStructuredDays(INITIAL_FOLDERS));
  const [activeFolder, setActiveFolder] = useState(savedState?.folders?.[0] || "Endocrine");
  const [viewMode, setViewMode] = useState<ViewMode>('study');
  
  // Settings State
  const [userName, setUserName] = useState(savedState?.userName || "Medical Student");
  const [isDarkMode, setIsDarkMode] = useState(savedState?.isDarkMode || false);
  const [dailyGoal, setDailyGoal] = useState(savedState?.dailyGoal || 1);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [featureRenameValue, setFeatureRenameValue] = useState("");
  const [newFeatureName, setNewFeatureName] = useState("");
  
  // Card Feature Edit State
  const [editingCardFeature, setEditingCardFeature] = useState<{cardId: number, featureId: string} | null>(null);
  const [cardFeatureRenameValue, setCardFeatureRenameValue] = useState("");
  const [addingFeatureToCard, setAddingFeatureToCard] = useState<number | null>(null);
  const [newCardFeatureName, setNewCardFeatureName] = useState("");

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Timer state
  const [studyTime, setStudyTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(savedState?.timerDuration || 25); // Default 25 minutes
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'countdown'>(savedState?.timerMode || 'stopwatch');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive) {
      interval = setInterval(() => {
        setStudyTime((prev) => {
          if (timerMode === 'countdown') {
            if (prev <= 1) {
              setIsTimerActive(false);
              toast.success("Timer finished!");
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerMode]);

  // Reset timer when mode or duration changes
  useEffect(() => {
    if (timerMode === 'countdown') {
      setStudyTime(timerDuration * 60);
    } else {
      setStudyTime(0);
    }
    setIsTimerActive(false);
  }, [timerMode, timerDuration]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auto-save
  useEffect(() => {
    const appState = {
      folders,
      features,
      data,
      userName,
      isDarkMode,
      dailyGoal,
      timerDuration,
      timerMode
    };
    localStorage.setItem('studyHubState', JSON.stringify(appState));
  }, [folders, features, data, userName, isDarkMode, dailyGoal, timerDuration, timerMode]);

  const saveChanges = () => {
    const appState = {
      folders,
      features,
      data,
      userName,
      isDarkMode,
      dailyGoal,
      timerDuration,
      timerMode
    };
    localStorage.setItem('studyHubState', JSON.stringify(appState));
    toast.success("Changes saved successfully!");
  };

  const updateDay = (index: number, field: string, value: string) => {
    const updated = { ...data };
    if (field === 'title') {
      updated[activeFolder][index].title = value;
    } else if (field === 'day') {
      updated[activeFolder][index].day = value;
    } else {
      updated[activeFolder][index].notes[field] = value;
    }
    setData(updated);
  };

  const toggleDone = (index: number) => {
    const updated = { ...data };
    updated[activeFolder][index].done = !updated[activeFolder][index].done;
    setData(updated);
  };

  const resetProgress = () => {
    const updated = { ...data };
    Object.keys(updated).forEach(folder => {
      updated[folder] = updated[folder].map(day => ({ ...day, done: false }));
    });
    setData(updated);
    toast.success("All progress has been reset.");
  };

  const addFolder = () => {
    if (!newFolderName.trim()) return;
    if (folders.includes(newFolderName.trim())) {
      toast.error("Folder already exists!");
      return;
    }
    const name = newFolderName.trim();
    setFolders([...folders, name]);
    setData({ ...data, [name]: [] });
    setNewFolderName("");
    toast.success(`Folder "${name}" created.`);
  };

  const deleteFolder = (folderName: string) => {
    if (folders.length <= 1) {
      toast.error("You must have at least one folder.");
      return;
    }
    const newFolders = folders.filter(f => f !== folderName);
    setFolders(newFolders);
    const newData = { ...data };
    delete newData[folderName];
    setData(newData);
    if (activeFolder === folderName) {
      setActiveFolder(newFolders[0]);
    }
    toast.success(`Folder "${folderName}" deleted.`);
  };

  const startRenaming = (folder: string) => {
    setEditingFolder(folder);
    setRenameValue(folder);
  };

  const cancelRenaming = () => {
    setEditingFolder(null);
    setRenameValue("");
  };

  const saveRename = (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      cancelRenaming();
      return;
    }
    if (folders.includes(newName)) {
      toast.error("A folder with this name already exists!");
      return;
    }

    const newFolders = folders.map(f => f === oldName ? newName : f);
    setFolders(newFolders);

    const newData = { ...data };
    newData[newName] = newData[oldName];
    delete newData[oldName];
    setData(newData);

    if (activeFolder === oldName) {
      setActiveFolder(newName);
    }
    setEditingFolder(null);
    toast.success(`Folder renamed to "${newName}".`);
  };

  const toggleFeature = (id: string) => {
    setFeatures(features.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const startFeatureRenaming = (id: string, currentLabel: string) => {
    setEditingFeatureId(id);
    setFeatureRenameValue(currentLabel);
  };

  const cancelFeatureRenaming = () => {
    setEditingFeatureId(null);
    setFeatureRenameValue("");
  };

  const saveFeatureRename = (id: string) => {
    const newLabel = featureRenameValue.trim();
    if (!newLabel) {
      cancelFeatureRenaming();
      return;
    }
    setFeatures(features.map(f => f.id === id ? { ...f, label: newLabel } : f));
    setEditingFeatureId(null);
    toast.success(`Feature renamed to "${newLabel}".`);
  };

  const startCardFeatureRenaming = (cardId: number, featureId: string, currentLabel: string) => {
    setEditingCardFeature({ cardId, featureId });
    setCardFeatureRenameValue(currentLabel);
  };

  const cancelCardFeatureRenaming = () => {
    setEditingCardFeature(null);
    setCardFeatureRenameValue("");
  };

  const saveCardFeatureRename = (cardIndex: number, cardId: number, featureId: string) => {
    const newLabel = cardFeatureRenameValue.trim();
    if (!newLabel) {
      cancelCardFeatureRenaming();
      return;
    }
    
    const updated = { ...data };
    const dayToUpdate = updated[activeFolder][cardIndex];
    if (!dayToUpdate.featureLabels) {
      dayToUpdate.featureLabels = {};
    }
    dayToUpdate.featureLabels[featureId] = newLabel;
    
    setData(updated);
    setEditingCardFeature(null);
  };

  const hideCardFeature = (cardIndex: number, featureId: string) => {
    const updated = { ...data };
    const dayToUpdate = updated[activeFolder][cardIndex];
    
    if (featureId.startsWith('custom-')) {
      dayToUpdate.customFeatures = dayToUpdate.customFeatures?.filter(f => f.id !== featureId);
      toast.success("Custom feature removed.");
    } else {
      if (!dayToUpdate.hiddenFeatures) {
        dayToUpdate.hiddenFeatures = [];
      }
      dayToUpdate.hiddenFeatures.push(featureId);
      toast.success("Feature hidden for this card.");
    }
    setData(updated);
  };

  const handleAddCustomFeature = (cardIndex: number, cardId: number) => {
    const name = newCardFeatureName.trim();
    if (!name) return;

    const newFeature = {
      id: `custom-${Date.now()}`,
      label: name,
      icon: '📝'
    };

    const updated = { ...data };
    const dayToUpdate = updated[activeFolder][cardIndex];
    if (!dayToUpdate.customFeatures) {
      dayToUpdate.customFeatures = [];
    }
    dayToUpdate.customFeatures.push(newFeature);
    
    setData(updated);
    setAddingFeatureToCard(null);
    setNewCardFeatureName("");
    toast.success(`Added "${name}" to this card.`);
  };

  const toggleFeatureDone = (cardIndex: number, featureId: string) => {
    const updated = { ...data };
    const dayToUpdate = updated[activeFolder][cardIndex];
    if (!dayToUpdate.completedFeatures) {
      dayToUpdate.completedFeatures = [];
    }
    
    if (dayToUpdate.completedFeatures.includes(featureId)) {
      dayToUpdate.completedFeatures = dayToUpdate.completedFeatures.filter(id => id !== featureId);
    } else {
      dayToUpdate.completedFeatures.push(featureId);
    }
    
    setData(updated);
  };

  const addNewFeature = () => {
    const name = newFeatureName.trim();
    if (!name) return;
    
    if (features.some(f => f.label.toLowerCase() === name.toLowerCase())) {
      toast.error("A feature with this name already exists!");
      return;
    }

    const newId = name.toLowerCase().replace(/\s+/g, '-');
    const newFeature: Feature = {
      id: newId,
      label: name,
      icon: "📝",
      enabled: true
    };

    setFeatures([...features, newFeature]);
    setNewFeatureName("");
    toast.success(`Feature "${name}" added.`);
  };

  const deleteFeature = (id: string) => {
    const featureToDelete = features.find(f => f.id === id);
    if (!featureToDelete) return;
    setFeatures(features.filter(f => f.id !== id));
    toast.success(`Feature "${featureToDelete.label}" deleted.`);
  };

  // Add new page (day)
  const addPage = () => {
    const updated = { ...data };
    const newDay: Day = {
      id: Date.now(),
      day: "New",
      title: "New Page",
      done: false,
      notes: features.reduce((acc, f) => ({ ...acc, [f.id]: "" }), {})
    };
    updated[activeFolder].push(newDay);
    setData(updated);
    toast.success("New study page added.");
  };

  const deletePage = (id: number) => {
    const updated = { ...data };
    updated[activeFolder] = updated[activeFolder].filter(d => d.id !== id);
    setData(updated);
    toast.success("Study page deleted.");
  };

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;

    const updated = { ...data };
    const items = [...updated[activeFolder]];
    const draggedItem = items[dragIndex];

    items.splice(dragIndex, 1);
    items.splice(index, 0, draggedItem);

    updated[activeFolder] = items;
    setData(updated);
    setDragIndex(null);
  };

  const currentDays = data[activeFolder] || [];
  const allDays = Object.values(data).flat() as Day[];
  const progress = allDays.length > 0 ? (allDays.filter(d => d.done).length / allDays.length) * 100 : 0;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Toaster position="top-center" richColors />
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-zinc-900 p-6 border-r dark:border-zinc-800 flex flex-col shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <BookOpen size={20} />
          </div>
          <h2 className="font-bold text-xl dark:text-white">StudyHub</h2>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Folders</p>
            <div className="space-y-1">
              {folders.map((folder) => (
                <Button
                  key={folder}
                  variant={activeFolder === folder && viewMode === 'study' ? "default" : "ghost"}
                  className={`w-full justify-start text-left font-medium transition-all ${
                    activeFolder === folder && viewMode === 'study' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                  onClick={() => {
                    setActiveFolder(folder);
                    setViewMode('study');
                  }}
                >
                  {folder}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">System</p>
            <Button
              variant={viewMode === 'settings' ? "default" : "ghost"}
              className={`w-full justify-start text-left font-medium transition-all ${
                viewMode === 'settings' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
              onClick={() => setViewMode('settings')}
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {viewMode === 'study' && (
          <Button 
            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white shadow-md transition-all hover:scale-[1.02]" 
            onClick={addPage}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Page
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 p-6 flex justify-between items-center shadow-sm z-10 transition-colors duration-300">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {viewMode === 'study' ? activeFolder : 'Settings'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Welcome back, <span className="font-semibold text-blue-600">{userName}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-6 flex-1 max-w-xl justify-end">
            {/* Timer Widget */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full shadow-inner border border-gray-200 dark:border-zinc-700">
              <Timer className={`w-4 h-4 ${isTimerActive ? 'text-blue-500 animate-pulse' : 'text-gray-500 dark:text-zinc-400'}`} />
              <span className="font-mono font-bold text-sm w-12 text-center text-gray-700 dark:text-zinc-200">
                {formatTime(studyTime)}
              </span>
              <div className="flex items-center gap-1 border-l border-gray-300 dark:border-zinc-600 pl-2">
                <button
                  onClick={() => setIsTimerActive(!isTimerActive)}
                  className="p-1 rounded-full hover:bg-white dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors shadow-sm bg-gray-200 dark:bg-zinc-800"
                  title={isTimerActive ? "Pause Timer" : "Start Timer"}
                >
                  {isTimerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => { 
                    setIsTimerActive(false); 
                    if (timerMode === 'countdown') {
                      setStudyTime(timerDuration * 60);
                    } else {
                      setStudyTime(0); 
                    }
                  }}
                  className="p-1 rounded-full hover:bg-white dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors shadow-sm bg-gray-200 dark:bg-zinc-800"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex-1 max-w-xs hidden sm:block">
              <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-zinc-500 mb-1 uppercase tracking-wider">
                <span>Overall Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-gray-100 dark:bg-zinc-800" />
            </div>
            <Button onClick={saveChanges} className="bg-green-600 hover:bg-green-700 text-white shadow-sm shrink-0">
              <Check className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            {viewMode === 'study' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentDays.map((d, i) => (
                  <Card
                    key={d.id}
                    className={`rounded-2xl border-none shadow-lg transition-all hover:shadow-xl dark:bg-zinc-900 ${d.done ? 'ring-2 ring-green-500/50 opacity-90' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(i)}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                            {d.day}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-800 dark:text-zinc-100">Day</span>
                            <input
                              className="font-bold text-gray-800 dark:text-zinc-100 bg-transparent border-none outline-none w-16 focus:ring-2 focus:ring-blue-500 rounded px-1"
                              value={d.day}
                              onChange={(e) => updateDay(i, "day", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm"
                            variant={d.done ? "default" : "outline"}
                            className={`rounded-full px-4 ${d.done ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-gray-300 dark:border-zinc-700 dark:text-zinc-300'}`}
                            onClick={() => toggleDone(i)}
                          >
                            {d.done ? "✔ Done" : "Mark Done"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger render={
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            } />
                            <AlertDialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this page?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. All notes for this day will be lost.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel variant="outline" className="dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Cancel</AlertDialogCancel>
                                <AlertDialogAction variant="default" onClick={() => deletePage(d.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <input
                        className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl font-semibold text-gray-800 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={d.title}
                        onChange={(e) => updateDay(i, "title", e.target.value)}
                        placeholder="Topic Title"
                      />

                      {/* Sections */}
                      <div className="space-y-4">
                        {[
                          ...features.filter(f => f.enabled && !d.hiddenFeatures?.includes(f.id)),
                          ...(d.customFeatures || [])
                        ].map((feature) => {
                          const isEditingThis = editingCardFeature?.cardId === d.id && editingCardFeature?.featureId === feature.id;
                          const displayLabel = d.featureLabels?.[feature.id] || feature.label;
                          const isDone = d.completedFeatures?.includes(feature.id);
                          
                          return (
                            <div key={feature.id} className={`relative flex flex-col gap-1.5 transition-opacity ${isDone ? 'opacity-60' : ''}`}>
                              <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{feature.icon}</span>
                                  {isEditingThis ? (
                                    <Input 
                                      value={cardFeatureRenameValue}
                                      onChange={(e) => setCardFeatureRenameValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveCardFeatureRename(i, d.id, feature.id);
                                        if (e.key === 'Escape') cancelCardFeatureRenaming();
                                      }}
                                      className="h-6 text-xs py-0 px-2 w-40 dark:bg-zinc-800 dark:border-zinc-700"
                                      autoFocus
                                      onBlur={() => saveCardFeatureRename(i, d.id, feature.id)}
                                    />
                                  ) : (
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDone ? 'text-green-600 dark:text-green-500 line-through' : 'text-gray-500 dark:text-zinc-400'}`}>
                                      {displayLabel}
                                    </span>
                                  )}
                                </div>
                                {!isEditingThis && (
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className={`h-5 w-5 ${isDone ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-green-500'}`}
                                      onClick={() => toggleFeatureDone(i, feature.id)}
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-gray-400 hover:text-blue-500"
                                      onClick={() => startCardFeatureRenaming(d.id, feature.id, displayLabel)}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-gray-400 hover:text-red-500"
                                      onClick={() => hideCardFeature(i, feature.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <textarea
                                className={`w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm dark:text-zinc-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px] ${feature.id === 'redFlags' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-900 dark:text-red-200 placeholder:text-red-300' : ''} ${isDone ? 'bg-gray-50 dark:bg-zinc-800/50 text-gray-400 dark:text-zinc-500' : ''}`}
                                placeholder={`Enter ${displayLabel}...`}
                                value={d.notes[feature.id] || ""}
                                onChange={(e) => updateDay(i, feature.id, e.target.value)}
                                disabled={isDone}
                              />
                            </div>
                          );
                        })}
                        
                        {/* Add Custom Feature to Card */}
                        {addingFeatureToCard === d.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input 
                              value={newCardFeatureName}
                              onChange={e => setNewCardFeatureName(e.target.value)}
                              placeholder="New feature name..."
                              className="h-9 text-sm dark:bg-zinc-800 dark:border-zinc-700"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddCustomFeature(i, d.id);
                                if (e.key === 'Escape') {
                                  setAddingFeatureToCard(null);
                                  setNewCardFeatureName("");
                                }
                              }}
                            />
                            <Button size="sm" onClick={() => handleAddCustomFeature(i, d.id)}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setAddingFeatureToCard(null);
                              setNewCardFeatureName("");
                            }}>Cancel</Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-2 border-dashed text-gray-500 dark:text-zinc-400 dark:border-zinc-700"
                            onClick={() => setAddingFeatureToCard(d.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Custom Feature
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Profile Settings */}
                <Card className="border-none shadow-lg dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Profile Settings
                    </CardTitle>
                    <CardDescription>Customize your study profile</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input 
                          id="name" 
                          value={userName} 
                          onChange={(e) => setUserName(e.target.value)}
                          className="dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="goal">Daily Study Goal (Days)</Label>
                        <Input 
                          id="goal" 
                          type="number" 
                          value={dailyGoal} 
                          onChange={(e) => setDailyGoal(parseInt(e.target.value) || 1)}
                          className="dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timer Settings */}
                <Card className="border-none shadow-lg dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-blue-600" />
                      Timer Settings
                    </CardTitle>
                    <CardDescription>Configure your study timer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Timer Mode</Label>
                        <div className="flex gap-2">
                          <Button 
                            variant={timerMode === 'stopwatch' ? 'default' : 'outline'} 
                            className={`flex-1 ${timerMode === 'stopwatch' ? 'bg-blue-600 hover:bg-blue-700' : 'dark:border-zinc-700'}`}
                            onClick={() => setTimerMode('stopwatch')}
                          >
                            Stopwatch
                          </Button>
                          <Button 
                            variant={timerMode === 'countdown' ? 'default' : 'outline'} 
                            className={`flex-1 ${timerMode === 'countdown' ? 'bg-blue-600 hover:bg-blue-700' : 'dark:border-zinc-700'}`}
                            onClick={() => setTimerMode('countdown')}
                          >
                            Countdown
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timerDuration">Countdown Duration (Minutes)</Label>
                        <Input 
                          id="timerDuration" 
                          type="number" 
                          value={timerDuration} 
                          onChange={(e) => setTimerDuration(parseInt(e.target.value) || 25)}
                          disabled={timerMode !== 'countdown'}
                          className="dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Folder Management */}
                <Card className="border-none shadow-lg dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderPlus className="h-5 w-5 text-blue-600" />
                      Folder Management
                    </CardTitle>
                    <CardDescription>Add, remove or rename your study folders</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="New folder name..." 
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addFolder()}
                        className="dark:bg-zinc-800 dark:border-zinc-700"
                      />
                      <Button onClick={addFolder} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {folders.map(folder => (
                        <div key={folder} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border dark:border-zinc-800">
                          {editingFolder === folder ? (
                            <div className="flex-1 flex gap-2 mr-2">
                              <Input 
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRename(folder);
                                  if (e.key === 'Escape') cancelRenaming();
                                }}
                                className="h-8 dark:bg-zinc-800 dark:border-zinc-700"
                                autoFocus
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => saveRename(folder)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                onClick={cancelRenaming}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium dark:text-zinc-200">{folder}</span>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  onClick={() => startRenaming(folder)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger render={
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  } />
                                  <AlertDialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete folder "{folder}"?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the folder and all {data[folder]?.length || 0} study pages inside it.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel variant="outline" className="dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Cancel</AlertDialogCancel>
                                      <AlertDialogAction variant="default" onClick={() => deleteFolder(folder)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Page Features */}
                <Card className="border-none shadow-lg dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="h-5 w-5 text-blue-600" />
                      Page Features
                    </CardTitle>
                    <CardDescription>Toggle and rename sections on your study cards</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="New feature name..." 
                        value={newFeatureName}
                        onChange={(e) => setNewFeatureName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNewFeature()}
                        className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                      />
                      <Button onClick={addNewFeature} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" /> Add Feature
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {features.map((feature) => (
                        <div key={feature.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border dark:border-zinc-800">
                          {editingFeatureId === feature.id ? (
                            <div className="flex-1 flex gap-2 mr-2">
                              <Input 
                                value={featureRenameValue}
                                onChange={(e) => setFeatureRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveFeatureRename(feature.id);
                                  if (e.key === 'Escape') cancelFeatureRenaming();
                                }}
                                className="h-8 dark:bg-zinc-800 dark:border-zinc-700"
                                autoFocus
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => saveFeatureRename(feature.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                onClick={cancelFeatureRenaming}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{feature.icon}</span>
                                <Label className="font-medium dark:text-zinc-200 cursor-pointer" htmlFor={`feat-${feature.id}`}>
                                  {feature.label}
                                </Label>
                                <div className="flex items-center gap-1 ml-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => startFeatureRenaming(feature.id, feature.label)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger render={
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    } />
                                    <AlertDialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the "{feature.label}" feature? This will remove it from all your study pages.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel variant="outline" className="dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Cancel</AlertDialogCancel>
                                        <AlertDialogAction variant="default" onClick={() => deleteFeature(feature.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              <Switch 
                                id={`feat-${feature.id}`}
                                checked={feature.enabled} 
                                onCheckedChange={() => toggleFeature(feature.id)} 
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Appearance */}
                <Card className="border-none shadow-lg dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Moon className="h-5 w-5 text-blue-600" />
                      Appearance
                    </CardTitle>
                    <CardDescription>Manage how the app looks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Dark Mode</Label>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">Toggle between light and dark themes</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sun className={`h-4 w-4 ${!isDarkMode ? 'text-yellow-500' : 'text-gray-400'}`} />
                        <Switch 
                          checked={isDarkMode} 
                          onCheckedChange={setIsDarkMode} 
                        />
                        <Moon className={`h-4 w-4 ${isDarkMode ? 'text-blue-500' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-none shadow-lg border-red-100 dark:border-red-900/30 dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <Trash2 className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible actions for your study data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-red-600">Reset All Progress</Label>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">Clear all "Done" marks across all folders</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger render={
                          <Button variant="destructive">
                            Reset Progress
                          </Button>
                        } />
                        <AlertDialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will unmark all completed days. Your notes will remain safe.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel variant="outline" className="dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Cancel</AlertDialogCancel>
                            <AlertDialogAction variant="default" onClick={resetProgress} className="bg-red-600 hover:bg-red-700">Reset</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Separator className="dark:bg-zinc-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-red-600">Clear All Data</Label>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">Delete all notes and custom pages</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger render={
                          <Button variant="destructive">
                            Clear Everything
                          </Button>
                        } />
                        <AlertDialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reset the app to its initial state. All your notes and custom folders will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel variant="outline" className="dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              variant="default"
                              onClick={() => {
                                setData(generateStructuredDays(folders));
                                toast.success("All data has been cleared.");
                              }} 
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Clear All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
