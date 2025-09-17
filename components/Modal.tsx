import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmText?: string;
  confirmColor?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  children,
  confirmText = "تأكيد",
  confirmColor = "bg-brand-danger hover:bg-rose-500",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-brand-secondary rounded-lg shadow-2xl p-6 w-full max-w-md m-4 border border-slate-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-right text-brand-text">{title}</h2>
        <div className="text-brand-text-secondary mb-6 text-right">{children}</div>
        <div className="flex justify-end space-x-4 space-x-reverse">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md font-semibold transition-colors ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
