from app.models.schemas import FileData, AnalyticsResponse
from app.services.file_service import convert_to_csv
from typing import Dict, Any, List
import openai
import logging
import json
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def call_deepseek_api(
    query: str, 
    data: FileData, 
    api_key: str, 
    query_intent: Dict[str, Any]
) -> AnalyticsResponse:
    """
    Call the DeepSeek API to analyze data
    
    Args:
        query: The user's query
        data: The preprocessed data to analyze
        api_key: DeepSeek API key
        query_intent: The query intent
    
    Returns:
        AnalyticsResponse with answer and optional visualization
    """
    try:
        if not api_key or not api_key.strip():
            raise ValueError("DeepSeek API key is required")
            
        client = openai.OpenAI(
            api_key=api_key.strip(),
            base_url="https://api.deepseek.com/v1",
        )
        
        # Convert data to CSV format for easier processing
        csv_data = convert_to_csv(data)
        
        # Create intent info string
        intent_info = ""
        if query_intent:
            intent_info = f"\nThis is a {query_intent.get('analysisType', 'descriptive')} analysis"
            if query_intent.get('visualizationType') and query_intent.get('visualizationType') != 'none':
                intent_info += f" that may benefit from a {query_intent.get('visualizationType')} visualization"
            if query_intent.get('aggregationType') and query_intent.get('aggregationType') != 'none':
                intent_info += f" using {query_intent.get('aggregationType')} aggregation"
            intent_info += "."
        
        # Create system prompt
        system_prompt = f"""You are a data analysis assistant. Analyze the following data and answer the user's query: "{query}".{intent_info}
The data is in CSV format with the following structure:
- First row: Column headers
- Subsequent rows: Data values

Provide a clear, concise answer. If appropriate, suggest a visualization type (bar, line, or pie) and provide the data for it.

Your response should be in JSON format with the following structure:
{{
  "answer": "Your detailed answer here",
  "visualization": {{
    "type": "bar|line|pie",
    "data": [{{"name": "Category1", "value": 123}}, ...]
  }}
}}

Only include the visualization if it makes sense for the query. If no visualization is appropriate, omit the visualization field.
Make sure your entire response can be parsed as valid JSON."""
        
        # Call the DeepSeek API
        logger.info("Sending request to DeepSeek API...")
        response = client.chat.completions.create(
            model="deepseek-reasoner",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": csv_data}
            ],
            temperature=0.2,
            max_tokens=8000
        )
        
        logger.info("Received response from DeepSeek API")
        content = response.choices[0].message.content or '{}'
        
        # Extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', content, re.DOTALL)
        json_content = json_match.group(0) if json_match else content
        
        try:
            # Parse the response
            parsed_response = json.loads(json_content.strip())
            
            # Validate the response structure
            if not parsed_response.get("answer"):
                parsed_response["answer"] = "The analysis was completed, but no specific answer was provided."
            
            # Convert to AnalyticsResponse
            result = AnalyticsResponse(
                answer=parsed_response["answer"],
                visualization=parsed_response.get("visualization")
            )
            
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing DeepSeek response: {str(e)}")
            # Return a basic response with the raw content
            return AnalyticsResponse(answer=content)
            
    except Exception as e:
        logger.error(f"Error calling DeepSeek API: {str(e)}")
        
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
                "3. Try analyzing a subset of your data"
            )
        elif "timeout" in error_message or "timed out" in error_message:
            raise ValueError("The request timed out. Please try again with a smaller dataset or a simpler query.")
        elif "server" in error_message or "5xx" in error_message:
            raise ValueError("The DeepSeek API server encountered an error. Please try again later.")
        elif "network" in error_message or "connection" in error_message:
            raise ValueError("Network error while connecting to the DeepSeek API. Please check your internet connection.")
        
        # Re-raise the exception with a more user-friendly message
        raise ValueError(f"Error calling DeepSeek API: {str(e)}") 