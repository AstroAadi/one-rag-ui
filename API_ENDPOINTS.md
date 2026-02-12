# API Endpoint Reference - RAG System v2.0.0

## Base URL
```
http://localhost:8000/api
```

## Authentication
All endpoints (except health and metrics) require:
```
Header: X-User-ID: <user_id>
```

---

## Upload & File Processing

### Upload Document
```
POST /upload/
Content-Type: multipart/form-data

Parameters:
  - file: File (required)

Response: FileUploadResponse
{
  "file_id": "string",
  "filename": "string",
  "file_type": "string",
  "file_size_bytes": 12345,
  "upload_time": "2024-01-30T10:00:00",
  "status": "uploaded",
  "message": "File uploaded successfully"
}
```

### Get Available Chunking Strategies
```
GET /upload/chunking-strategies

Response: ChunkingStrategy[]
[
  "fixed_size",
  "sentence",
  "paragraph",
  "sliding_window",
  "recursive",
  "semantic"
]
```

### Process and Index Document (Async)
```
POST /upload/process/{file_id}
Query Parameters:
  - chunking_strategy?: fixed_size | sentence | paragraph | sliding_window | recursive | semantic
  - target_chunk_tokens?: 100-2048 (default based on strategy)
  - chunk_overlap_tokens?: 0-500 (default based on strategy)

Example:
POST /upload/process/abc-123?chunking_strategy=semantic&target_chunk_tokens=512&chunk_overlap_tokens=128

Response: { task_id: string }
{
  "task_id": "task-xyz-789"
}
```

### Get File Processing Status
```
GET /upload/status/{file_id}

Response: ProcessingStatusResponse
{
  "file_id": "abc-123",
  "status": "processing | completed | failed",
  "progress": 50,
  "message": "Processing chunks...",
  "task_id": "task-xyz-789"
}
```

---

## Query & RAG

### Simple Query (Direct Execution)
```
POST /query/
Content-Type: application/json

Request: QueryRequest
{
  "question": "What is the main topic?",
  "top_k": 5,
  "file_id": "optional-file-uuid",
  "temperature": 0.7,
  "search_type": "hybrid" // dense | sparse | hybrid
}

Response: QueryResponse
{
  "question": "What is the main topic?",
  "answer": "The main topic is...",
  "sources": [
    {
      "content": "Truncated chunk content...",
      "full_text": "Complete chunk text for editing...",
      "filename": "document.pdf",
      "chunk_id": "chunk-123",
      "file_id": "file-456",
      "relevance_score": 0.95,
      "page_number": 1,
      "chunk_type": "text",
      "chunk_index": 0,
      "semantic_score": 0.92,
      "keyword_score": 0.88
    }
  ],
  "processing_time": 1.234,
  "search_type": "hybrid",
  "confidence_score": 0.89,
  "conversation_id": null
}
```

### Query with Conversation (Multi-turn)
```
POST /query/conversation
Content-Type: application/json

Request: ConversationQueryRequest
{
  "question": "Follow-up question?",
  "conversation_id": "conv-uuid-123",
  "top_k": 5,
  "file_id": "optional-file-uuid",
  "temperature": 0.7,
  "search_type": "hybrid"
}

Response: QueryResponse (same as above, includes conversation_id)
```

### Get Conversation History
```
GET /query/history/{conversation_id}

Response: ConversationHistory
{
  "conversation_id": "conv-uuid-123",
  "user_id": "user-123",
  "created_at": "2024-01-30T10:00:00",
  "last_updated_at": "2024-01-30T10:05:00",
  "messages": [
    {
      "question": "What is the topic?",
      "answer": "The topic is...",
      "timestamp": "2024-01-30T10:00:00",
      "sources": [...]
    }
  ]
}
```

### Clear Conversation History
```
POST /query/clear-conversation/{conversation_id}

Response: { message: string }
```

### Get Recent Queries
```
GET /query/my-queries?limit=20

Query Parameters:
  - limit: 1-100 (default: 20)

Response: QueryHistoryItem[]
[
  {
    "query_id": "query-123",
    "question": "What is the main topic?",
    "answer": "...",
    "timestamp": "2024-01-30T10:00:00",
    "conversation_id": "conv-123",
    "processing_time": 1.234,
    "sources_count": 5
  }
]
```

