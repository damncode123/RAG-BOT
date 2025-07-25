from fastapi import APIRouter, File, UploadFile, Depends, BackgroundTasks, HTTPException
from api.auth import get_current_user
from db.models import save_file_metadata
from ingestion.pipeline import process_file
from api.notifications import send_notification
import datetime
import logging
import mimetypes
import os

router = APIRouter()

# Supported file types and their extensions
SUPPORTED_EXTENSIONS = {
    # Text files
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',
    
    # Office documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    # OpenDocument formats
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.odp': 'application/vnd.oasis.opendocument.presentation',
    
    # Code files
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
    
    # Configuration files
    '.yaml': 'application/x-yaml',
    '.yml': 'application/x-yaml',
    '.toml': 'application/toml',
    '.ini': 'text/plain',
    '.cfg': 'text/plain',
    '.conf': 'text/plain',
    
    # Data files
    '.tsv': 'text/tab-separated-values',
    '.log': 'text/plain',
    '.dat': 'application/octet-stream',
    
    # Web files
    '.css': 'text/css',
    '.scss': 'text/x-scss',
    '.sass': 'text/x-sass',
    '.less': 'text/x-less',
    
    # Other text formats
    '.tex': 'application/x-tex',
    '.rtf': 'application/rtf',
    '.bib': 'text/x-bibtex',
    '.tex': 'application/x-tex',
}

# Maximum file size (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024

def validate_file(file: UploadFile) -> dict:
    """
    Validate uploaded file and return file info
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Get file extension
    file_extension = os.path.splitext(file.filename.lower())[1]
    
    # Check if file type is supported
    if file_extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(SUPPORTED_EXTENSIONS.keys())}"
        )
    
    # Validate content type if provided
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
    Upload and process a document file.
    
    Supports various document types including:
    - Text files (.txt, .md, .csv, .json, .xml, .html)
    - Office documents (.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx)
    - OpenDocument formats (.odt, .ods, .odp)
    - Code files (.py, .js, .ts, .java, .cpp, .c, .php, .rb, .go, .rs, .swift, .kt, .scala, .sql)
    - Configuration files (.yaml, .yml, .toml, .ini, .cfg, .conf)
    - Data files (.tsv, .log, .dat)
    - Web files (.css, .scss, .sass, .less)
    - Other formats (.tex, .rtf, .bib)
    
    Maximum file size: 50MB
    """
    try:
        logging.info("[UPLOAD] Starting upload endpoint")
        # Validate file
        logging.info("[UPLOAD] Validating file")
        file_info = validate_file(file)
        logging.info(f"[UPLOAD] File validated: {file_info['filename']}")
        
        # Log the upload attempt
        logging.info(f"[UPLOAD] Upload attempt for user {user['id']}, file: {file_info['filename']} ({file_info['content_type']})")
        
        # Read file content
        logging.info("[UPLOAD] Reading file content")
        contents = await file.read()
        file_size = len(contents)
        logging.info(f"[UPLOAD] File read, size: {file_size} bytes")
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            logging.error("[UPLOAD] File too large")
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB, got {file_size // (1024*1024)}MB"
            )
        
        if file_size == 0:
            logging.error("[UPLOAD] File is empty")
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Save file metadata to DB
        logging.info("[UPLOAD] Saving file metadata to DB")
        uploaded_at = datetime.datetime.utcnow()
        save_file_metadata(user["id"], file_info['filename'], uploaded_at)
        logging.info("[UPLOAD] File metadata saved")
        
        # Trigger ingestion pipeline in background
        def pipeline_and_notify():
            try:
                logging.info("[UPLOAD] Starting background pipeline_and_notify")
                process_file(contents, file_info['filename'], user["id"])
                logging.info("[UPLOAD] Background processing done, sending notification")
                send_notification(user["id"], f"Your file '{file_info['filename']}' has been processed and is ready for queries.")
            except Exception as e:
                logging.error(f"[UPLOAD] Error in background processing for file {file_info['filename']}: {e}")
                send_notification(user["id"], f"Error processing file '{file_info['filename']}': {str(e)}")
        
        logging.info("[UPLOAD] Adding background task")
        background_tasks.add_task(pipeline_and_notify)
        logging.info("[UPLOAD] Background task added, returning response")
        
        return {
            "message": "File received, processing started.",
            "file_info": {
                "filename": file_info['filename'],
                "size_bytes": file_size,
                "content_type": file_info['content_type'],
                "uploaded_at": uploaded_at.isoformat()
            }
        }
        
    except HTTPException:
        logging.error("[UPLOAD] HTTPException raised")
        raise
    except Exception as e:
        logging.error(f"[UPLOAD] Unexpected error processing upload: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/upload/supported-types")
async def get_supported_file_types():
    """
    Get list of supported file types and their extensions
    """
    return {
        "supported_extensions": list(SUPPORTED_EXTENSIONS.keys()),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "file_types": {
            "text_files": [ext for ext in SUPPORTED_EXTENSIONS.keys() if ext in ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm']],
            "office_documents": [ext for ext in SUPPORTED_EXTENSIONS.keys() if ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']],
            "code_files": [ext for ext in SUPPORTED_EXTENSIONS.keys() if ext in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sql', '.sh', '.bat', '.ps1']],
            "configuration_files": [ext for ext in SUPPORTED_EXTENSIONS.keys() if ext in ['.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf']],
            "data_files": [ext for ext in SUPPORTED_EXTENSIONS.keys() if ext in ['.tsv', '.log', '.dat']],
            "web_files": [ext for ext in SUPPORTED_EXTENSIONS.keys() if ext in ['.css', '.scss', '.sass', '.less']],
            "other_formats": [ext for ext in SUPPORTED_EXTENSIONS.keys() if ext in ['.tex', '.rtf', '.bib', '.odt', '.ods', '.odp']]
        }
    } 