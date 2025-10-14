import { useEffect, useState } from 'react';

export const EnvironmentIndicator = () => {
  const [env, setEnv] = useState<string>('');

  useEffect(() => {
    const currentEnv = import.meta.env.VITE_ENV || 'unknown';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    
    setEnv(currentEnv);
    
    console.log('🌍 Environment:', currentEnv.toUpperCase());
    console.log('🔗 Supabase URL:', supabaseUrl);
  }, []);

  // Only show in non-production environments
  if (!env || env === 'production') return null;

  const bgColor = env === 'development' ? 'bg-blue-500' : 'bg-orange-500';
  const label = env === 'development' ? 'DEV' : 'STAGING';

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-3 py-1 rounded-full text-xs font-mono z-50 shadow-lg`}>
      {label}
    </div>
  );
};
