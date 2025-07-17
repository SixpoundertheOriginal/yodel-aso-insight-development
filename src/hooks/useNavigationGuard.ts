import { useEffect } from 'react';
import { useAuditProcessing } from '@/context/AuditProcessingContext';

export const useNavigationGuard = () => {
  const { state } = useAuditProcessing();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (state.isProcessing) {
        event.preventDefault();
        event.returnValue = 'Processing is currently running. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.isProcessing) {
        // User returned to tab while processing - could show notification
        console.log('Returned to processing tab');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isProcessing]);
};