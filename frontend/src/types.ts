export interface FileData {
  headers: string[];
  rows: any[][];
}

export interface VisualizationData {
  type: 'bar' | 'line' | 'pie';
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
}

export interface AnalyticsResponse {
  answer: string;
  visualization?: VisualizationData;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}