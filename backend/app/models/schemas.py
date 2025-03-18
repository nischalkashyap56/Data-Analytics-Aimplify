from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union

class FileData(BaseModel):
    headers: List[str]
    rows: List[List[Any]]

class VisualizationData(BaseModel):
    type: str
    data: List[Dict[str, Any]]

class AnalyticsResponse(BaseModel):
    answer: str
    visualization: Optional[VisualizationData] = None

# Note: The following schemas were removed as they are not used in the codebase:
# - AnalyticsRequest
# - FilterCriteria
# - SortBy
# - RelevanceFilter

class QueryIntent(BaseModel):
    analysisType: str = Field(..., description="Type of analysis (descriptive, comparative, predictive, exploratory)")
    visualizationType: Optional[str] = Field(None, description="Type of visualization (bar, line, pie, scatter, none)")
    aggregationType: Optional[str] = Field(None, description="Type of aggregation (sum, average, count, min, max, none)") 