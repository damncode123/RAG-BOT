import json
import logging
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
def save_search_history(user_id, query, answer):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO search_history (user_id, query, answer, created_at) VALUES (%s, %s, %s, NOW())",
        (user_id, query, answer)
    )
    conn.commit()
    cur.close()
    conn.close()

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
            SELECT chat_id, conversation, created_at FROM chat_history
            WHERE user_id = %s AND created_at >= NOW() - INTERVAL 30 DAY
            ORDER BY created_at DESC
            LIMIT %s
        """, (user_id, limit))
        raw_conversations = cur.fetchall()

        # Format conversations for frontend
        formatted_conversations = []
        for row in raw_conversations:
            try:
                conversation_data = json.loads(row['conversation'])
                messages = conversation_data.get('messages', [])
                metadata = conversation_data.get('metadata', {})

                # Only include conversations that have at least one message
                if not messages or len(messages) == 0:
                    continue

                # Get preview text from the first user message
                preview_text = metadata.get('title', 'New Chat')
                for msg in messages:
                    # Look for user messages (could be role: "user" or isUser: true)
                    if msg.get('role') == 'user' or msg.get('isUser', False):
                        content = msg.get('content') or msg.get('text', '')
                        if content and content.strip():
                            preview_text = content.strip()[:50]  # Shorter preview
                            break

                formatted_conversations.append({
                    'conversation_id': row['chat_id'],
                    'preview_text': preview_text,
                    'last_updated': row['created_at'].isoformat() if row['created_at'] else datetime.now().isoformat(),
                    'message_count': len(messages)
                })
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error parsing conversation {row.get('chat_id', 'unknown')}: {e}")
                continue

        return formatted_conversations
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

# Get chat history for a specific conversation
def get_conversation_history(user_id: str, chat_id: str):
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT conversation FROM chat_history
            WHERE user_id = %s AND chat_id = %s
        """, (user_id, chat_id))
        result = cur.fetchone()

        if not result:
            return {"messages": []}

        conversation_data = json.loads(result['conversation'])
        stored_messages = conversation_data.get('messages', [])

        # Convert stored message format to frontend format
        formatted_messages = []
        for i, msg in enumerate(stored_messages):
            # Handle different message formats that might be stored
            if msg.get('role') == 'user':
                formatted_messages.append({
                    'id': f"msg_{i}_{chat_id}",
                    'text': msg.get('content', ''),
                    'isUser': True,
                    'timestamp': msg.get('timestamp', datetime.now().isoformat())
                })
            elif msg.get('role') == 'bot' or msg.get('role') == 'assistant':
                formatted_messages.append({
                    'id': f"msg_{i}_{chat_id}",
                    'text': msg.get('content', ''),
                    'isUser': False,
                    'timestamp': msg.get('timestamp', datetime.now().isoformat())
                })
            elif 'isUser' in msg:  # Already in frontend format
                formatted_messages.append({
                    'id': msg.get('id', f"msg_{i}_{chat_id}"),
                    'text': msg.get('text', ''),
                    'isUser': msg.get('isUser', False),
                    'timestamp': msg.get('timestamp', datetime.now().isoformat())
                })
            else:
                # Fallback for any other format
                formatted_messages.append({
                    'id': f"msg_{i}_{chat_id}",
                    'text': str(msg.get('content', msg.get('text', ''))),
                    'isUser': msg.get('role') == 'user' or msg.get('isUser', False),
                    'timestamp': msg.get('timestamp', datetime.now().isoformat())
                })

        return {"messages": formatted_messages}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

# Add messages to a conversation
def add_messages_to_conversation(user_id: str, chat_id: str, user_message: str, bot_response: str):
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        # Get current conversation
        cur.execute("""
            SELECT conversation FROM chat_history
            WHERE user_id = %s AND chat_id = %s
        """, (user_id, chat_id))
        result = cur.fetchone()

        if not result:
            # If conversation doesn't exist, create it
            initial_conversation = {
                "messages": [],
                "metadata": {
                    "title": "New Chat",
                    "created_at": datetime.now().isoformat()
                }
            }
            conversation_data = initial_conversation
        else:
            conversation_data = json.loads(result['conversation'])

        # Add new messages
        timestamp = datetime.now().isoformat()
        conversation_data['messages'].extend([
            {
                "role": "user",
                "content": user_message,
                "timestamp": timestamp
            },
            {
                "role": "bot",
                "content": bot_response,
                "timestamp": timestamp
            }
        ])

        # Update conversation in database
        if not result:
            # Insert new conversation
            cur.execute("""
                INSERT INTO chat_history (user_id, chat_id, conversation)
                VALUES (%s, %s, %s)
            """, (user_id, chat_id, json.dumps(conversation_data)))
        else:
            # Update existing conversation
            cur.execute("""
                UPDATE chat_history
                SET conversation = %s, updated_at = NOW()
                WHERE user_id = %s AND chat_id = %s
            """, (json.dumps(conversation_data), user_id, chat_id))

        conn.commit()

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

# Add message objects to a conversation (for upload cards, etc.)
def add_message_objects_to_conversation(chat_id: str, messages: list):
    """
    Add message objects directly to a conversation.
    Used for upload cards and other special message types.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        # Get current conversation
        cur.execute("""
            SELECT conversation FROM chat_history
            WHERE chat_id = %s
        """, (chat_id,))
        result = cur.fetchone()

        if not result:
            # If conversation doesn't exist, we can't add messages to it
            logging.warning(f"Conversation {chat_id} not found, cannot add messages")
            return False

        conversation_data = json.loads(result['conversation'])

        # Add new message objects
        conversation_data['messages'].extend(messages)

        # Update conversation in database
        cur.execute("""
            UPDATE chat_history
            SET conversation = %s, updated_at = %s
            WHERE chat_id = %s
        """, (json.dumps(conversation_data), datetime.now(), chat_id))

        conn.commit()
        logging.info(f"Added {len(messages)} message(s) to conversation {chat_id}")
        return True

    except Exception as e:
        logging.error(f"Error adding message objects to conversation {chat_id}: {e}")
        return False
    finally:
        cur.close()
        conn.close()

# Delete a conversation by ID (only if user owns it)
def delete_conversation_by_id(user_id: str, conversation_id: str):
    """
    Delete a conversation by ID, but only if the user owns it.
    Returns True if deleted successfully, False otherwise.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        # First, check if the conversation exists and belongs to the user
        cur.execute("""
            SELECT chat_id FROM chat_history
            WHERE chat_id = %s AND user_id = %s
        """, (conversation_id, user_id))

        result = cur.fetchone()
        if not result:
            logging.warning(f"Conversation {conversation_id} not found or doesn't belong to user {user_id}")
            return False

        # Delete the conversation
        cur.execute("""
            DELETE FROM chat_history
            WHERE chat_id = %s AND user_id = %s
        """, (conversation_id, user_id))

        conn.commit()

        # Check if any rows were affected
        if cur.rowcount > 0:
            logging.info(f"Successfully deleted conversation {conversation_id} for user {user_id}")
            return True
        else:
            logging.warning(f"No conversation deleted for {conversation_id} and user {user_id}")
            return False

    except Exception as e:
        logging.error(f"Error deleting conversation {conversation_id} for user {user_id}: {e}")
        return False
    finally:
        cur.close()
        conn.close()
