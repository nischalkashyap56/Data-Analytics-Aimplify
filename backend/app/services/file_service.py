from app.models.schemas import FileData
import json
import logging
from typing import List, Any
import io
import csv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_to_csv(data: FileData) -> str:
    """
    Convert FileData to CSV format.

    Args:
        data: The FileData instance containing headers and rows.

    Returns:
        CSV string representation of the provided data.
    """
    try:
        # Create an in-memory text stream for CSV output
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write the header row
        writer.writerow(data.headers)
        
        # Write all data rows
        writer.writerows(data.rows)
        
        # Retrieve the CSV content from the stream
        csv_content = output.getvalue()
        output.close()
        
        return csv_content
    except Exception as e:
        logger.error(f"Error converting data to CSV: {str(e)}")
        raise