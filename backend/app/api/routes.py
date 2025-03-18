from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from app.models.schemas import AnalyticsResponse, FileData, QueryIntent
from app.services.analytics_service import analyze_data
from app.services.deepseek_service import call_deepseek_api
from app.services.file_service import convert_to_csv
import json
import logging
import pandas as pd
import io

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze", response_model=AnalyticsResponse)
async def analyze_data_endpoint(
    query: str = Form(...),
    file: UploadFile = File(...),
    api_key: str = Form(...)
):
    """
    Analyze data based on the provided query and file.
    
    - **query**: The analysis query
    - **file**: CSV or Excel file to analyze
    - **api_key**: DeepSeek API key
    """
    try:
        # Process the uploaded file
        file_data = await process_file(file)
        
        # Call the analytics service
        result = await analyze_data(query, file_data, api_key)
        
        return result
    except ValueError as e:
        # Handle specific error types with appropriate status codes
        logger.error(f"Value error in analyze_data_endpoint: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in analyze_data_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok"}

@router.post("/convert-to-csv", response_model=dict)
async def convert_to_csv_endpoint(data: FileData):
    """
    Convert FileData to CSV format
    
    Args:
        data: The FileData object to convert
        
    Returns:
        A dictionary containing the CSV string
    """
    try:
        csv_string = convert_to_csv(data)
        return {"csv": csv_string}
    except Exception as e:
        logger.error(f"Error converting data to CSV: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error converting data to CSV: {str(e)}")

async def process_file(file: UploadFile) -> FileData:
    """Process the uploaded file and convert it to FileData format"""
    try:
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a CSV or Excel file.")
        
        # Convert DataFrame to FileData format
        headers = df.columns.tolist()
        rows = df.values.tolist()
        
        # Ensure all data is serializable
        sanitized_rows = []
        for row in rows:
            sanitized_row = []
            for cell in row:
                if pd.isna(cell):
                    sanitized_row.append(None)
                elif isinstance(cell, (pd.Timestamp, pd.Period)):
                    sanitized_row.append(str(cell))
                else:
                    sanitized_row.append(cell)
            sanitized_rows.append(sanitized_row)
        
        return FileData(headers=headers, rows=sanitized_rows)
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}") 