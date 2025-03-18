from app.models.schemas import FileData, AnalyticsResponse, QueryIntent
from app.services.preprocessing_service import preprocess_data, analyze_query_and_identify_columns
from app.services.deepseek_service import call_deepseek_api
from typing import Dict, Any, List
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def analyze_data(query: str, data: FileData, api_key: str) -> AnalyticsResponse:
    """
    Main function to analyze data using DeepSeek API
    
    Args:
        query: The user's query
        data: The data to analyze
        api_key: DeepSeek API key
    
    Returns:
        AnalyticsResponse with answer and optional visualization
    """
    if not query.strip():
        raise ValueError("Query is required")
    
    if not api_key.strip():
        raise ValueError("API key is required")
    
    if not data or not data.headers or not data.rows or len(data.rows) == 0:
        raise ValueError("Invalid or empty data file")
    
    try:
        logger.info(f"Starting analysis with AI-driven preprocessing...")
        logger.info(f"Dataset size: {len(data.rows)} rows, {len(data.headers)} columns")
        
        # Step 1: Analyze query intent and identify relevant columns in one API call
        try:
            query_intent, relevant_columns = await analyze_query_and_identify_columns(query, data, api_key)
            logger.info(f"Query intent: {query_intent}")
            logger.info(f"Identified {len(relevant_columns)} relevant columns: {', '.join(relevant_columns)}")
            
            # Step 2: Filter and sample data
            preprocessed_data = await preprocess_data(query, data, api_key, query_intent, relevant_columns)
            logger.info(f"Preprocessed data: {len(preprocessed_data.rows)} rows, {len(preprocessed_data.headers)} columns")
        except Exception as preprocess_error:
            logger.error(f"Error in preprocessing: {str(preprocess_error)}")
            # Use default intent and original data if preprocessing fails
            query_intent = {"analysisType": "descriptive", "visualizationType": "none", "aggregationType": "none"}
            preprocessed_data = data
            logger.info("Using original data due to preprocessing error")
        
        # Step 3: Call DeepSeek API for analysis
        result = await call_deepseek_api(query, preprocessed_data, api_key, query_intent)
        
        return result
    except Exception as e:
        logger.error(f"Error in analyze_data: {str(e)}")
        
        # Handle specific error cases
        error_message = str(e).lower()
        
        if "api key" in error_message or "authentication" in error_message or "auth" in error_message:
            raise ValueError("Invalid API key. Please check your DeepSeek API key.")
        elif "rate limit" in error_message or "too many requests" in error_message:
            raise ValueError("Too many requests. Please wait a moment and try again.")
        elif "maximum context length" in error_message or "token limit" in error_message:
            raise ValueError(
                "The dataset is too large for the DeepSeek API token limits. " +
                "Please try one of the following:\n" +
                "1. Use a more specific query that focuses on fewer columns\n" +
                "2. Reduce your dataset size before uploading\n" +
                "3. Try analyzing a subset of your data\n" +
                "4. Break your analysis into multiple smaller queries"
            )
        elif "timeout" in error_message or "timed out" in error_message:
            raise ValueError("The request timed out. Please try again with a smaller dataset or a simpler query.")
        elif "preprocessing" in error_message:
            raise ValueError(
                "Error during data preprocessing. " +
                "Please try one of the following:\n" +
                "1. Simplify your dataset structure\n" +
                "2. Ensure your data is in a standard format\n" +
                "3. Try a more specific query"
            )
        
        # Re-raise the exception with a more user-friendly message
        raise ValueError(f"Error analyzing data: {str(e)}") 