
import React from 'react';

// Icons
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin h-6 w-6 text-brand-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const PendingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={2} /></svg>;

type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

interface ProgressIndicatorProps {
  title: string;
  steps: string[];
  statuses: Record<number, StepStatus>;
  currentStepIndex: number;
  errorMessage?: string;
  onClose?: () => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  title,
  steps,
  statuses,
  currentStepIndex,
  errorMessage,
  onClose,
}) => {
  const completedSteps = Object.values(statuses).filter(s => s === 'completed').length;
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon />;
      case 'in-progress': return <SpinnerIcon />;
      case 'failed': return <XCircleIcon />;
      case 'pending':
      default:
        return <PendingIcon />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
      <div className="bg-brand-secondary w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-center text-brand-text">{title}</h2>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-brand-text">التقدم الإجمالي</span>
                <span className="text-sm font-medium text-brand-text">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-brand-primary rounded-full h-2.5">
                <div className="bg-brand-accent h-2.5 rounded-full transition-all duration-500" style={{width: `${progressPercentage}%`}}></div>
            </div>
          </div>
          
          {/* Steps List */}
          <div className="space-y-3">
            {steps.map((step, index) => {
                const status = statuses[index] || 'pending';
                const isCurrent = index === currentStepIndex && status !== 'failed';
                const isCompleted = status === 'completed';
                const isFailed = status === 'failed';

                let textColor = 'text-slate-500';
                if (isCurrent || isCompleted) textColor = 'text-brand-text';
                if (isFailed) textColor = 'text-red-400';
                
                return (
                    <div key={index} className="flex items-center space-x-4 space-x-reverse">
                        <div className="flex-shrink-0">
                            {getStatusIcon(status)}
                        </div>
                        <div className={`flex-grow text-right font-medium ${textColor}`}>
                            {step}
                        </div>
                    </div>
                );
            })}
          </div>

          {errorMessage && (
            <div className="bg-brand-danger/20 text-red-400 p-3 rounded-md text-right mt-4">
                <p className="font-bold">حدث خطأ</p>
                <p className="text-sm">{errorMessage}</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {(errorMessage && onClose) && (
             <div className="p-4 border-t border-slate-700 flex-shrink-0 text-center">
                 <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
                    إغلاق
                 </button>
             </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;
