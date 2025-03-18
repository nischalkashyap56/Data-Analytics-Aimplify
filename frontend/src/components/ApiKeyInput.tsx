import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, Trash } from 'lucide-react';

// Local storage key for the API key
const API_KEY_STORAGE_KEY = 'deepseek_api_key';

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
}

export function ApiKeyInput({ apiKey, onApiKeyChange }: ApiKeyInputProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Check if the API key is saved in local storage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      onApiKeyChange(savedApiKey);
      setIsSaved(true);
    }
  }, [onApiKeyChange]);
  
  // Save the API key to local storage
  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      setIsSaved(true);
    }
  };
  
  // Clear the saved API key
  const clearSavedApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    onApiKeyChange('');
    setIsSaved(false);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5 text-gray-500" />
        <label className="text-sm font-medium text-gray-700">
          DeepSeek API Key
        </label>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Enter your DeepSeek API key"
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        {isSaved ? (
          <button
            type="button"
            onClick={clearSavedApiKey}
            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center gap-1"
            title="Clear saved API key"
          >
            <Trash className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={saveApiKey}
            disabled={!apiKey.trim()}
            className="px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="Save API key to browser"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        {isSaved 
          ? 'Your API key is saved in this browser. Click "Clear" to remove it.' 
          : 'Enter your DeepSeek API key. You can save it to avoid entering it again.'}
      </p>
      
      <div className="text-xs text-gray-500 flex items-start gap-1 mt-1">
        <span className="font-medium">Note:</span>
        <span>
          Your API key is stored locally in your browser and never sent to our servers.
          You can get an API key from the <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DeepSeek Platform</a>.
        </span>
      </div>
    </div>
  );
} 