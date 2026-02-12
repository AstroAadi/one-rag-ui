# Frontend Updates - Backend API v2.0.0 Alignment

This document summarizes all frontend modifications to align with the updated FastAPI backend (v2.0.0).

## Summary of Changes

### 1. **models.ts** - Enhanced Type Definitions
Updated all API response types to match the new backend OpenAPI specification.

**New Types Added:**
- `ChunkingStrategy` - Type for chunking strategies (fixed_size, sentence, paragraph, sliding_window, recursive, semantic)
- `SearchType` - Type for search modes (dense, sparse, hybrid)
- `TaskStatus` - Task status interface with detailed tracking information
- `TaskStatsResponse` - Task statistics interface
- `ProcessingStatusResponse` - File processing status interface
- `ChunkDetailResponse` - Detailed chunk information
- `UpdateChunkRequest` & `UpdateChunkResponse` - Chunk editing interfaces
- `MarkdownFileInfo` - Markdown file metadata interface
- `ModelInfoResponse` & `ModelUpdateRequest` - Model configuration interfaces
- `QueryRequest` & `ConversationQueryRequest` - Query request interfaces with search_type support

**Updated Types:**
- `SourceDocument` - Added full_text field for editing, chunk_index, improved metadata support
- `DocumentProcessRequest` - Changed to use new token-based parameters (target_chunk_tokens, chunk_overlap_tokens)
- `QueryResponse` - Removed outdated fields, added search_type and confidence_score
- `UploadedDocument` - Added taskId field for tracking async processing

### 2. **file.service.ts** - Upload & Processing Workflow
Major refactoring to support asynchronous document processing with task tracking.

**Key Changes:**
- `uploadFile()` - No changes (still returns FileUploadResponse)
- `processDocument()` - **NEW**: Now returns `{ task_id: string }` for async processing
  - Supports query parameters: chunking_strategy, target_chunk_tokens, chunk_overlap_tokens
  - Document processing runs in background
- `getProcessingStatus()` - **NEW**: Get file processing status by file_id
- `getChunkingStrategies()` - **NEW**: Fetch available chunking strategy options
- Removed deprecated endpoints: `getSupportedFormats()`, `listUploadedFiles()`

**Workflow:**
1. Upload file → Get file_id
2. Call processDocument(file_id) → Get task_id
3. Use TaskService to poll task status
4. Knowledge base gets updated automatically when processing completes

### 3. **chat.service.ts** - Query & Conversation Management
Enhanced with new conversation and query history endpoints.

**New Methods:**
- `getConversationHistory()` - Retrieve full conversation history by conversation_id
- `getMyQueries()` - Get recent queries for current user
- `clearQueryCache()` - Clear query cache for current user

**Unchanged but Enhanced:**
- `queryKnowledgeBase()` - Works with new search_type parameter
- `queryWithConversation()` - Works with new search_type parameter
- `clearConversation()` - Clear specific conversation history
- `resetConversation()` - Start new conversation
- `editChunk()` - Edit chunk content in knowledge base

### 4. **task.service.ts** - NEW SERVICE
Complete task management and polling system for background processing.

**Methods:**
- `getTaskStatus(taskId)` - Get status of specific task
- `cancelTask(taskId)` - Cancel pending or running task
- `getFileTaskStatus(fileId)` - Get most recent task for a file
- `getUserTasks(limit, statusFilter)` - Get all user tasks with optional status filtering
- `getTaskStats()` - Get user task statistics
- `getSystemTaskStats()` - Get system-wide task statistics (admin)
- `pollTaskStatus(taskId, intervalMs)` - **POLLING**: Auto-poll task status until completion
- `pollFileTaskStatus(fileId, intervalMs)` - **POLLING**: Auto-poll file task status

**Usage Example:**
```typescript
// Start processing
fileService.processDocument(fileId, settings).subscribe(response => {
  const taskId = response.task_id;
  
  // Poll status until completion
  taskService.pollTaskStatus(taskId).pipe(
    takeWhile(status => status.status !== 'completed' && status.status !== 'failed')
  ).subscribe(status => {
    console.log(`Progress: ${status.progress}%`);
  });
});
```

