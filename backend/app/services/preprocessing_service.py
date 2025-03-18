from app.models.schemas import FileData, QueryIntent
from typing import List, Dict, Any, Set, Optional, Tuple
import openai
import logging
import json
import random
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def analyze_query_and_identify_columns(query: str, data: FileData, api_key: str) -> Tuple[Dict[str, Any], List[str]]:
    """
    Analyze the query intent and identify relevant columns in a single API call
    
    Args:
        query: The user's query
        data: The data to analyze
        api_key: DeepSeek API key
    
    Returns:
        Tuple containing:
        - Dictionary with analysis type, visualization type, and aggregation type
        - List of relevant column names
    """
    try:
        client = openai.OpenAI(
            api_key=api_key.strip(),
            base_url="https://api.deepseek.com/v1",
        )
        
        # Create a sample of the data
        sample_size = min(5, len(data.rows))
        sample_rows = data.rows[:sample_size]
        
        # Create a description of each column with sample values
        column_descriptions = []
        for i, header in enumerate(data.headers):
            sample_values = [str(row[i]) for row in sample_rows]
            column_descriptions.append(f'Column "{header}": Sample values = [{", ".join(sample_values)}]')
        
        data_description = "\n".join(column_descriptions)
        
        prompt = f"""You are a data analysis assistant. Analyze the following query and dataset to:
1. Determine the query intent (analysis type, visualization type, aggregation type)
2. Identify which columns in the dataset are most relevant to answering the query

Query: "{query}"

The dataset has the following columns and sample data:
{data_description}

For the query intent, determine:
- What type of analysis is needed (descriptive, comparative, predictive, or exploratory)
- What type of visualization would be most appropriate (bar, line, pie, scatter, or none)
- What type of aggregation is needed (sum, average, count, min, max, or none)

For the relevant columns, consider:
- Direct mentions of column names in the query
- Semantic relevance of columns to the query's intent
- Columns that would be needed for calculations or visualizations implied by the query

Return your analysis as a JSON object with the following structure:
{{
  "queryIntent": {{
    "analysisType": "descriptive|comparative|predictive|exploratory",
    "visualizationType": "bar|line|pie|scatter|none",
    "aggregationType": "sum|average|count|min|max|none"
  }},
  "relevantColumns": ["column1", "column2", "column3"]
}}

Do not include any explanation or other text, just the JSON object."""
        
        response = client.chat.completions.create(
            model="deepseek-reasoner",
            messages=[
                {"role": "system", "content": "You are a data analysis assistant that helps analyze queries and identify relevant data."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1500
        )
        
        content = response.choices[0].message.content or '{}'
        
        # Extract JSON object from the response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        json_content = json_match.group(0) if json_match else content
        
        try:
            result = json.loads(json_content)
            
            # Extract query intent
            query_intent = result.get("queryIntent", {})
            if not query_intent:
                query_intent = {"analysisType": "descriptive", "visualizationType": "none", "aggregationType": "none"}
            
            # Extract relevant columns
            columns = result.get("relevantColumns", [])
            # Validate that all columns exist in the dataset
            valid_columns = [col for col in columns if col in data.headers]
            
            # If no valid columns were found, return all columns
            if not valid_columns:
                valid_columns = data.headers
            
            return query_intent, valid_columns
        except:
            # Return defaults if parsing fails
            default_intent = {"analysisType": "descriptive", "visualizationType": "none", "aggregationType": "none"}
            fallback_columns = identify_relevant_columns_by_keywords(query, data)
            return default_intent, fallback_columns
            
    except Exception as e:
        logger.error(f"Error analyzing query and identifying columns: {str(e)}")
        # Return defaults if there's an error
        default_intent = {"analysisType": "descriptive", "visualizationType": "none", "aggregationType": "none"}
        fallback_columns = identify_relevant_columns_by_keywords(query, data)
        return default_intent, fallback_columns





# Legacy functions - kept for backward compatibility
# New code should use analyze_query_and_identify_columns instead
async def analyze_query_intent(query: str, api_key: str) -> Dict[str, Any]:
    """
    Analyze the query intent using DeepSeek API (legacy function, use analyze_query_and_identify_columns instead)
    
    Args:
        query: The user's query
        api_key: DeepSeek API key
    
    Returns:
        Dictionary with analysis type, visualization type, and aggregation type
    """
    try:
        # For backward compatibility, we'll use the combined function but only return the intent
        dummy_data = FileData(headers=["dummy"], rows=[["dummy"]])
        intent, _ = await analyze_query_and_identify_columns(query, dummy_data, api_key)
        return intent
    except Exception as e:
        logger.error(f"Error analyzing query intent: {str(e)}")
        # Return default intent if there's an error
        return {"analysisType": "descriptive", "visualizationType": "none", "aggregationType": "none"}

# Legacy function - kept for backward compatibility
# New code should use analyze_query_and_identify_columns instead
async def identify_relevant_columns(query: str, data: FileData, api_key: str) -> List[str]:
    """
    Identify relevant columns for the query (legacy function, use analyze_query_and_identify_columns instead)
    
    Args:
        query: The user's query
        data: The data to analyze
        api_key: DeepSeek API key
    
    Returns:
        List of relevant column names
    """
    try:
        # For backward compatibility, we'll use the combined function but only return the columns
        _, columns = await analyze_query_and_identify_columns(query, data, api_key)
        return columns
    except Exception as e:
        logger.error(f"Error identifying relevant columns: {str(e)}")
        # Fall back to keyword-based approach
        return identify_relevant_columns_by_keywords(query, data)

async def preprocess_data(query: str, data: FileData, api_key: str, query_intent: Dict[str, Any] = None, relevant_columns: List[str] = None) -> FileData:
    """
    Preprocess data based on query and intent
    
    Args:
        query: The user's query
        data: The data to preprocess
        api_key: DeepSeek API key
        query_intent: The query intent (optional, will be determined if not provided)
        relevant_columns: The relevant columns (optional, will be determined if not provided)
    
    Returns:
        Preprocessed FileData
    """
    try:
        # Step 1: Analyze query and identify relevant columns if not provided
        if query_intent is None or relevant_columns is None:
            query_intent, relevant_columns = await analyze_query_and_identify_columns(query, data, api_key)
            logger.info(f"Query intent: {query_intent}")
        
        logger.info(f"Identified {len(relevant_columns)} relevant columns: {', '.join(relevant_columns)}")
        
        # Step 2: Filter columns
        filtered_data = filter_columns(data, relevant_columns)
        
        # Step 3: Sample rows if needed
        max_rows = 200
        if len(filtered_data.rows) > max_rows:
            sampled_data = sample_data(filtered_data, max_rows)
            logger.info(f"Sampled data from {len(filtered_data.rows)} to {len(sampled_data.rows)} rows")
            return sampled_data
        
        return filtered_data
    except Exception as e:
        logger.error(f"Error preprocessing data: {str(e)}")
        # Return original data if preprocessing fails
        return data

def filter_columns(data: FileData, columns: List[str]) -> FileData:
    """
    Filter the data to include only the specified columns
    
    Args:
        data: The data to filter
        columns: The columns to keep
    
    Returns:
        Filtered FileData
    """
    # If all columns are included, return the original data
    if len(columns) == len(data.headers) and all(col in data.headers for col in columns):
        return data
    
    # Get the indices of the columns to keep
    column_indices = [data.headers.index(col) for col in columns if col in data.headers]
    
    # Filter the rows to include only the specified columns
    filtered_rows = [[row[i] for i in column_indices] for row in data.rows]
    
    return FileData(
        headers=[data.headers[i] for i in column_indices],
        rows=filtered_rows
    )

def sample_data(data: FileData, sample_size: int) -> FileData:
    """
    Sample the data to reduce its size while maintaining representativeness
    
    Args:
        data: The data to sample
        sample_size: The desired sample size
    
    Returns:
        Sampled FileData
    """
    if len(data.rows) <= sample_size:
        return data
    
    # Take a stratified sample
    sampled_rows = []
    
    # Always include the first and last rows
    sampled_rows.append(data.rows[0])
    if len(data.rows) > 1:
        sampled_rows.append(data.rows[-1])
    
    # Take a stratified sample of the remaining rows
    remaining_sample_size = sample_size - len(sampled_rows)
    step = (len(data.rows) - 2) / remaining_sample_size
    
    for i in range(remaining_sample_size):
        index = int(1 + i * step)
        if 0 < index < len(data.rows) - 1:
            sampled_rows.append(data.rows[index])
    
    return FileData(headers=data.headers, rows=sampled_rows)

def identify_relevant_columns_by_keywords(query: str, data: FileData) -> List[str]:
    """
    Identify relevant columns using keyword matching (fallback method)
    
    Args:
        query: The user's query
        data: The data to analyze
    
    Returns:
        List of relevant column names
    """
    # Extract keywords from the query
    keywords = extract_keywords(query)
    
    if not keywords:
        return data.headers  # No keywords found, return all columns
    
    # Score each column based on relevance to the query
    column_scores = []
    for header in data.headers:
        header_words = extract_keywords(header)
        score = 0
        
        # Check for direct keyword matches in column name
        for keyword in keywords:
            if keyword in header.lower():
                score += 2  # Direct match in column name is highly relevant
            
            # Check for partial matches
            for word in header_words:
                if keyword in word or word in keyword:
                    score += 1  # Partial match
        
        column_scores.append({"header": header, "score": score})
    
    # Sort columns by score and keep only those with a positive score
    relevant_columns = [
        col["header"] for col in sorted(column_scores, key=lambda x: x["score"], reverse=True)
        if col["score"] > 0
    ]
    
    # If no relevant columns found, return all columns
    if not relevant_columns:
        return data.headers
    
    return relevant_columns

def extract_keywords(text: str) -> List[str]:
    """
    Extract keywords from text
    
    Args:
        text: The text to extract keywords from
    
    Returns:
        List of keywords
    """
    # Convert to lowercase
    lowercase_text = text.lower()
    
    # Define stop words
    stop_words = {
        'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
        'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'like', 
        'from', 'of', 'as', 'what', 'which', 'who', 'whom', 'whose', 'where',
        'when', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
        'most', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
        'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
    }
    
    # Split into words and filter out stop words and short words
    words = re.split(r'\s+|[,.;:!?()[\]{}\'"]', lowercase_text)
    
    return [
        word for word in words 
        if len(word) > 2 and word not in stop_words and not word.isdigit()
    ] 