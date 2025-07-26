import json
from datetime import datetime
from .connection import get_connection  # Import DB connection utility

# Save uploaded file metadata into the 'files' table
def save_file_metadata(user_id, filename, uploaded_at):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO files (user_id, filename, uploaded_at) VALUES (%s, %s, %s)",
        (user_id, filename, uploaded_at)
    )
    conn.commit()
    cur.close()
    conn.close()

# Save search history (commented out; can be enabled if needed)
# def save_search_history(user_id, query, answer):
#     conn = get_connection()
#     cur = conn.cursor()
#     cur.execute(
#         "INSERT INTO search_history (user_id, query, answer, created_at) VALUES (%s, %s, %s, NOW())",
#         (user_id, query, answer)
#     )
#     conn.commit()
#     cur.close()
#     conn.close()

# Delete old files and search history based on a cutoff datetime (commented out; can be enabled)
# def delete_old_files_and_history(cutoff):
#     conn = get_connection()
#     cur = conn.cursor()
#     # Delete files uploaded before the cutoff
#     cur.execute(
#         "DELETE FROM files WHERE uploaded_at < %s",
#         (cutoff,)
#     )
#     # Delete search history before the cutoff
#     cur.execute(
#         "DELETE FROM search_history WHERE created_at < %s",
#         (cutoff,)
#     )
#     conn.commit()

# Create a new chat conversation for the user
def create_new_conversation(user_id: str) -> str:
    import uuid
    conn = get_connection()
    cur = conn.cursor()
    
    chat_id = str(uuid.uuid4())  # Generate a unique chat ID
    initial_conversation = {
        "messages": [],
        "metadata": {
            "title": "New Chat",
            "created_at": datetime.now().isoformat()
        }
    }
    
    # Insert the new conversation into the 'chat_history' table
    cur.execute(
        "INSERT INTO chat_history (user_id, chat_id, conversation) VALUES (%s, %s, %s)",
        (user_id, chat_id, json.dumps(initial_conversation))
    )
    conn.commit()
    cur.close()
    conn.close()
    return chat_id

# Retrieve the most recent 30 conversations for the given user in the past 30 days
def get_user_conversations(user_id: str, limit: int = 30):
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT conversation FROM chat_history
            WHERE user_id = %s AND created_at >= NOW() - INTERVAL 30 DAY
            ORDER BY created_at DESC
            LIMIT %s
        """, (user_id, limit))
        conversations = cur.fetchall()
        return conversations
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

# Get user details using token (used for authentication)
def get_user_by_token(token):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    # This function can be improved with token validation logic
    cur.execute(
        "SELECT * FROM users WHERE token = %s",
        (token,)
    )
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user
