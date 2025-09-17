import React, { useState, useRef } from 'react';
import { apiKeyManager } from '../services/apiKeyManager';
import * as db from '../services/db';
import { AppBackup } from '../types';
import Modal from './Modal';


const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 00-1 1v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 9.586V4a1 1 0 00-1-1z" /><path d="M3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>;
const ImportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17a1 1 0 001-1v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L9 10.414V16a1 1 0 001 1z" /><path d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>;


export const SettingsModal: React.FC<{ onClose: () => void; onImportSuccess: () => void; }> = ({ onClose, onImportSuccess }) => {
    const [keys, setKeys] = useState(apiKeyManager.getAllKeys());
    const [activeKey, setActiveKey] = useState(apiKeyManager.getActiveKey());
    const [newKeys, setNewKeys] = useState('');
    const [error, setError] = useState('');

    const [importError, setImportError] = useState('');
    const [backupData, setBackupData] = useState<AppBackup | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddKeys = () => {
        if (!newKeys.trim()) {
            setError('حقل الإدخال فارغ.');
            return;
        }

        const potentialKeys = newKeys.split(/[\s, \n]+/).filter(k => k.trim() !== '');
        
        if (potentialKeys.length === 0) {
            setError('الرجاء إدخال مفتاح واحد صالح على الأقل.');
            return;
        }

        let addedCount = 0;
        potentialKeys.forEach(key => {
            const trimmedKey = key.trim();
            if (apiKeyManager.addKey(trimmedKey)) {
                addedCount++;
            }
        });

        if (addedCount > 0) {
            setError('');
            setKeys(apiKeyManager.getAllKeys());
            setActiveKey(apiKeyManager.getActiveKey());
            setNewKeys('');
        } else {
            setError('كل المفاتيح المدخلة موجودة بالفعل أو غير صالحة.');
        }
    };

    const handleRemoveKey = (keyToRemove: string) => {
        apiKeyManager.removeKey(keyToRemove);
        setKeys(apiKeyManager.getAllKeys());
        setActiveKey(apiKeyManager.getActiveKey());
    };

    const handleSetActiveKey = (key: string) => {
        apiKeyManager.setActiveKey(key);
        setActiveKey(key);
    };

    const maskKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    const handleExport = async () => {
        setImportError('');
        try {
            const data = await db.exportAllData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            a.download = `story-studio-backup-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            setImportError("حدث خطأ أثناء تصدير البيانات.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File could not be read.");
                const data = JSON.parse(text) as AppBackup;

                if (Array.isArray(data.characters) && Array.isArray(data.stories)) {
                    setBackupData(data);
                    setIsConfirmModalOpen(true);
                } else {
                    throw new Error("ملف النسخ الاحتياطي غير صالح أو تالف.");
                }
            } catch (err) {
                setImportError(err instanceof Error ? err.message : "فشل في قراءة الملف.");
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.onerror = () => setImportError("فشل في قراءة الملف.");
        reader.readAsText(file);
    };

    const confirmImport = async () => {
        if (!backupData) return;
        try {
            await db.importData(backupData);
            setIsConfirmModalOpen(false);
            setBackupData(null);
            onImportSuccess();
        } catch (err) {
            setImportError("حدث خطأ أثناء استيراد البيانات.");
            setIsConfirmModalOpen(false);
        }
    };

    return (
        <>
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-brand-secondary w-full max-w-xl rounded-xl shadow-2xl border border-slate-700 p-8 space-y-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-right text-brand-text">الإعدادات</h2>
                {error && <p className="bg-brand-danger/20 text-red-400 p-3 rounded-md text-right">{error}</p>}
                
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-right text-brand-text">إدارة مفاتيح API</h3>
                    <label htmlFor="new-key-input" className="block text-sm font-medium text-brand-text-secondary text-right">إضافة مفاتيح جديدة</label>
                    <div className="flex flex-col gap-2">
                        <textarea
                            id="new-key-input"
                            rows={4}
                            value={newKeys}
                            onChange={e => setNewKeys(e.target.value)}
                            placeholder="أدخل مفتاحًا واحدًا أو أكثر، مفصولاً بفاصلة أو سطر جديد"
                            className="w-full bg-brand-primary border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-brand-accent focus:outline-none transition text-left"
                            dir="ltr"
                        />
                         <button onClick={handleAddKeys} className="px-4 py-2 bg-brand-accent text-white rounded-md font-semibold hover:bg-brand-highlight transition self-end">
                            إضافة المفاتيح
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                     <h3 className="text-lg font-semibold text-right text-brand-text-secondary">المفاتيح المحفوظة</h3>
                     <div className="bg-brand-primary rounded-lg p-3 max-h-60 overflow-y-auto space-y-2 border border-slate-700">
                        {keys.length === 0 ? (
                            <p className="text-center text-slate-500 py-4">لا توجد مفاتيح محفوظة.</p>
                        ) : (
                            keys.map(key => (
                                <div key={key} className={`flex items-center justify-between p-2 rounded-md ${activeKey === key ? 'bg-brand-accent/20' : 'bg-slate-800'}`}>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleRemoveKey(key)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-md transition">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSetActiveKey(key)}>
                                        <span className="font-mono text-sm text-brand-text-secondary">{maskKey(key)}</span>
                                        {activeKey === key && (
                                            <span className="text-xs font-bold bg-brand-success text-white px-2 py-0.5 rounded-full">نشط</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                </div>
                
                <hr className="border-slate-600 my-6" />

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-right text-brand-text">النسخ الاحتياطي والاستعادة</h2>
                    <p className="text-sm text-brand-text-secondary text-right">
                        قم بتصدير جميع بياناتك (الشخصيات والقصص) إلى ملف لحفظها أو نقلها إلى جهاز آخر.
                    </p>
                    {importError && <p className="bg-brand-danger/20 text-red-400 p-3 rounded-md text-right">{importError}</p>}
                    <div className="flex justify-end gap-4">
                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button onClick={handleImportClick} className="flex items-center px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
                            استيراد البيانات
                            <ImportIcon />
                        </button>
                        <button onClick={handleExport} className="flex items-center px-4 py-2 rounded-md bg-brand-accent hover:bg-brand-highlight transition-colors font-semibold">
                            تصدير البيانات
                            <ExportIcon />
                        </button>
                    </div>
                </div>


                 <div className="flex justify-end pt-4 border-t border-slate-700 mt-6">
                    <button onClick={onClose} className="px-6 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
        <Modal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            onConfirm={confirmImport}
            title="تأكيد الاستيراد"
            confirmText="نعم، استورد"
        >
            <p className="text-right">
                هل أنت متأكد؟ سيؤدي هذا إلى مسح جميع الشخصيات والقصص الحالية واستبدالها بالبيانات من الملف الذي تم تحميله. لا يمكن التراجع عن هذا الإجراء.
            </p>
        </Modal>
        </>
    );
};
