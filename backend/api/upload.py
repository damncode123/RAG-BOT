# FastAPI and other module imports
from fastapi import APIRouter, File, UploadFile, Depends, BackgroundTasks, HTTPException
from api.auth import get_current_user                      # Dependency to get current authenticated user
from db.models import save_file_metadata                   # Function to save metadata to DB
from ingestion.pipeline import process_file                # Function that processes the uploaded file
from api.notifications import send_notification            # Function to notify the user
import datetime                                             # Used for timestamping
import logging                                              # For logging info, warnings, errors
import mimetypes                                            # (Not used here, but typically for MIME type detection)
import os                                                   # For file extension handling

# Initialize router instance for API route grouping
router = APIRouter()

# Supported file types with MIME types
SUPPORTED_EXTENSIONS = {
    # Text
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',

    # Office docs
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    # OpenDocument
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.odp': 'application/vnd.oasis.opendocument.presentation',

    # Source code files
    '.py': 'text/x-python',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.java': 'text/x-java-source',
    '.cpp': 'text/x-c++src',
    '.c': 'text/x-csrc',
    '.h': 'text/x-chdr',
    '.php': 'text/x-php',
    '.rb': 'text/x-ruby',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.swift': 'text/x-swift',
    '.kt': 'text/x-kotlin',
    '.scala': 'text/x-scala',
    '.sql': 'text/x-sql',
    '.sh': 'application/x-sh',
    '.bat': 'application/x-msdos-program',
    '.ps1': 'application/x-powershell',

    # Config
    '.yaml': 'application/x-yaml',
    '.yml': 'application/x-yaml',
    '.toml': 'application/toml',
    '.ini': 'text/plain',
    '.cfg': 'text/plain',
    '.conf': 'text/plain',

    # Data
    '.tsv': 'text/tab-separated-values',
    '.log': 'text/plain',
    '.dat': 'application/octet-stream',

    # Web
    '.css': 'text/css',
    '.scss': 'text/x-scss',
    '.sass': 'text/x-sass',
    '.less': 'text/x-less',

    # Misc
    '.tex': 'application/x-tex',
    '.rtf': 'application/rtf',
    '.bib': 'text/x-bibtex',
}

# Maximum allowed file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024

def validate_file(file: UploadFile) -> dict:
    """
    Validate the uploaded file: check if file exists, check extension support,
    and optionally validate content type.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Extract file extension
    file_extension = os.path.splitext(file.filename.lower())[1]

    # Reject unsupported file types
    if file_extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(SUPPORTED_EXTENSIONS.keys())}"
        )
    
    # Log warning if provided content_type doesn't match expected MIME type
    if file.content_type:
        expected_content_type = SUPPORTED_EXTENSIONS.get(file_extension)
        if expected_content_type and file.content_type != expected_content_type:
            logging.warning(f"Content type mismatch for {file.filename}: expected {expected_content_type}, got {file.content_type}")
    
    return {
        "filename": file.filename,
        "extension": file_extension,
        "content_type": file.content_type or SUPPORTED_EXTENSIONS.get(file_extension, "application/octet-stream")
    }

@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    file: UploadFile = File(...)
):
    """
    API endpoint to upload a file.
    File is validated, saved, and processed in the background.
    """
    try:
        logging.info("[UPLOAD] Starting upload endpoint")

        # Step 1: Validate the file
        file_info = validate_file(file)
        logging.info(f"[UPLOAD] File validated: {file_info['filename']}")

        # Step 2: Read file content and get its size
        contents = await file.read()
        file_size = len(contents)
        logging.info(f"[UPLOAD] File read, size: {file_size} bytes")

        # Step 3: Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Max: {MAX_FILE_SIZE // (1024*1024)}MB, got: {file_size // (1024*1024)}MB"
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Step 4: Save file metadata (e.g., filename, user, upload time)
        uploaded_at = datetime.datetime.utcnow()
        save_file_metadata(user["id"], file_info['filename'], uploaded_at)
        logging.info("[UPLOAD] File metadata saved")

        # Step 5: Define background task that processes the file and notifies the user
        def pipeline_and_notify():
            try:
                process_file(contents, file_info['filename'], user["id"])
                send_notification(user["id"], f"Your file '{file_info['filename']}' has been processed and is ready for queries.")
            except Exception as e:
                logging.error(f"[UPLOAD] Background processing failed: {e}")
                send_notification(user["id"], f"Error processing file '{file_info['filename']}': {str(e)}")

        # Step 6: Run background task (non-blocking)
        background_tasks.add_task(pipeline_and_notify)

        # Step 7: Return response
        return {
            "message": "File received, processing started.",
            "file_info": {
                "filename": file_info['filename'],
                "size_bytes": file_size,
                "content_type": file_info['content_type'],
                "uploaded_at": uploaded_at.isoformat()
            }
        }

    # Handle known errors
    except HTTPException:
        raise

    # Catch-all for unexpected issues
    except Exception as e:
        logging.error(f"[UPLOAD] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/upload/supported-types")
async def get_supported_file_types():
    """
    Returns a structured list of all supported file types,
    grouped by category (text, code, office, etc.).
    """
    return {
        "supported_extensions": list(SUPPORTED_EXTENSIONS.keys()),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "file_types": {
            "text_files": [ext for ext in SUPPORTED_EXTENSIONS if ext in ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm']],
            "office_documents": [ext for ext in SUPPORTED_EXTENSIONS if ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']],
            "code_files": [ext for ext in SUPPORTED_EXTENSIONS if ext in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sql', '.sh', '.bat', '.ps1']],
            "configuration_files": [ext for ext in SUPPORTED_EXTENSIONS if ext in ['.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf']],
            "data_files": [ext for ext in SUPPORTED_EXTENSIONS if ext in ['.tsv', '.log', '.dat']],
            "web_files": [ext for ext in SUPPORTED_EXTENSIONS if ext in ['.css', '.scss', '.sass', '.less']],
            "other_formats": [ext for ext in SUPPORTED_EXTENSIONS if ext in ['.tex', '.rtf', '.bib', '.odt', '.ods', '.odp']]
        }
    }