### Clear Query Cache
```
POST /query/clear-cache

Response: { message: string }
```

---

## Task Management

### Get Task Status
```
GET /tasks/{task_id}

Response: TaskStatus
{
  "task_id": "task-xyz-789",
  "task_type": "cpu_bound",
  "description": "Process document: example.pdf",
  "user_id": "user_123",
  "file_id": "file_456",
  "status": "completed", // pending | running | completed | failed | cancelled
  "progress": 100.0,
  "created_at": "2024-01-30T10:00:00",
  "started_at": "2024-01-30T10:00:01",
  "completed_at": "2024-01-30T10:02:30",
  "processing_time": 149.5,
  "error": null
}
```

### Cancel Task
```
DELETE /tasks/{task_id}

Response: { message: string }
```

### Get Task by File ID
```
GET /tasks/file/{file_id}

Response: TaskStatus (or 404 if not found)
```

### Get User Tasks
```
GET /tasks/user/all?limit=50&status_filter=completed

Query Parameters:
  - limit: 1-200 (default: 50)
  - status_filter: pending | running | completed | failed | cancelled

Response: TaskStatus[]
```

### Get Task Statistics
```
GET /tasks/stats/summary

Response: TaskStatsResponse
{
  "user_id": "user_123",
  "total_tasks": 45,
  "by_status": {
    "pending": 2,
    "running": 3,
    "completed": 38,
    "failed": 2,
    "cancelled": 0
  },
  "by_type": {
    "cpu_bound": 25,
    "io_bound": 20
  },
  "recent_tasks": [...]
}
```

### Get System Task Statistics (Admin)
```
GET /tasks/system/stats

Response: SystemTaskStats
{
  ... system-wide statistics
}
```

---

## Knowledge Base Management

### Get Knowledge Base Status
```
GET /knowledge-base/status

Response: KnowledgeBaseStatus
{
  "total_documents": 10,
  "total_chunks": 150,
  "total_users": 1,
  "total_size_bytes": 5242880,
  "avg_chunks_per_document": 15.0,
  "documents": [
    {
      "file_id": "file-123",
      "filename": "document.pdf",
      "file_type": "pdf",
      "file_size_bytes": 1048576,
      "status": "completed",
      "chunks_created": 20,
      "total_pages": 50,
      "uploaded_at": "2024-01-30T10:00:00",
      "processed_at": "2024-01-30T10:05:00",
      "word_count": 15000,
      "image_count": 5,
      "table_count": 3,
      "chunking_strategy": "semantic"
    }
  ]
}
```

### Delete Document
```
DELETE /knowledge-base/document/{file_id}

Deletes:
  - Document from vector store
  - File from disk
  - Database records
  - Markdown output

Response: { message: string }
```

### Reset Knowledge Base (User-Isolated)
```
DELETE /knowledge-base/reset

WARNING: This action cannot be undone!
Deletes (for current user only):
  - All documents from vector store
  - All files from disk
  - All database records
  - All markdown outputs

Response: { message: string }
```

### Get User Statistics
```
GET /knowledge-base/stats

Response: UserStats
{
  "user_id": "user_123",
  "total_documents": 10,
  "total_chunks": 150,
  "total_queries": 500,
  "total_conversations": 50,
  "total_size_bytes": 5242880,
  "avg_chunks_per_document": 15.0,
  "documents_by_status": {
    "uploaded": 0,
    "processing": 1,
    "completed": 9,
    "failed": 0
  }
}
```

---

## Chunk Management

### Get Chunk Details
```
GET /chunks/{chunk_id}?file_id=file-123

Query Parameters:
  - file_id: optional UUID for validation

Response: ChunkDetailResponse
{
  "chunk_id": "chunk-xyz-789",
  "file_id": "file-123",
  "text": "Full chunk text content...",
  "filename": "document.pdf",
  "user_id": "user_123",
  "chunk_type": "text",
  "page_number": 1,
  "char_count": 1500,
  "chunk_index": 5,
  "created_at": "2024-01-30T10:00:00",
  "edited": false,
  "metadata": {
    "custom_field": "value"
  }
}
```

