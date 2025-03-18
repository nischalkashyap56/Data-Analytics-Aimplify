import axios from 'axios';
import type { AnalyticsResponse, FileData } from '../types';

// Create an axios instance with the backend API URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 300000,  // Timeout of 5 minutes
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Test the connection to the backend API
 * @returns True if the connection is successful, false otherwise
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
}

/**
 * Convert FileData to CSV format using the backend API
 * Falls back to local conversion if the backend is unavailable
 * 
 * @param data The data to convert
 * @returns CSV string
 */
async function convertToCSV(data: FileData): Promise<string> {
  try {
    // Try to use the backend API for conversion
    const response = await api.post('/convert-to-csv', data);
    if (response.data && response.data.csv) {
      return response.data.csv;
    }
    throw new Error('Invalid response from CSV conversion endpoint');
  } catch (error) {
    console.error('Error converting data to CSV using backend:', error);
    // Fall back to local conversion
    return convertToCSVLocal(data);
  }
}

/**
 * Analyze data using the backend API
 * 
 * @param query The query to analyze
 * @param data The data to analyze
 * @param apiKey The DeepSeek API key
 * @returns The analysis response
 */
export async function analyzeData(
  query: string,
  data: FileData,
  apiKey: string
): Promise<AnalyticsResponse> {
  if (!apiKey.trim()) {
    throw new Error('API key is required');
  }

  if (!query.trim()) {
    throw new Error('Query is required');
  }

  if (!data || !data.headers || !data.rows || data.rows.length === 0) {
    throw new Error('Invalid or empty data file');
  }

  try {
    // Create a FormData object to send the file and query
    const formData = new FormData();
    formData.append('query', query);
    formData.append('api_key', apiKey);
    
    // Convert data to a file
    const fileContent = await convertToCSV(data);
    const file = new Blob([fileContent], { type: 'text/csv' });
    formData.append('file', file, 'data.csv');
    
    // Test the connection before making the actual request
    try {
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        // Try alternative URL if the primary one fails
        console.log('Trying alternative backend URL...');
        api.defaults.baseURL = 'http://127.0.0.1:8000/api';
        const isConnectedAlt = await testBackendConnection();
        if (!isConnectedAlt) {
          throw new Error('Cannot connect to the backend API. Please make sure the backend server is running.');
        }
      }
    } catch (healthError) {
      if (axios.isAxiosError(healthError)) {
        if (!navigator.onLine || healthError.code === 'ERR_NETWORK') {
          throw new Error('Cannot connect to the API. Please check your internet connection and make sure the backend server is running.');
        }
      }
      throw healthError;
    }
    
    // Send the request to the backend
    const response = await api.post<AnalyticsResponse>(
      '/analyze',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (!response.data) {
      throw new Error('No data received from the API');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Log detailed error information
      console.error('API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout
        }
      });

      if (!navigator.onLine || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to the API. Please check your internet connection and make sure the backend server is running.');
      }

      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please try again.');
      }

      switch (error.response?.status) {
        case 400:
          throw new Error('Invalid request. Please check your query and data format.');
        case 401:
          throw new Error('Invalid API key. Please check your DeepSeek API key.');
        case 403:
          throw new Error('Access denied. Please check your API key permissions.');
        case 404:
          throw new Error('API endpoint not found. Please check if the backend server is running correctly.');
        case 429:
          throw new Error('Too many requests. Please wait a moment and try again.');
        case 413:
          throw new Error('Data file is too large. Please try a smaller file.');
        case 500:
          throw new Error('Server error. Please try again later.');
        case 503:
          throw new Error('Service temporarily unavailable. Please try again later.');
      }

      const apiError = error.response?.data as { detail: string };
      if (apiError?.detail) {
        throw new Error(`API Error: ${apiError.detail}`);
      }
      
      throw new Error(`Request failed (${error.response?.status || 'unknown status'}). Please try again.`);
    }
    
    // Log non-Axios errors
    console.error('Unexpected error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });

    throw new Error('An unexpected error occurred. Please try again.');
  }
}

/**
 * Convert FileData to CSV format locally
 * This is a fallback method if the backend is unavailable
 * 
 * @param data The data to convert
 * @returns CSV string
 */
function convertToCSVLocal(data: FileData): string {
  const { headers, rows } = data;
  
  // Create header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = rows.map(row => 
    row.map(cell => {
      if (cell === null || cell === undefined) {
        return '';
      }
      
      const cellStr = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
      
      // Escape commas and quotes
      if (cellStr.includes(',') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      
      return cellStr;
    }).join(',')
  );
  
  // Combine all rows
  return [headerRow, ...dataRows].join('\n');
}