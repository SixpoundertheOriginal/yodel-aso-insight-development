import React, { useState } from 'react';
import { systemApi } from '@/lib/admin-api';

export const WhoamiDebugTest: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testWhoami = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 [DEBUG TEST] Calling systemApi.whoami()...');
      const whoamiResult = await systemApi.whoami();
      console.log('🔍 [DEBUG TEST] Result:', whoamiResult);
      setResult(whoamiResult);
    } catch (err: any) {
      console.error('🔍 [DEBUG TEST] Error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Whoami Debug Test</h2>
      
      <div className="mb-4">
        <button
          onClick={testWhoami}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded"
        >
          {loading ? 'Testing...' : 'Test /whoami Endpoint'}
        </button>
      </div>

      <div className="text-sm text-gray-300 mb-4">
        <p>✅ <strong>DEPLOYED:</strong> Debug logging is active in admin-whoami function</p>
        <p>📋 <strong>INSTRUCTIONS:</strong></p>
        <ol className="list-decimal list-inside ml-4 mt-2">
          <li>Click the "Test /whoami Endpoint" button above</li>
          <li>Open browser dev tools (F12) > Console tab</li>
          <li>Look for debug output from the API call</li>
          <li>Go to <a href="https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions" className="text-orange-400 underline" target="_blank">Supabase Functions Dashboard</a></li>
          <li>Click "admin-whoami" → "Logs" tab</li>
          <li>Look for <code>[DEBUG/WHOAMI]</code> entries from the last few minutes</li>
          <li>Copy ALL debug log lines for analysis</li>
        </ol>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-500 rounded">
          <h3 className="font-semibold text-red-200 mb-2">Error:</h3>
          <pre className="text-red-300 text-sm overflow-x-auto">{error}</pre>
        </div>
      )}

      {result && (
        <div className="mb-4 p-3 bg-green-900 border border-green-500 rounded">
          <h3 className="font-semibold text-green-200 mb-2">Success - API Response:</h3>
          <pre className="text-green-300 text-sm overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-900 border border-blue-500 rounded">
        <h3 className="font-semibold text-blue-200 mb-2">Expected User ID:</h3>
        <p className="text-blue-300 font-mono">48977685-7795-49fa-953e-579d6a6739cb</p>
        <h3 className="font-semibold text-blue-200 mb-2 mt-3">Expected Organization ID:</h3>
        <p className="text-blue-300 font-mono">4b8d3f4e-6782-4305-9253-ac2179f1c319</p>
        <h3 className="font-semibold text-blue-200 mb-2 mt-3">Expected Role:</h3>
        <p className="text-blue-300 font-mono">ASO_MANAGER</p>
      </div>
    </div>
  );
};