### 5. **chunk.service.ts** - NEW SERVICE
Chunk management and editing capabilities.

**Methods:**
- `getChunkDetails(chunkId, fileId?)` - Retrieve complete chunk details
- `editChunk(request)` - Edit chunk text and re-embed
  - Automatically re-embeds vectors in Qdrant
  - Updates both dense and sparse embeddings
  - Preserves metadata
- `listFileChunks(fileId, limit)` - List all chunks in a file

**Chunk Editing Workflow:**
1. Get chunk details via `getChunkDetails()`
2. User edits text
3. Call `editChunk()` with UpdateChunkRequest
4. Backend re-embeds and updates vector database
5. Changes immediately available for search

### 6. **markdown.service.ts** - NEW SERVICE
Markdown file retrieval and management.

**Methods:**
- `getMarkdownFile(userId, fileId)` - Get markdown content as text
- `deleteMarkdownFile(userId, fileId)` - Delete markdown file
- `downloadMarkdownFile(userId, fileId)` - Download as blob
- `listMarkdownFiles(userId)` - List all user's markdown files
- `getMarkdownFileUrl()` - Get direct URL for iframe embedding
- `getDownloadUrl()` - Get download URL for file links

**Features:**
- Supports user-specific markdown files
- Direct URL access for embedding in components
- Download functionality for file saving

### 7. **knowledge-base.service.ts** - Enhanced
Added documentation and new utility endpoints.

**New Methods:**
- `getMetrics()` - Get system metrics (task processing, database, requests)
- `getRootInfo()` - Get system information from root endpoint

**Existing Methods (Enhanced):**
- `getStatus()` - User-isolated knowledge base status
- `deleteDocument(fileId)` - Delete file with all related data
- `resetKnowledgeBase()` - User-isolated full reset (WARNING: Cannot be undone!)
- `getUserStats()` - User-specific statistics
- `healthCheck()` - Comprehensive health check

### 8. **settings.service.ts** - Updated
Model management refactoring.

**Key Changes:**
- Updated imports: `ModelInfo` → `ModelInfoResponse`
- `loadModelInfo()` - Enhanced documentation
- `updateChatModel(modelId)` - Deprecated in favor of `updateModel()`
- `updateModel(request)` - **NEW**: Uses ModelUpdateRequest interface
  - Only updates for current session
  - Requires .env change for permanent updates
- Preserved: Search type management (dense/sparse/hybrid)
- Preserved: Settings persistence in localStorage

## API Endpoint Mapping

### Upload & Processing (Async)
```
POST   /api/upload/                          - Upload file (returns FileUploadResponse)
POST   /api/upload/process/{file_id}         - Start processing (returns task_id)
GET    /api/upload/status/{file_id}          - Get file processing status
GET    /api/upload/chunking-strategies       - List available chunking strategies
```

### Task Management
```
GET    /api/tasks/{task_id}                  - Get task status
DELETE /api/tasks/{task_id}                  - Cancel task
GET    /api/tasks/file/{file_id}             - Get file's most recent task
GET    /api/tasks/user/all                   - Get all user tasks
GET    /api/tasks/stats/summary              - Get task statistics
GET    /api/tasks/system/stats               - Get system statistics (admin)
```

### Query & Conversation
```
POST   /api/query/                           - Simple query (direct execution)
POST   /api/query/conversation               - Conversational query (direct execution)
POST   /api/query/clear-conversation/{id}    - Clear conversation history
GET    /api/query/history/{conversation_id}  - Get conversation history
GET    /api/query/my-queries                 - Get recent queries
POST   /api/query/clear-cache                - Clear query cache
```

### Knowledge Base
```
GET    /api/knowledge-base/status            - Get KB status (user-specific)
DELETE /api/knowledge-base/document/{id}     - Delete document (user-specific)
DELETE /api/knowledge-base/reset             - Reset KB (user-specific, irreversible)
GET    /api/knowledge-base/stats             - Get user statistics
```