### Edit Chunk
```
PUT /chunks/edit
Content-Type: application/json

Request: UpdateChunkRequest
{
  "file_id": "file-123",
  "chunk_id": "chunk-xyz-789",
  "new_text": "Updated chunk text...",
  "preserve_metadata": true
}

Response: UpdateChunkResponse
{
  "message": "Chunk updated successfully",
  "chunk_id": "chunk-xyz-789",
  "file_id": "file-123",
  "user_id": "user_123",
  "old_char_count": 1500,
  "new_char_count": 1600,
  "updated_at": "2024-01-30T10:05:00"
}
```

### List File Chunks
```
GET /chunks/file/{file_id}/chunks?limit=100

Query Parameters:
  - limit: 1-1000 (default: 100)

Response: ChunkDetailResponse[]
```

---

## Markdown Output

### Get Markdown File
```
GET /markdown_output/{user_id}/{file_id}.md

Response: text/plain (markdown content)

Example:
GET /markdown_output/user_123/file-456.md
```

### Download Markdown File
```
GET /markdown_output/{user_id}/{file_id}.md/download

Response: application/octet-stream (file download)
```

### Delete Markdown File
```
DELETE /markdown_output/{user_id}/{file_id}.md

Response: { message: string }
```

### List User's Markdown Files
```
GET /markdown_output/list/{user_id}

Response: MarkdownFileInfo[]
[
  {
    "file_id": "file-123",
    "filename": "document.pdf",
    "user_id": "user_123",
    "created_at": "2024-01-30T10:00:00",
    "file_size": 50000
  }
]
```

---

## Settings & Configuration

### Get Current Model Info
```
GET /settings/model

Response: ModelInfoResponse
{
  "current_model_id": "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "temperature": 0.7,
  "max_tokens": 2048,
  "embedding_model_id": "amazon.titan-embed-text-v2:0"
}
```

### Update Model (Session Only)
```
POST /settings/model
Content-Type: application/json

Request: ModelUpdateRequest
{
  "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
}

Note: Only updates current session. For permanent changes, update .env

Response: { message: string }
```

---

## System & Health

### Health Check
```
GET /health

Response: HealthStatus
{
  "status": "healthy",
  "database": "connected",
  "task_manager": "running",
  "system_resources": { ... }
}
```

### Get System Metrics
```
GET /metrics

Response: SystemMetrics
{
  "task_processing": { ... },
  "database_connections": { ... },
  "request_statistics": { ... }
}
```

### Get Root Info
```
GET /

Response: RootInfo
{
  "title": "RAG System API",
  "version": "2.0.0",
  "description": "Production-ready RAG system...",
  "endpoints": { ... }
}
```

---

## Common Response Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Use response data |
| 201 | Created | Resource created successfully |
| 204 | No Content | Success, but no content to return |
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Provide valid user ID |
| 404 | Not Found | Resource doesn't exist |
| 422 | Validation Error | Check request body format |
| 500 | Server Error | Contact support |
| 503 | Service Unavailable | Backend is down |

---

## Error Response Format

```json
{
  "detail": [
    {
      "loc": ["query", "limit"],
      "msg": "ensure this value is less than or equal to 100",
      "type": "value_error.number.not_le"
    }
  ]
}
```

---

## Rate Limiting

No rate limiting enforced in development mode.

In production, the following limits are recommended:
- File uploads: 10/minute per user
- Queries: 100/minute per user
- Task polling: 60/minute per user
- Model updates: 5/minute per user

---

## CORS Configuration

Requests from localhost:4200 (Angular dev server) are allowed.

CORS headers included in responses:
- Access-Control-Allow-Origin
- Access-Control-Allow-Methods
- Access-Control-Allow-Headers
- Access-Control-Allow-Credentials

---

## WebSocket Support

Not yet implemented. Use polling via TaskService for now.

---

**Last Updated**: February 2, 2026
**API Version**: 2.0.0
**Base URL**: http://localhost:8000/api
