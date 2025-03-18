import type { FileData, AnalyticsResponse } from '../types';
import { analyzeData } from './api';

/**
 * Analyzes data using the backend API
 * This approach uses AI-driven preprocessing to identify relevant columns and analysis methods
 * based on the user's query, with intelligent chunking and token management
 */
export async function analyzeDataWithDeepseek(
  query: string,
  data: FileData,
  apiKey: string
): Promise<AnalyticsResponse> {
  if (!apiKey.trim()) {
    throw new Error('DeepSeek API key is required');
  }

  if (!query.trim()) {
    throw new Error('Query is required');
  }

  if (!data || !data.headers || !data.rows || data.rows.length === 0) {
    throw new Error('Invalid or empty data file');
  }

  try {
    console.log('Starting analysis with AI-driven preprocessing and query intent analysis...');
    console.log(`Dataset size: ${data.rows.length} rows, ${data.headers.length} columns`);
    
    // Check if dataset is extremely large and warn the user
    if (data.rows.length > 10000) {
      console.warn(`Warning: Dataset is very large (${data.rows.length} rows). Analysis may take longer and use aggressive sampling.`);
    }
    
    // Call the backend API
    const result = await analyzeData(query, data, apiKey);
    
    return result;
  } catch (error: any) {
    console.error('DeepSeek API Error:', error);
    
    // Re-throw the error
    throw error;
  }
} 