### Chunk Management
```
GET    /api/chunks/{chunk_id}                - Get chunk details
PUT    /api/chunks/edit                      - Edit chunk (re-embeds vectors)
GET    /api/chunks/file/{file_id}/chunks     - List file chunks
```

### Markdown Output
```
GET    /api/markdown_output/{user_id}/{file_id}.md           - Get markdown file
DELETE /api/markdown_output/{user_id}/{file_id}.md           - Delete markdown file
GET    /api/markdown_output/{user_id}/{file_id}.md/download  - Download markdown
GET    /api/markdown_output/list/{user_id}                   - List markdown files
```

### Settings & System
```
GET    /api/settings/model                   - Get current model info
POST   /api/settings/model                   - Update model
GET    /api/health                           - Health check
GET    /api/metrics                          - System metrics
GET    /                                     - Root/System info
```

## Breaking Changes from Old API

1. **Document Processing is Now Async**
   - Old: `processDocument()` returned full processing response
   - New: `processDocument()` returns only `{ task_id: string }`
   - Must use TaskService to poll status

2. **Chunking Parameters Changed**
   - Old: `max_chunk_chars`, `overlap_chars`, `delimiter`, etc.
   - New: `target_chunk_tokens`, `chunk_overlap_tokens`, `chunking_strategy`
   - Token-based instead of character-based for better accuracy

3. **Search Type Handling**
   - Now explicit parameter in queries (dense/sparse/hybrid)
   - Settings service manages default search type

4. **Model Information Endpoint**
   - Changed from `ModelInfo` to `ModelInfoResponse` type
   - New dedicated update method: `updateModel(request)`

## Migration Guide for Components

### For Document Upload & Processing
```typescript
// OLD
fileService.uploadFile(file).subscribe(uploadResponse => {
  fileService.processDocument(uploadResponse.file_id).subscribe(processResponse => {
    // processing done
  });
});

// NEW
fileService.uploadFile(file).subscribe(uploadResponse => {
  fileService.processDocument(uploadResponse.file_id, settings).subscribe(response => {
    const taskId = response.task_id;
    
    // Poll task status
    taskService.pollTaskStatus(taskId).pipe(
      takeWhile(status => status.status !== 'completed' && status.status !== 'failed')
    ).subscribe(status => {
      // Update UI with progress: status.progress
    });
  });
});
```

### For Querying
```typescript
// OLD & NEW (mostly same, but search_type is now explicit)
chatService.queryKnowledgeBase(question, topK, fileId, temperature, searchType).subscribe(
  response => {
    // Use response.sources, response.answer, response.search_type
  }
);
```

### For Chunk Editing
```typescript
// Chunk editing workflow
chunkService.getChunkDetails(chunkId, fileId).subscribe(chunk => {
  // User edits chunk.text
  chunkService.editChunk({
    file_id: fileId,
    chunk_id: chunkId,
    new_text: editedText,
    preserve_metadata: true
  }).subscribe(response => {
    // Chunk updated and re-embedded
  });
});
```

## Testing Checklist

- [ ] File upload returns correct FileUploadResponse
- [ ] Processing returns task_id and doesn't block
- [ ] Task status polling works correctly
- [ ] Task status updates show progress
- [ ] Query endpoints work with new search_type parameter
- [ ] Conversation history endpoints work
- [ ] Chunk editing re-embeds vectors
- [ ] Markdown file retrieval works
- [ ] Knowledge base reset is user-isolated
- [ ] Settings model update works
- [ ] Health check returns healthy status
- [ ] All services inject correctly into components

## Notes

- All endpoints except health check and metrics require X-User-ID header (automatically added by interceptor)
- Processing is now fully asynchronous - always use TaskService for status updates
- Chunk editing automatically handles re-embedding - no manual vector updates needed
- Knowledge base operations are user-isolated - users only see/modify their own data
- Model updates only persist for current session (use .env for permanent changes)
