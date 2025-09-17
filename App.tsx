

import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import * as db from './services/db';
import { apiKeyManager } from './services/apiKeyManager';
import * as geminiService from './services/geminiService';
import { Character, Story, Scene, AspectRatio, SceneGenerationResult, AppBackup } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import Modal from './components/Modal';
import { SettingsModal } from './components/SettingsModal';
import ProgressIndicator from './components/ProgressIndicator';


// --- START: Toast Notification System ---
type ToastType = 'success' | 'danger' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast: React.FC<{ message: ToastMessage; onDismiss: (id: number) => void }> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(message.id);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [message, onDismiss]);

  const colors = {
    success: 'border-brand-success',
    danger: 'border-brand-danger',
    info: 'border-indigo-500',
  };

  const Icon = () => {
    switch (message.type) {
      case 'success':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'danger':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  }

  return (
    <div className={`flex items-center w-full max-w-xs p-4 space-x-4 space-x-reverse text-gray-400 bg-brand-secondary rounded-lg shadow-lg border-r-4 ${colors[message.type]} animate-fade-in-right`}>
      <Icon />
      <div className="text-sm font-normal text-brand-text">{message.message}</div>
      <button
        type="button"
        className="ms-auto -mx-1.5 -my-1.5 bg-brand-secondary text-gray-400 hover:text-white rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-slate-700 inline-flex items-center justify-center h-8 w-8"
        onClick={() => onDismiss(message.id)}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
      </button>
    </div>
  );
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
// --- END: Toast Notification System ---


// --- ICONS ---

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const StoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 005.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0014.5 16c1.255 0 2.443-.29 3.5-.804v-10A7.968 7.968 0 0014.5 4z" /></svg>;
const CharacterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const ZipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2-2H6a2 2 0 01-2-2V4zM2 6v10a2 2 0 002 2h1.5a.5.5 0 010-1H4a1 1 0 01-1-1V6a1 1 0 011-1h2a1 1 0 011 1v1a.5.5 0 01-1 0V6H4a2 2 0 00-2 2zm13-2V4a1 1 0 011-1h1.5a.5.5 0 010 1H16v2a.5.5 0 01-1 0V4zM9 2.5a.5.5 0 01.5.5v1a.5.5 0 01-1 0V3a.5.5 0 01.5-.5z" clipRule="evenodd" /><path d="M8 10a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 10zm2 0a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1a.5.5 0 01.5-.5zm2 0a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1a.5.5 0 01.5-.5z" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>;
const SmallCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const IdeaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0 2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const MagicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const TinySpinner = () => <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- Character Creator Modal ---

const CharacterCreator: React.FC<{
    onClose: () => void;
    onSave: (character: Character) => void;
}> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [promptIdeas, setPromptIdeas] = useState<string[]>([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRefining, setIsRefining] = useState<{ [key: string]: boolean }>({});


    const handleRefine = async (field: 'description' | 'editPrompt', context: string) => {
        const textToRefine = field === 'description' ? description : editPrompt;
        if (!textToRefine) return;

        setIsRefining(prev => ({ ...prev, [field]: true }));
        setError('');
        try {
            const refinedText = await geminiService.refineText(textToRefine, context);
            if (field === 'description') {
                setDescription(refinedText);
            } else {
                setEditPrompt(refinedText);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : `فشل تحسين النص.`);
        } finally {
            setIsRefining(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Gemini has a 4MB limit for inline data for editing
            if (file.size > 4 * 1024 * 1024) {
                setError('حجم الصورة كبير جدًا. الرجاء اختيار صورة أصغر من 4 ميجابايت.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    setImageUrl(result);
                    setError('');
                }
            };
            reader.onerror = () => {
                setError('فشل في قراءة ملف الصورة.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!apiKeyManager.getActiveKey()) {
            setError('الرجاء إضافة مفتاح API في الإعدادات أولاً.');
            return;
        }
        if (!description) {
            setError('الرجاء إدخال وصف للشخصية.');
            return;
        }
        setIsLoading(true);
        setError('');
        setImageUrl('');
        try {
            const url = await geminiService.generateCharacterImage(description);
            setImageUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleModifyImage = async () => {
        if (!editPrompt || !imageUrl) return;
        setIsEditing(true);
        setError('');
        try {
            const newUrl = await geminiService.editCharacterImage(imageUrl, editPrompt);
            setImageUrl(newUrl);
            setEditPrompt(''); // Clear prompt on success
        } catch (err) {
             setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف أثناء تعديل الصورة.');
        } finally {
            setIsEditing(false);
        }
    };

    const handleCopyPrompt = () => {
        if (!description) return;
        const fullPrompt = `A full-body 3D Pixar-style character portrait of ${description}, clean solid light gray background, character reference sheet style.`;
        navigator.clipboard.writeText(fullPrompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const handleGetIdeas = async () => {
        if (!apiKeyManager.getActiveKey()) {
            setError('الرجاء إضافة مفتاح API في الإعدادات أولاً.');
            return;
        }
        setIsLoadingIdeas(true);
        setPromptIdeas([]);
        setError('');
        try {
            const ideas = await geminiService.generateCharacterPromptIdeas();
            setPromptIdeas(ideas);
        } catch(err) {
            setError(err instanceof Error ? err.message : 'فشل في جلب الأفكار.');
        } finally {
            setIsLoadingIdeas(false);
        }
    };

    const handleUseIdea = (idea: string) => {
        setDescription(idea);
        setPromptIdeas([]);
    };

    const handleSave = () => {
        if (!name || !description || !imageUrl) {
            setError('اسم ووصف وصورة مُنشأة مطلوبة للحفظ.');
            return;
        }
        onSave({ id: Date.now().toString(), name, description, imageUrl });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-brand-secondary w-full max-w-3xl rounded-xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-8 pb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-right text-brand-text">إنشاء شخصية جديدة</h2>
                    {error && <p className="bg-brand-danger/20 text-red-400 p-3 rounded-md text-right mt-4">{error}</p>}
                </div>
                
                {/* Scrollable Content */}
                <div className="px-8 pb-6 flex-grow overflow-y-auto space-y-6">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="char-desc" className="flex justify-between items-center text-sm font-medium text-brand-text-secondary mb-1 text-right">
                                    <span>وصف الشخصية (مثال: "فارس شجاع بسيف أزرق متوهج")</span>
                                    <button onClick={handleGetIdeas} disabled={isLoadingIdeas} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 flex items-center p-1 rounded">
                                        {isLoadingIdeas ? 'جاري البحث...' : 'احصل على أفكار'}
                                        {!isLoadingIdeas && <IdeaIcon />}
                                    </button>
                                </label>
                                 <div className="relative">
                                    <textarea id="char-desc" rows={5} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 pl-10 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"></textarea>
                                    <button 
                                        onClick={() => handleRefine('description', 'a character description for an image generator')} 
                                        disabled={isRefining.description || !description} 
                                        className="absolute left-2 top-2 text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 p-1 rounded-full transition bg-brand-primary/50 hover:bg-brand-secondary"
                                        title="تحسين الوصف بالذكاء الاصطناعي">
                                        {isRefining.description ? <TinySpinner /> : <MagicIcon />}
                                    </button>
                                </div>
                                { (isLoadingIdeas || promptIdeas.length > 0) && (
                                    <div className="mt-2 space-y-2 p-3 bg-brand-primary border border-slate-700 rounded-md max-h-48 overflow-y-auto">
                                        {isLoadingIdeas && <div className="flex justify-center p-4"><LoadingSpinner message="جاري توليد الأفكار..." /></div>}
                                        {promptIdeas.map((idea, index) => (
                                            <div key={index} className="text-right p-2 border-b border-slate-600 last:border-b-0">
                                                <p className="text-sm text-brand-text-secondary mb-2" dir="ltr">{idea}</p>
                                                <button onClick={() => handleUseIdea(idea)} className="text-xs font-bold px-3 py-1 bg-brand-accent rounded-md hover:bg-brand-highlight transition">
                                                    استخدم هذا الوصف
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                 <button onClick={handleGenerate} disabled={isLoading || !description} className="w-full flex justify-center items-center px-4 py-2 bg-brand-accent text-white rounded-md font-semibold hover:bg-brand-highlight transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                                    {isLoading ? 'جاري إنشاء الصورة...' : 'إنشاء صورة الشخصية'}
                                </button>
                                 <button onClick={handleCopyPrompt} disabled={!description} title="Copy Prompt" className="px-3 bg-slate-600 rounded-md hover:bg-slate-500 transition disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center">
                                    {copied ? <SmallCheckIcon /> : <CopyIcon />}
                                 </button>
                            </div>
                        </div>
                        <div className="relative flex flex-col items-center justify-center bg-brand-primary rounded-md p-4 min-h-[250px]">
                            {isLoading && <LoadingSpinner message="جاري إنشاء الشخصية..." />}
                            {imageUrl && !isLoading && <img src={imageUrl} alt="Generated character" className="rounded-md object-contain max-h-64" />}
                            {!isLoading && !imageUrl && !error && (
                                <div className="text-center space-y-2">
                                    <p className="text-brand-text-secondary">ستظهر صورة شخصيتك هنا.</p>
                                    <p className="text-xs text-brand-text-secondary">أنشئ واحدة من الوصف أو ارفع صورة موجودة.</p>
                                    <button onClick={handleUploadClick} className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-md font-semibold hover:bg-slate-500 transition">
                                        <UploadIcon />
                                        <span>رفع صورة</span>
                                    </button>
                                </div>
                            )}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-md">
                                    <LoadingSpinner message="جاري تعديل الصورة..." />
                                </div>
                            )}
                        </div>
                    </div>
                    {imageUrl && !isLoading && (
                        <div className="space-y-3 bg-brand-primary/50 p-4 rounded-lg border border-slate-700">
                            <label htmlFor="char-edit-prompt" className="block text-sm font-medium text-brand-text-secondary text-right">
                                تعديل الصورة (مثال: "أضف له قبعة حمراء")
                            </label>
                             <div className="relative">
                                <textarea
                                    id="char-edit-prompt"
                                    rows={2}
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 pl-10 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"
                                    placeholder="صف التغيير الذي تريده على الصورة..."
                                ></textarea>
                                 <button 
                                    onClick={() => handleRefine('editPrompt', 'an image editing instruction')} 
                                    disabled={isRefining.editPrompt || !editPrompt} 
                                    className="absolute left-2 top-2 text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 p-1 rounded-full transition bg-brand-primary/50 hover:bg-brand-secondary"
                                    title="تحسين الوصف بالذكاء الاصطناعي">
                                    {isRefining.editPrompt ? <TinySpinner /> : <MagicIcon />}
                                </button>
                            </div>
                            <button onClick={handleModifyImage} disabled={isEditing || !editPrompt} className="w-full px-4 py-2 bg-indigo-500 text-white rounded-md font-semibold hover:bg-indigo-400 transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                                {isEditing ? "جاري التعديل..." : "تطبيق التعديل"}
                            </button>
                        </div>
                    )}
                     <div>
                        <label htmlFor="char-name" className="block text-sm font-medium text-brand-text-secondary mb-1 text-right">اسم الشخصية</label>
                        <input id="char-name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"/>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-8 pt-6 flex-shrink-0 border-t border-slate-700">
                    <div className="flex justify-end space-x-4 space-x-reverse">
                        <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">إغلاق</button>
                        <button onClick={handleSave} disabled={!imageUrl || !name || !description} className="px-4 py-3 bg-brand-success text-white rounded-md font-bold hover:bg-emerald-400 transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                            حفظ الشخصية
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Character Editor Modal ---

const CharacterEditor: React.FC<{
    character: Character;
    onClose: () => void;
    onSave: (character: Character) => void;
}> = ({ character, onClose, onSave }) => {
    const [name, setName] = useState(character.name);
    const [description, setDescription] = useState(character.description);
    const [imageUrl, setImageUrl] = useState(character.imageUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [promptIdeas, setPromptIdeas] = useState<string[]>([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRefining, setIsRefining] = useState<{ [key: string]: boolean }>({});

    const handleRefine = async (field: 'description' | 'editPrompt', context: string) => {
        const textToRefine = field === 'description' ? description : editPrompt;
        if (!textToRefine) return;

        setIsRefining(prev => ({ ...prev, [field]: true }));
        setError('');
        try {
            const refinedText = await geminiService.refineText(textToRefine, context);
            if (field === 'description') {
                setDescription(refinedText);
            } else {
                setEditPrompt(refinedText);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : `فشل تحسين النص.`);
        } finally {
            setIsRefining(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                setError('حجم الصورة كبير جدًا. الرجاء اختيار صورة أصغر من 4 ميجابايت.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    setImageUrl(result);
                    setError('');
                }
            };
            reader.onerror = () => {
                setError('فشل في قراءة ملف الصورة.');
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        const isChanged = name !== character.name || description !== character.description || imageUrl !== character.imageUrl;
        setHasChanges(isChanged);
    }, [name, description, imageUrl, character]);

    const handleGenerate = async () => {
        if (!description) {
            setError('الرجاء إدخال وصف للشخصية.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const url = await geminiService.generateCharacterImage(description);
            setImageUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleModifyImage = async () => {
        if (!editPrompt || !imageUrl) return;
        setIsEditing(true);
        setError('');
        try {
            const newUrl = await geminiService.editCharacterImage(imageUrl, editPrompt);
            setImageUrl(newUrl);
            setEditPrompt('');
        } catch (err) {
             setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف أثناء تعديل الصورة.');
        } finally {
            setIsEditing(false);
        }
    };

    const handleCopyPrompt = () => {
        if (!description) return;
        const fullPrompt = `A full-body 3D Pixar-style character portrait of ${description}, clean solid light gray background, character reference sheet style.`;
        navigator.clipboard.writeText(fullPrompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleGetIdeas = async () => {
        setIsLoadingIdeas(true);
        setPromptIdeas([]);
        setError('');
        try {
            const ideas = await geminiService.generateCharacterPromptIdeas();
            setPromptIdeas(ideas);
        } catch(err) {
            setError(err instanceof Error ? err.message : 'فشل في جلب الأفكار.');
        } finally {
            setIsLoadingIdeas(false);
        }
    };

    const handleUseIdea = (idea: string) => {
        setDescription(idea);
        setPromptIdeas([]);
    };

    const handleSave = () => {
        if (!name || !description || !imageUrl) {
            setError('اسم ووصف وصورة مُنشأة مطلوبة للحفظ.');
            return;
        }
        onSave({ ...character, name, description, imageUrl });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-brand-secondary w-full max-w-3xl rounded-xl shadow-2xl border border-slate-700 p-8 space-y-6" onClick={e => e.stopPropagation()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <h2 className="text-2xl font-bold text-right text-brand-text">تعديل الشخصية</h2>
                {error && <p className="bg-brand-danger/20 text-red-400 p-3 rounded-md text-right">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="char-desc-edit" className="flex justify-between items-center text-sm font-medium text-brand-text-secondary mb-1 text-right">
                                <span>وصف الشخصية (مثال: "فارس شجاع بسيف أزرق متوهج")</span>
                                <button onClick={handleGetIdeas} disabled={isLoadingIdeas} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 flex items-center p-1 rounded">
                                    {isLoadingIdeas ? 'جاري البحث...' : 'احصل على أفكار'}
                                    {!isLoadingIdeas && <IdeaIcon />}
                                </button>
                            </label>
                            <div className="relative">
                                <textarea id="char-desc-edit" rows={5} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 pl-10 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"></textarea>
                                <button 
                                    onClick={() => handleRefine('description', 'a character description for an image generator')} 
                                    disabled={isRefining.description || !description} 
                                    className="absolute left-2 top-2 text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 p-1 rounded-full transition bg-brand-primary/50 hover:bg-brand-secondary"
                                    title="تحسين الوصف بالذكاء الاصطناعي">
                                    {isRefining.description ? <TinySpinner /> : <MagicIcon />}
                                </button>
                            </div>
                             { (isLoadingIdeas || promptIdeas.length > 0) && (
                                <div className="mt-2 space-y-2 p-3 bg-brand-primary border border-slate-700 rounded-md max-h-48 overflow-y-auto">
                                    {isLoadingIdeas && <div className="flex justify-center p-4"><LoadingSpinner message="جاري توليد الأفكار..." /></div>}
                                    {promptIdeas.map((idea, index) => (
                                        <div key={index} className="text-right p-2 border-b border-slate-600 last:border-b-0">
                                            <p className="text-sm text-brand-text-secondary mb-2" dir="ltr">{idea}</p>
                                            <button onClick={() => handleUseIdea(idea)} className="text-xs font-bold px-3 py-1 bg-brand-accent rounded-md hover:bg-brand-highlight transition">
                                                استخدم هذا الوصف
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                         <div className="flex gap-2">
                            <button onClick={handleGenerate} disabled={isLoading || !description} className="flex-grow flex justify-center items-center px-4 py-2 bg-brand-accent text-white rounded-md font-semibold hover:bg-brand-highlight transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                                {isLoading ? 'جاري...' : 'إعادة إنشاء'}
                            </button>
                            <button onClick={handleUploadClick} disabled={isLoading} className="flex-shrink-0 px-4 py-2 bg-slate-600 text-white rounded-md font-semibold hover:bg-slate-500 transition flex items-center">
                                رفع
                            </button>
                             <button onClick={handleCopyPrompt} disabled={!description} title="Copy Prompt" className="flex-shrink-0 px-3 bg-slate-600 rounded-md hover:bg-slate-500 transition disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center">
                                {copied ? <SmallCheckIcon /> : <CopyIcon />}
                             </button>
                        </div>
                    </div>
                    <div className="relative flex flex-col items-center justify-center bg-brand-primary rounded-md p-4 min-h-[250px]">
                        {isLoading && <LoadingSpinner message="جاري إنشاء الشخصية..." />}
                        {imageUrl && !isLoading && <img src={imageUrl} alt="Generated character" className="rounded-md object-contain max-h-64" />}
                        {!isLoading && !imageUrl && !error && <p className="text-brand-text-secondary text-center">ستظهر صورة شخصيتك هنا.</p>}
                         {isEditing && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-md">
                                <LoadingSpinner message="جاري تعديل الصورة..." />
                            </div>
                        )}
                    </div>
                </div>
                {imageUrl && !isLoading && (
                    <div className="space-y-3 bg-brand-primary/50 p-4 rounded-lg border border-slate-700">
                        <label htmlFor="char-editor-edit-prompt" className="block text-sm font-medium text-brand-text-secondary text-right">
                            تعديل الصورة (مثال: "أضف له قبعة حمراء")
                        </label>
                        <div className="relative">
                            <textarea
                                id="char-editor-edit-prompt"
                                rows={2}
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 pl-10 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"
                                placeholder="صف التغيير الذي تريده على الصورة..."
                            ></textarea>
                            <button 
                                onClick={() => handleRefine('editPrompt', 'an image editing instruction')} 
                                disabled={isRefining.editPrompt || !editPrompt} 
                                className="absolute left-2 top-2 text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 p-1 rounded-full transition bg-brand-primary/50 hover:bg-brand-secondary"
                                title="تحسين الوصف بالذكاء الاصطناعي">
                                {isRefining.editPrompt ? <TinySpinner /> : <MagicIcon />}
                            </button>
                        </div>
                        <button onClick={handleModifyImage} disabled={isEditing || !editPrompt} className="w-full px-4 py-2 bg-indigo-500 text-white rounded-md font-semibold hover:bg-indigo-400 transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                            {isEditing ? "جاري التعديل..." : "تطبيق التعديل"}
                        </button>
                    </div>
                )}
                 <div>
                    <label htmlFor="char-name-edit" className="block text-sm font-medium text-brand-text-secondary mb-1 text-right">اسم الشخصية</label>
                    <input id="char-name-edit" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"/>
                </div>
                <div className="flex justify-end space-x-4 space-x-reverse">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">إغلاق</button>
                    <button onClick={handleSave} disabled={!hasChanges} className="px-4 py-3 bg-brand-success text-white rounded-md font-bold hover:bg-emerald-400 transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                        حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Story Creator Wizard ---

const StoryCreatorWizard: React.FC<{
    characters: Character[];
    onAddStory: (story: Story) => void;
    onClose: () => void;
}> = ({ characters, onAddStory, onClose }) => {
    // Wizard state
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    
    // Story data state
    const [storyName, setStoryName] = useState('');
    const [storyPrompt, setStoryPrompt] = useState('');
    const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [videoDuration, setVideoDuration] = useState(60); // in seconds, default 1 minute
    const [sceneDuration, setSceneDuration] = useState(5); // in seconds
    const [generatedStory, setGeneratedStory] = useState<Story | null>(null);

    // Autocomplete state
    const [mention, setMention] = useState<{ query: string; index: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Prompt Ideas state
    const [storyIdeas, setStoryIdeas] = useState<string[]>([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const [isRefining, setIsRefining] = useState(false);

    // Progress State
    type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
    interface ProgressState {
        title: string;
        steps: string[];
        statuses: Record<number, StepStatus>;
        currentStepIndex: number;
        errorMessage?: string;
    }
    const [progress, setProgress] = useState<ProgressState | null>(null);


    const toggleCharSelection = (id: string) => {
        setSelectedCharIds(prev => prev.includes(id) ? prev.filter(charId => charId !== id) : [...prev, id]);
    };
    
    const handleRefine = async () => {
        if (!storyPrompt) return;
        setIsRefining(true);
        setError('');
        try {
            const refined = await geminiService.refineStoryPrompt(storyPrompt);
            setStoryPrompt(refined);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'فشل تحسين القصة.');
        } finally {
            setIsRefining(false);
        }
    };
    
    const handleGenerateStory = async () => {
        if (!apiKeyManager.getActiveKey()) {
            setError('الرجاء إضافة مفتاح API في الإعدادات أولاً.');
            return;
        }
        if (!storyPrompt || selectedCharIds.length === 0 || !storyName) {
            setError("يرجى تقديم اسم للقصة، ونص، واختيار شخصية واحدة على الأقل.");
            return;
        }

        const numScenes = Math.ceil(videoDuration / sceneDuration);
        if (numScenes > 50) { 
            setError(`عدد المشاهد المحسوب (${numScenes}) كبير جدًا. يرجى اختيار مدة فيديو أقصر أو مدة مشهد أطول.`);
            return;
        }

        setError('');
        setGeneratedStory(null);

        const initialSteps = [
            `تحليل القصة وتقسيمها إلى ${numScenes} مشاهد`,
            ...Array.from({ length: numScenes }, (_, i) => `إنشاء صورة للمشهد ${i + 1}`)
        ];
        const initialStatuses: Record<number, StepStatus> = {};
        initialSteps.forEach((_, index) => initialStatuses[index] = 'pending');

        setProgress({
            title: `جاري إنشاء قصة "${storyName}"`,
            steps: initialSteps,
            statuses: { ...initialStatuses, 0: 'in-progress' },
            currentStepIndex: 0,
        });

        try {
            const selectedChars = characters.filter(c => selectedCharIds.includes(c.id));
            const scenePrompts = await geminiService.splitStoryIntoScenes(storyPrompt, numScenes, selectedChars, sceneDuration);
            
            const finalNumScenes = scenePrompts.length;
            
            setProgress(p => {
                if (!p) return null;
                const finalSteps = [
                    `تحليل القصة وتقسيمها إلى ${finalNumScenes} مشاهد`,
                    ...Array.from({ length: finalNumScenes }, (_, i) => `إنشاء صورة للمشهد ${i + 1}`)
                ];
                // FIX: Explicitly cast 'completed' to StepStatus to prevent type widening to string.
                const updatedStatuses = { ...p.statuses, 0: 'completed' as StepStatus };
                return {
                    ...p,
                    steps: finalSteps,
                    statuses: updatedStatuses,
                    currentStepIndex: 1,
                };
            });
            
            const newScenes: Scene[] = [];
            for (let i = 0; i < finalNumScenes; i++) {
                setProgress(p => p ? ({
                    ...p,
                    statuses: { ...p.statuses, [i + 1]: 'in-progress' },
                    currentStepIndex: i + 1,
                }) : null);

                const sp = scenePrompts[i];
                const imageUrl = await geminiService.generateSceneImage(sp.imagePrompt, aspectRatio);
                newScenes.push({ id: `${Date.now()}-${i}`, imageUrl, ...sp });

                setProgress(p => p ? ({
                    ...p,
                    statuses: { ...p.statuses, [i + 1]: 'completed' },
                }) : null);
            }

            const newStory: Story = {
                id: Date.now().toString(), name: storyName, originalPrompt: storyPrompt,
                characters: selectedChars, aspectRatio, scenes: newScenes,
                videoDuration, sceneDuration,
            };
            setGeneratedStory(newStory);
            setStep(2);
            setProgress(null);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'حدث خطأ غير معروف أثناء إنشاء القصة.';
            setError(message);
            setProgress(p => p ? ({
                ...p,
                statuses: { ...p.statuses, [p.currentStepIndex]: 'failed' },
                errorMessage: message,
            }) : null);
        }
    };
    
    const handleSaveAndClose = () => {
        if (!generatedStory) return;
        onAddStory(generatedStory);
        onClose();
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        let wordStartIndex = text.lastIndexOf(' ', cursorPos - 1) + 1;
        if (text[wordStartIndex - 1] === '\n') {
            wordStartIndex = text.lastIndexOf('\n', cursorPos - 1) + 1;
        }
        
        const currentWord = text.substring(wordStartIndex, cursorPos);

        if (currentWord.startsWith('@')) {
            setMention({ query: currentWord.substring(1), index: wordStartIndex });
        } else {
            setMention(null);
        }
        setStoryPrompt(text);
    };

    const handleMentionSelect = (name: string) => {
        if (!mention || !textareaRef.current) return;
        const text = storyPrompt;
        const cursorPos = textareaRef.current.selectionStart;
        const prefix = text.substring(0, mention.index);
        const suffix = text.substring(cursorPos);
        const newText = `${prefix}${name} ${suffix}`;
        setStoryPrompt(newText);
        setMention(null);
        
        setTimeout(() => {
            textareaRef.current?.focus();
            const newCursorPos = mention.index + name.length + 1;
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleGetStoryIdeas = async () => {
        if (!apiKeyManager.getActiveKey()) {
            setError('الرجاء إضافة مفتاح API في الإعدادات أولاً.');
            return;
        }
        setIsLoadingIdeas(true);
        setStoryIdeas([]);
        setError('');
        try {
            const ideas = await geminiService.generateStoryPromptIdeas();
            setStoryIdeas(ideas);
        } catch(err) {
            setError(err instanceof Error ? err.message : 'فشل في جلب الأفكار.');
        } finally {
            setIsLoadingIdeas(false);
        }
    };

    const handleUseStoryIdea = (idea: string) => {
        setStoryPrompt(idea);
        setStoryIdeas([]);
    };

    const filteredMentionChars = mention
      ? characters.filter(c => selectedCharIds.includes(c.id) && c.name.toLowerCase().includes(mention.query.toLowerCase()))
      : [];
    
     if (progress) {
        return (
            <ProgressIndicator
                title={progress.title}
                steps={progress.steps}
                statuses={progress.statuses}
                currentStepIndex={progress.currentStepIndex}
                errorMessage={progress.errorMessage}
                onClose={() => setProgress(null)}
            />
        );
    }
    
    return (
        <div className="fixed inset-0 bg-brand-primary z-50 overflow-y-auto">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                 {/* Header */}
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-brand-text">
                        {step === 1 ? 'إنشاء قصة جديدة' : `نتائج القصة: ${generatedStory?.name}`}
                    </h2>
                     <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors">
                        {step === 1 ? 'إلغاء' : 'العودة للاستوديو'}
                     </button>
                 </div>
                 {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md text-right mb-4">{error}</div>}

                {/* --- Step 1: Form --- */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Settings */}
                        <div className="bg-brand-secondary p-6 rounded-lg space-y-4">
                            <h3 className="text-xl font-semibold border-b border-slate-600 pb-2 text-right">١. تفاصيل وإعدادات القصة</h3>
                            <input id="story-name" type="text" placeholder="اسم القصة" value={storyName} onChange={e => setStoryName(e.target.value)} className="w-full bg-brand-primary border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"/>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 text-right">
                               <div>
                                    <h4 className="text-sm font-medium text-brand-text-secondary mb-2">أبعاد الصورة</h4>
                                    <div className="flex gap-2 justify-end">
                                        {(['1:1', '16:9', '9:16'] as AspectRatio[]).map(ar => (
                                            <button key={ar} onClick={() => setAspectRatio(ar)} className={`px-4 py-2 rounded-md transition text-sm font-semibold ${aspectRatio === ar ? 'bg-brand-accent text-white' : 'bg-brand-primary hover:bg-slate-700'}`}>{ar}</button>
                                        ))}
                                    </div>
                                </div>
                               <div>
                                    <h4 className="text-sm font-medium text-brand-text-secondary mb-2">مدة الفيديو الإجمالية</h4>
                                    <select value={videoDuration} onChange={e => setVideoDuration(Number(e.target.value))} className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right">
                                        <option value={60}>دقيقة واحدة</option>
                                        <option value={120}>دقيقتان</option>
                                        <option value={180}>ثلاث دقائق</option>
                                    </select>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-brand-text-secondary mb-2">مدة المشهد الواحد (بالثواني)</h4>
                                    <input type="number" min="2" max="10" value={sceneDuration} onChange={e => setSceneDuration(Number(e.target.value))} className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"/>
                                </div>
                            </div>
                        </div>

                        {/* Character Selection */}
                        <div className="bg-brand-secondary p-6 rounded-lg space-y-4">
                            <h3 className="text-xl font-semibold border-b border-slate-600 pb-2 text-right">٢. اختر شخصيات القصة</h3>
                            {characters.length === 0 ? (
                                <p className="text-center text-brand-text-secondary py-4">لم تقم بإنشاء أي شخصيات بعد. أنشئ شخصية من الشاشة الرئيسية أولاً.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {characters.map(char => (
                                        <button key={char.id} onClick={() => toggleCharSelection(char.id)} className={`relative rounded-lg overflow-hidden border-4 transition ${selectedCharIds.includes(char.id) ? 'border-brand-highlight' : 'border-transparent hover:border-slate-500'}`}>
                                            <img src={char.imageUrl} alt={char.name} className="w-full h-auto aspect-square object-cover" />
                                            <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1">
                                                <p className="text-xs text-white text-center truncate">{char.name}</p>
                                            </div>
                                            {selectedCharIds.includes(char.id) && (
                                                <div className="absolute inset-0 bg-brand-accent/50 flex items-center justify-center">
                                                    <CheckIcon />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Story Prompt */}
                        <div className="bg-brand-secondary p-6 rounded-lg space-y-4">
                            <h3 className="text-xl font-semibold border-b border-slate-600 pb-2 text-right">٣. اكتب قصتك</h3>
                            <div className="relative">
                                <label htmlFor="story-prompt" className="flex justify-between items-center text-sm font-medium text-brand-text-secondary mb-1 text-right">
                                    <span>يمكنك الإشارة إلى الشخصيات المختارة باستخدام "@"</span>
                                    <button onClick={handleGetStoryIdeas} disabled={isLoadingIdeas} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 flex items-center p-1 rounded">
                                        {isLoadingIdeas ? 'جاري البحث...' : 'احصل على أفكار للقصص'}
                                        {!isLoadingIdeas && <IdeaIcon />}
                                    </button>
                                </label>
                                 <div className="relative">
                                    <textarea
                                        id="story-prompt" ref={textareaRef} rows={10} value={storyPrompt} onChange={handlePromptChange}
                                        className="w-full bg-brand-primary border border-slate-600 rounded-md p-3 pl-10 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-right"
                                        placeholder="اكتب قصتك هنا... أو اطلب من الذكاء الاصطناعي أن يحسنها لك!"
                                    />
                                    <button 
                                        onClick={handleRefine} 
                                        disabled={isRefining || !storyPrompt} 
                                        className="absolute left-2 top-2 text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 p-1 rounded-full transition bg-brand-primary/50 hover:bg-brand-secondary"
                                        title="تحسين القصة بالذكاء الاصطناعي">
                                        {isRefining ? <TinySpinner /> : <MagicIcon />}
                                    </button>
                                </div>
                                {mention && filteredMentionChars.length > 0 && (
                                    <div className="absolute z-10 bg-brand-primary border border-slate-600 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                                        {filteredMentionChars.map(c => (
                                            <button key={c.id} onClick={() => handleMentionSelect(c.name)} className="block w-full text-right px-4 py-2 text-sm hover:bg-brand-accent">
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                { (isLoadingIdeas || storyIdeas.length > 0) && (
                                    <div className="mt-2 space-y-2 p-3 bg-brand-primary border border-slate-700 rounded-md max-h-48 overflow-y-auto">
                                        {isLoadingIdeas && <div className="flex justify-center p-4"><LoadingSpinner message="جاري توليد الأفكار..." /></div>}
                                        {storyIdeas.map((idea, index) => (
                                            <div key={index} className="text-right p-2 border-b border-slate-600 last:border-b-0">
                                                <p className="text-sm text-brand-text-secondary mb-2">{idea}</p>
                                                <button onClick={() => handleUseStoryIdea(idea)} className="text-xs font-bold px-3 py-1 bg-brand-accent rounded-md hover:bg-brand-highlight transition">
                                                    استخدم هذه الفكرة
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <button onClick={handleGenerateStory} className="px-8 py-3 bg-brand-accent hover:bg-brand-highlight transition rounded-md font-bold text-lg disabled:bg-slate-700 disabled:cursor-not-allowed">
                                    إنشاء القصة والمشاهد
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* --- Step 2: Results --- */}
                {step === 2 && generatedStory && (
                    <div className="space-y-6">
                        <div className="bg-brand-secondary p-6 rounded-lg">
                            <p className="text-brand-text-secondary text-right">{generatedStory.originalPrompt}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {generatedStory.scenes.map(scene => (
                                <div key={scene.id} className="bg-brand-secondary rounded-lg overflow-hidden">
                                    <img src={scene.imageUrl} alt="Scene" className="w-full h-auto" />
                                    <div className="p-4 text-sm text-brand-text-secondary text-right">
                                        <p>{scene.voiceoverPrompt}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleSaveAndClose} className="px-8 py-3 bg-brand-success hover:bg-emerald-400 transition rounded-md font-bold text-lg">
                                حفظ القصة وإغلاق
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Story Detail View ---
const StoryDetailView: React.FC<{
    story: Story;
    onBack: () => void;
}> = ({ story, onBack }) => {

    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [isDownloading, setIsDownloading] = useState(false);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedStates(prev => ({ ...prev, [id]: true }));
            setTimeout(() => setCopiedStates(prev => ({...prev, [id]: false})), 2000);
        });
    };
    
    const handleDownloadAssets = async () => {
        setIsDownloading(true);
        // @ts-ignore - JSZip is loaded from CDN
        const zip = new JSZip();

        // Add voiceover script
        const voiceoverScript = story.scenes.map((scene, index) => `المشهد ${index + 1}:\n${scene.voiceoverPrompt}`).join('\n\n');
        zip.file("voiceover_script.txt", voiceoverScript);

        // Add images
        const imagePromises = story.scenes.map(async (scene, index) => {
            const response = await fetch(scene.imageUrl);
            const blob = await response.blob();
            const fileExtension = blob.type.split('/')[1] || 'jpg';
            zip.file(`scene_${index + 1}.${fileExtension}`, blob);
        });

        await Promise.all(imagePromises);

        zip.generateAsync({ type: "blob" }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${story.name}_assets.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsDownloading(false);
        });
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-brand-secondary transition">
                        <BackIcon />
                    </button>
                    <h2 className="text-3xl font-bold">{story.name}</h2>
                </div>
                 <button onClick={handleDownloadAssets} disabled={isDownloading} className="flex items-center px-4 py-2 bg-brand-accent hover:bg-brand-highlight rounded-md font-semibold transition disabled:bg-slate-600">
                    {isDownloading ? 'جاري التحضير...' : 'تنزيل الأصول'}
                    {!isDownloading && <ZipIcon />}
                </button>
            </div>
            
            <div className="bg-brand-secondary p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-2 text-right">ملخص القصة</h3>
                <p className="text-brand-text-secondary text-right">{story.originalPrompt}</p>
                 <div className="flex gap-4 mt-4 justify-end">
                    {story.characters.map(char => (
                        <div key={char.id} className="flex items-center gap-2 bg-brand-primary p-2 rounded-lg">
                            <img src={char.imageUrl} alt={char.name} className="w-8 h-8 rounded-full object-cover"/>
                            <span className="text-sm font-semibold">{char.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {story.scenes.map((scene, index) => (
                    <div key={scene.id} className="bg-brand-secondary rounded-lg overflow-hidden shadow-lg border border-slate-700">
                        <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className="w-full h-auto" />
                        <div className="p-4 space-y-3 text-right">
                             <div>
                                <h4 className="font-bold text-brand-text">المشهد {index + 1}: نص التعليق الصوتي</h4>
                                <p className="text-sm text-brand-text-secondary mt-1">{scene.voiceoverPrompt}</p>
                                <button onClick={() => handleCopy(scene.voiceoverPrompt, `vo-${scene.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1 float-left">
                                    {copiedStates[`vo-${scene.id}`] ? <SmallCheckIcon /> : <CopyIcon />}
                                    {copiedStates[`vo-${scene.id}`] ? 'تم النسخ' : 'نسخ النص'}
                                </button>
                            </div>
                            <div className="border-t border-slate-600 pt-3">
                                <h4 className="font-bold text-brand-text">وصف الصورة (Prompt)</h4>
                                <p className="text-sm text-brand-text-secondary mt-1" dir="ltr">{scene.imagePrompt}</p>
                                <button onClick={() => handleCopy(scene.imagePrompt, `img-${scene.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1 float-left">
                                     {copiedStates[`img-${scene.id}`] ? <SmallCheckIcon /> : <CopyIcon />}
                                    {copiedStates[`img-${scene.id}`] ? 'تم النسخ' : 'نسخ الوصف'}
                                </button>
                            </div>
                             <div className="border-t border-slate-600 pt-3">
                                <h4 className="font-bold text-brand-text">وصف الحركة (Animation)</h4>
                                <p className="text-sm text-brand-text-secondary mt-1" dir="ltr">{scene.animationPrompt}</p>
                                <button onClick={() => handleCopy(scene.animationPrompt, `anim-${scene.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1 float-left">
                                     {copiedStates[`anim-${scene.id}`] ? <SmallCheckIcon /> : <CopyIcon />}
                                    {copiedStates[`anim-${scene.id}`] ? 'تم النسخ' : 'نسخ الوصف'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AppContent: React.FC = () => {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [view, setView] = useState<'characters' | 'stories'>('stories');
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [isCharCreatorOpen, setIsCharCreatorOpen] = useState(false);
    const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    const [deletingCharacter, setDeletingCharacter] = useState<Character | null>(null);
    const [deletingStory, setDeletingStory] = useState<Story | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { addToast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            await db.initDB();
            const [chars, storiesData] = await Promise.all([
                db.getAllCharacters(),
                db.getAllStories(),
            ]);
            setCharacters(chars);
            setStories(storiesData);
        } catch (err) {
            console.error("Failed to load data from DB", err);
            addToast('فشل تحميل البيانات المحفوظة.', 'danger');
        } finally {
            setIsLoadingData(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleImportSuccess = useCallback(() => {
        setIsSettingsModalOpen(false); // Close settings
        loadData().then(() => {
            addToast('تم استيراد البيانات بنجاح!', 'success');
        });
    }, [loadData, addToast]);


    const onAddCharacter = async (char: Character) => {
        await db.addCharacter(char);
        setCharacters(prev => [...prev, char]);
        addToast(`تم حفظ الشخصية ${char.name} بنجاح!`, 'success');
    };
    
    const onUpdateCharacter = async (char: Character) => {
        await db.updateCharacter(char);
        setCharacters(prev => prev.map(c => c.id === char.id ? char : c));
        setEditingCharacter(null);
        addToast(`تم تحديث الشخصية ${char.name} بنجاح!`, 'success');
    };
    
    const onDeleteCharacter = async () => {
        if (!deletingCharacter) return;
        await db.deleteCharacter(deletingCharacter.id);
        setCharacters(prev => prev.filter(c => c.id !== deletingCharacter.id));
        addToast(`تم حذف الشخصية ${deletingCharacter.name}.`, 'info');
        setDeletingCharacter(null);
    };

    const onAddStory = async (story: Story) => {
        await db.addStory(story);
        setStories(prev => [...prev, story]);
        addToast(`تم حفظ القصة ${story.name} بنجاح!`, 'success');
    };
    
    const onDeleteStory = async () => {
        if (!deletingStory) return;
        await db.deleteStory(deletingStory.id);
        setStories(prev => prev.filter(s => s.id !== deletingStory.id));
        addToast(`تم حذف القصة ${deletingStory.name}.`, 'info');
        setDeletingStory(null);
    };
    
    if (isLoadingData) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner message="جاري تحميل الاستوديو الخاص بك..." />
            </div>
        );
    }

    if (selectedStory) {
        return <StoryDetailView story={selectedStory} onBack={() => setSelectedStory(null)} />;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black">استوديو القصص</h1>
                 <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-full hover:bg-brand-secondary transition">
                    <SettingsIcon />
                </button>
            </header>

            <div className="flex justify-center mb-8">
                <div className="bg-brand-secondary p-1 rounded-full flex items-center space-x-1">
                    <button onClick={() => setView('stories')} className={`px-6 py-2 rounded-full transition ${view === 'stories' ? 'bg-brand-accent' : 'hover:bg-slate-700'} flex items-center`}><StoryIcon /> القصص</button>
                    <button onClick={() => setView('characters')} className={`px-6 py-2 rounded-full transition ${view === 'characters' ? 'bg-brand-accent' : 'hover:bg-slate-700'} flex items-center`}><CharacterIcon /> الشخصيات</button>
                </div>
            </div>

            {view === 'stories' && (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <button onClick={() => setIsStoryCreatorOpen(true)} className="flex flex-col items-center justify-center bg-brand-secondary hover:bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg p-6 transition min-h-[250px]">
                            <PlusIcon />
                            <span className="mt-2 font-semibold">إنشاء قصة جديدة</span>
                        </button>
                        {stories.map(story => (
                           <div key={story.id} className="bg-brand-secondary rounded-lg overflow-hidden group relative">
                                <button onClick={() => setSelectedStory(story)} className="w-full text-left">
                                    <img src={story.scenes[0]?.imageUrl || 'placeholder.jpg'} alt={story.name} className="w-full h-40 object-cover"/>
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg truncate">{story.name}</h3>
                                        <p className="text-sm text-brand-text-secondary">{story.scenes.length} مشهد</p>
                                    </div>
                                </button>
                                <button onClick={() => setDeletingStory(story)} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-rose-400 hover:bg-rose-500 hover:text-white transition opacity-0 group-hover:opacity-100">
                                    <TrashIcon />
                                </button>
                           </div>
                        ))}
                    </div>
                     {stories.length === 0 && (
                        <div className="text-center py-16 text-brand-text-secondary">
                            <h2 className="text-2xl font-bold mb-2">لم يتم العثور على قصص</h2>
                            <p>انقر على "إنشاء قصة جديدة" لبدء مغامرتك الأولى.</p>
                        </div>
                    )}
                </div>
            )}

            {view === 'characters' && (
                <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        <button onClick={() => setIsCharCreatorOpen(true)} className="flex flex-col items-center justify-center bg-brand-secondary hover:bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg p-6 transition min-h-[250px]">
                             <PlusIcon />
                            <span className="mt-2 font-semibold">إنشاء شخصية جديدة</span>
                        </button>
                         {characters.map(char => (
                           <div key={char.id} className="bg-brand-secondary rounded-lg overflow-hidden group relative">
                                <img src={char.imageUrl} alt={char.name} className="w-full h-auto aspect-square object-cover"/>
                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                    <h3 className="font-bold text-white text-center">{char.name}</h3>
                                </div>
                                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCharacter(char)} className="p-2 bg-black/50 rounded-full text-indigo-300 hover:bg-indigo-500 hover:text-white transition">
                                        <EditIcon />
                                    </button>
                                     <button onClick={() => setDeletingCharacter(char)} className="p-2 bg-black/50 rounded-full text-rose-400 hover:bg-rose-500 hover:text-white transition">
                                        <TrashIcon />
                                    </button>
                                </div>
                           </div>
                        ))}
                    </div>
                    {characters.length === 0 && (
                         <div className="text-center py-16 text-brand-text-secondary">
                            <h2 className="text-2xl font-bold mb-2">لا توجد شخصيات</h2>
                            <p>انقر على "إنشاء شخصية جديدة" لإضافة أول بطل لقصصك.</p>
                        </div>
                    )}
                </div>
            )}
            
            {isCharCreatorOpen && <CharacterCreator onClose={() => setIsCharCreatorOpen(false)} onSave={onAddCharacter} />}
            {editingCharacter && <CharacterEditor character={editingCharacter} onClose={() => setEditingCharacter(null)} onSave={onUpdateCharacter} />}
            {isStoryCreatorOpen && <StoryCreatorWizard characters={characters} onAddStory={onAddStory} onClose={() => setIsStoryCreatorOpen(false)} />}
            {isSettingsModalOpen && <SettingsModal onClose={() => setIsSettingsModalOpen(false)} onImportSuccess={handleImportSuccess} />}

            <Modal isOpen={!!deletingCharacter} onClose={() => setDeletingCharacter(null)} onConfirm={onDeleteCharacter} title={`حذف شخصية "${deletingCharacter?.name}"`}>
                <p>هل أنت متأكد من رغبتك في حذف هذه الشخصية؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </Modal>
             <Modal isOpen={!!deletingStory} onClose={() => setDeletingStory(null)} onConfirm={onDeleteStory} title={`حذف قصة "${deletingStory?.name}"`}>
                <p>هل أنت متأكد من رغبتك في حذف هذه القصة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </Modal>
        </div>
    );
};


const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;