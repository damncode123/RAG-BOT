import json
from datetime import datetime
from .connection import get_connection

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

# def delete_old_files_and_history(cutoff):
#     conn = get_connection()
#     cur = conn.cursor()
#     # Delete old files
#     cur.execute(
#         "DELETE FROM files WHERE uploaded_at < %s",
#         (cutoff,)
#     )
#     # Delete old search history
#     cur.execute(
#         "DELETE FROM search_history WHERE created_at < %s",
#         (cutoff,)
#     )
#     conn.commit()

def create_new_conversation(user_id: str) -> str:
    import uuid
    import json
    conn = get_connection()
    cur = conn.cursor()
    
    chat_id = str(uuid.uuid4())
    initial_conversation = {
        "messages": [],
        "metadata": {
            "title": "New Chat",
            "created_at": datetime.now().isoformat()
        }
    }
    
    cur.execute(
        "INSERT INTO chat_history (user_id, chat_id, conversation) VALUES (%s, %s, %s)",
        (user_id, chat_id, json.dumps(initial_conversation))
    )
    conn.commit()
    cur.close()
    conn.close()
    return chat_id


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

def get_user_by_token(token):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    # TODO: Implement token validation and user lookup
    cur.execute(
        "SELECT * FROM users WHERE token = %s",
        (token,)
    )
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user 