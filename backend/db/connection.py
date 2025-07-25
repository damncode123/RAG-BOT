import mysql.connector
import os
from dotenv import load_dotenv
load_dotenv()

def get_connection():
    db_host = os.getenv("DB_HOST")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_name = os.getenv("DB_NAME")
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

def test_connection():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        cur.close()
        conn.close()
        print("✅ MySQL connection successful! Result:", result)
    except Exception as e:
        print("❌ MySQL connection failed:", e)

# Test the connection when running this file directly
if __name__ == "__main__":
    test_connection() 