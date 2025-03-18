import { useState, useEffect } from 'react';
import { FileData, AnalyticsResponse } from './types';
import { QueryInput } from './components/QueryInput';
import { Visualization } from './components/Visualization';
import { ApiKeyInput } from './components/ApiKeyInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import UploadDataset from './components/UploadDataset';
import { analyzeDataWithDeepseek } from './services/deepseekAnalytics';
import { Database, AlertCircle, Info, Server, BarChart, Upload } from 'lucide-react';
import { testBackendConnection } from './services/api';

type TabType = 'analytics' | 'upload';

function App() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  // Check backend status on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        // Try the primary connection method
        const isConnected = await testBackendConnection();
        if (isConnected) {
          setBackendStatus('online');
          return;
        }
        
        // If primary connection fails, try alternative URLs
        console.log('Primary connection failed, trying alternative URLs...');
        
        // Try direct IP connection
        try {
          const response = await fetch('http://127.0.0.1:8000/api/health', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
          });
          
          if (response.ok) {
            setBackendStatus('online');
            return;
          }
        } catch (e) {
          console.error('Alternative connection failed:', e);
        }
        
        setBackendStatus('offline');
      } catch (error) {
        console.error('Backend connection error:', error);
        setBackendStatus('offline');
      }
    };

    checkBackendStatus();
    
    // Set up an interval to periodically check the backend status
    const intervalId = setInterval(checkBackendStatus, 30000); // Check every 30 seconds
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const handleQuery = async (query: string) => {
    if (!fileData) {
      setError('Please upload a file first');
      return;
    }

    if (!apiKey.trim()) {
      setError('Please enter your DeepSeek API key');
      return;
    }

    if (backendStatus === 'offline') {
      // Try one more time before giving up
      try {
        const isConnected = await testBackendConnection();
        if (!isConnected) {
          setError('Cannot connect to the backend server. Please make sure the backend is running.');
          return;
        } else {
          setBackendStatus('online');
        }
      } catch (e) {
        setError('Cannot connect to the backend server. Please make sure the backend is running.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    
    try {
      const response = await analyzeDataWithDeepseek(query, fileData, apiKey);
      setResult(response);
    } catch (error: any) {
      // Handle specific error types
      if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED') || 
          error.message?.includes('ENOTFOUND') || error.message?.includes('Connection') || 
          !navigator.onLine) {
        setError('Cannot connect to the backend server. Please make sure the backend is running.');
        setBackendStatus('offline');
      } else if (error.message?.includes('timeout')) {
        setError('Request timed out. The analysis may be taking too long or the server is overloaded.');
      } else if (error.message?.includes('maximum context length') || error.message?.includes('token limit')) {
        setError(
          'The dataset is too large for processing. Please try one of the following:\n' +
          '1. Use a more specific query that focuses on fewer columns\n' +
          '2. Reduce your dataset size before uploading\n' +
          '3. Try analyzing a subset of your data'
        );
      } else {
        setError(error instanceof Error ? error.message : 'Failed to analyze data. Please try again.');
      }
      console.error('Analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Database className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Data Analytics Platform
          </h1>
          
          {/* Backend status indicator */}
          <div className="ml-auto flex items-center gap-2">
            <Server className="h-5 w-5" />
            {backendStatus === 'checking' ? (
              <span className="text-gray-500">Checking backend...</span>
            ) : backendStatus === 'online' ? (
              <span className="text-green-600 flex items-center gap-1">
                <span className="h-2 w-2 bg-green-600 rounded-full"></span>
                Backend online
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-1">
                <span className="h-2 w-2 bg-red-600 rounded-full"></span>
                Backend offline
              </span>
            )}
          </div>
        </div>

        {backendStatus === 'offline' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Backend server is not available</p>
              <p className="mt-1">Please make sure the backend server is running. You can start it by running:</p>
              <pre className="mt-2 p-2 bg-red-100 rounded text-red-800 overflow-x-auto">
                cd backend && python run.py
              </pre>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart className="h-5 w-5" />
            Data Analytics
          </button>
          <button
            className={`py-2 px-4 font-medium flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload className="h-5 w-5" />
            Upload Dataset
          </button>
        </div>

        {activeTab === 'analytics' ? (
          <div className="grid gap-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">1. Upload Your Data</h2>
              <UploadDataset onFileUpload={setFileData} />
              {fileData && (
                <p className="mt-4 text-sm text-green-600">
                  ✓ File uploaded successfully with {fileData.rows.length} rows and {fileData.headers.length} columns
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">2. Configure API</h2>
              <ApiKeyInput apiKey={apiKey} onApiKeyChange={setApiKey} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">3. Ask Questions</h2>
              <QueryInput onSubmit={handleQuery} isLoading={isLoading} />
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Example questions you can ask:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>What is the average value in column X?</li>
                    <li>Show me a bar chart of the top 5 values in column Y</li>
                    <li>Is there a correlation between column A and column B?</li>
                    <li>Summarize the key insights from this data</li>
                  </ul>
                </div>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {(isLoading || result) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Results</h2>
                
                {isLoading ? (
                  <div className="py-8">
                    <LoadingIndicator message={`Analyzing data for query: "${currentQuery}"`} />
                  </div>
                ) : result && (
                  <>
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-line">{result.answer}</p>
                    </div>
                    {result.visualization && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">Visualization</h3>
                        <Visualization
                          type={result.visualization.type}
                          data={result.visualization.data}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <UploadDataset onFileUpload={setFileData} />
        )}
      </div>
    </div>
  );
}

export default App;