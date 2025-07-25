# LlamaIndex + Pinecone Integration: backend/ingestion/pipeline.py

## What was changed:

1. **Removed textract and generic file parsing**
   - Now only uses PyPDF2 for PDFs and python-docx for DOCX files (both are easier to install and more reliable).

2. **Added LlamaIndex and Pinecone integration**
   - Imports and initializes Pinecone and LlamaIndex at the top of the file.
   - Uses PineconeVectorStore from LlamaIndex to store embeddings.
   - Uses OpenAIEmbedding from LlamaIndex for embedding generation.

3. **Updated `store_embeddings` function**
   - Now creates LlamaIndex Document objects for each chunk, with user_id and filename as metadata.
   - Indexes these documents in Pinecone using LlamaIndex's VectorStoreIndex.

4. **Updated pipeline to use new chunking and storage**
   - After parsing and chunking, embeddings are generated and stored in Pinecone via LlamaIndex.

5. **API keys and index names**
   - Placeholders for Pinecone and OpenAI API keys and Pinecone index name are included at the top. Replace with your actual credentials.

## Why these changes were made:

- **Reliability:** textract is hard to install and maintain, especially on Windows. PyPDF2 and python-docx are much easier and cover the most common file types.
- **Scalability and Search:** LlamaIndex + Pinecone is a robust, production-ready solution for semantic search and RAG pipelines.
- **Metadata:** Storing user_id and filename as metadata allows for user-specific retrieval and filtering in Pinecone.
- **Modularity:** The pipeline is now modular and ready for production, with clear extension points for more file types or different embedding models.

## Next Steps:
- Replace the API key and index name placeholders with your actual Pinecone and OpenAI credentials.
- If you want to support more file types, add more parsing logic to `parse_file`.
- For querying, use LlamaIndex's query engine with metadata filters for user-specific retrieval. 