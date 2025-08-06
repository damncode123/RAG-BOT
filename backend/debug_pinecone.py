#!/usr/bin/env python3
"""
Debug script to check what's stored in Pinecone for a specific user
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_pinecone_data(user_id=7):
    """Check what documents are stored for a specific user"""
    
    # Import Pinecone
    from pinecone import Pinecone
    
    # Initialize Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index("rag-bot-gemini")
    
    print(f"Checking Pinecone data for user_id: {user_id}")
    print("=" * 50)
    
    # Get index stats
    stats = index.describe_index_stats()
    print(f"Total vectors in index: {stats.total_vector_count}")
    print(f"Index dimension: {stats.dimension}")
    print()
    
    # Query for vectors with this user_id
    try:
        # Create a dummy query vector (we just want to see metadata)
        dummy_vector = [0.0] * 768  # Gemini embedding dimension
        
        # Query with user_id filter (try both string and float)
        results = index.query(
            vector=dummy_vector,
            filter={"user_id": float(user_id)},  # Use float to match stored data
            top_k=50,  # Get more results to see all files
            include_metadata=True
        )
        
        print(f"Found {len(results.matches)} documents for user {user_id}:")
        print("-" * 30)

        # Get unique filenames
        filenames = set()
        for match in results.matches:
            filename = match.metadata.get('filename', 'N/A')
            filenames.add(filename)

        print(f"Unique files for user {user_id}:")
        for filename in sorted(filenames):
            print(f"  - {filename}")
        print()

        # Show first few documents
        for i, match in enumerate(results.matches[:5]):  # Show only first 5
            metadata = match.metadata
            print(f"{i+1}. ID: {match.id}")
            print(f"   Score: {match.score}")
            print(f"   User ID: {metadata.get('user_id', 'N/A')}")
            print(f"   Filename: {metadata.get('filename', 'N/A')}")
            print(f"   Chunk ID: {metadata.get('chunk_id', 'N/A')}")
            print(f"   Text preview: {metadata.get('text', 'N/A')[:100]}...")
            print()
            
    except Exception as e:
        print(f"Error querying Pinecone: {e}")
    
    # Also try to get some random vectors to see what's in the index
    try:
        print("\nSample of all vectors in index:")
        print("-" * 30)
        
        # Query without filter to see what's there
        all_results = index.query(
            vector=dummy_vector,
            top_k=5,
            include_metadata=True
        )
        
        for i, match in enumerate(all_results.matches):
            metadata = match.metadata
            print(f"{i+1}. ID: {match.id}")
            print(f"   User ID: {metadata.get('user_id', 'N/A')}")
            print(f"   Filename: {metadata.get('filename', 'N/A')}")
            print()
            
    except Exception as e:
        print(f"Error getting sample data: {e}")

if __name__ == "__main__":
    check_pinecone_data()
