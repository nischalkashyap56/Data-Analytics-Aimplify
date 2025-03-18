import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { FileData } from '../types';

interface UploadDatasetProps {
  onFileUpload: (data: FileData) => void;
}

const UploadDataset: React.FC<UploadDatasetProps> = ({ onFileUpload }) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState<{ rows: number; columns: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadStatus('idle');
    setError(null);
    setFileName(file.name);
    
    try {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          complete: (results) => {
            const headers = results.data[0] as string[];
            const rows = results.data.slice(1) as any[][];
            
            // Filter out empty rows
            const filteredRows = rows.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
            
            // Ensure all data is serializable
            const sanitizedRows = filteredRows.map(row =>
              row.map(cell =>
                cell instanceof Date ? cell.toISOString() :
                typeof cell === 'object' ? JSON.stringify(cell) :
                cell
              )
            );

            const fileData = {
              headers,
              rows: sanitizedRows
            };
            
            setFileStats({
              rows: sanitizedRows.length,
              columns: headers.length
            });
            
            onFileUpload(fileData);
            setUploadStatus('success');
            setIsUploading(false);
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            setError('Error processing CSV file. Please check the file format.');
            setUploadStatus('error');
            setIsUploading(false);
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          // Filter out empty rows
          const filteredRows = rows.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
          
          // Ensure all data is serializable
          const sanitizedRows = filteredRows.map(row =>
            row.map(cell =>
              cell instanceof Date ? cell.toISOString() :
              typeof cell === 'object' ? JSON.stringify(cell) :
              cell
            )
          );

          const fileData = {
            headers,
            rows: sanitizedRows
          };
          
          setFileStats({
            rows: sanitizedRows.length,
            columns: headers.length
          });
          
          onFileUpload(fileData);
          setUploadStatus('success');
          setIsUploading(false);
        } catch (error) {
          console.error('Excel parsing error:', error);
          setError('Error processing Excel file. Please check the file format.');
          setUploadStatus('error');
          setIsUploading(false);
        }
      } else {
        setError('Unsupported file format. Please upload a CSV, XLSX, or XLS file.');
        setUploadStatus('error');
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error processing file. Please check the file format and try again.');
      setUploadStatus('error');
      setIsUploading(false);
    }
  }, [onFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Dataset</h2>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          uploadStatus === 'error' 
            ? 'border-red-300 bg-red-50' 
            : uploadStatus === 'success' 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-300 hover:border-blue-500'
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploadStatus === 'success' ? (
          <div>
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 text-lg font-medium text-gray-900">
              File uploaded successfully!
            </p>
            <div className="mt-2 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">{fileName}</span>
            </div>
            {fileStats && (
              <p className="mt-2 text-sm text-gray-600">
                {fileStats.rows} rows × {fileStats.columns} columns
              </p>
            )}
            <button
              onClick={() => {
                setUploadStatus('idle');
                setFileName(null);
                setFileStats(null);
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Upload Another File
            </button>
          </div>
        ) : uploadStatus === 'error' ? (
          <div>
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 text-lg font-medium text-gray-900">
              Upload Failed
            </p>
            <p className="mt-2 text-sm text-red-600">
              {error || 'An error occurred while uploading the file.'}
            </p>
            <button
              onClick={() => {
                setUploadStatus('idle');
                setError(null);
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">
              Drag and drop your dataset here
            </p>
            <p className="mt-2 text-sm text-gray-500">
              or
            </p>
            <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
              Browse Files
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleChange}
                disabled={isUploading}
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">
              Supports CSV, XLSX, and XLS files
            </p>
          </>
        )}
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Dataset Guidelines</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>Your dataset should have headers in the first row</li>
          <li>For best results, ensure your data is clean and properly formatted</li>
          <li>Large datasets ({'>'}10,000 rows) may take longer to process</li>
          <li>Sensitive data will be processed securely and not stored permanently</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadDataset; 