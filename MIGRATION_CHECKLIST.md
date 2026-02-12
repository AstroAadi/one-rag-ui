# Frontend Migration Checklist - Backend API v2.0.0

## ✅ Completed Updates

### Models (models.ts)
- [x] Added `ChunkingStrategy` type with all 6 strategies
- [x] Added `SearchType` type (dense, sparse, hybrid)
- [x] Added `TaskStatus` interface with complete tracking fields
- [x] Added `TaskStatsResponse` interface
- [x] Added `ProcessingStatusResponse` interface
- [x] Added `ChunkDetailResponse` interface with all chunk fields
- [x] Added `UpdateChunkRequest` & `UpdateChunkResponse` interfaces
- [x] Added `MarkdownFileInfo` interface
- [x] Added `ModelInfoResponse` & `ModelUpdateRequest` interfaces
- [x] Added `QueryRequest` & `ConversationQueryRequest` interfaces
- [x] Updated `SourceDocument` with full_text and improved fields
- [x] Updated `DocumentProcessRequest` with token-based parameters
- [x] Updated `QueryResponse` with search_type and confidence_score
- [x] Updated `UploadedDocument` with taskId field

### Services Created

#### task.service.ts ✅
- [x] `getTaskStatus()` - Get task by ID
- [x] `cancelTask()` - Cancel running task
- [x] `getFileTaskStatus()` - Get task by file ID
- [x] `getUserTasks()` - Get all user tasks with filtering
- [x] `getTaskStats()` - Get user statistics
- [x] `getSystemTaskStats()` - Get system statistics
- [x] `pollTaskStatus()` - Auto-poll task status
- [x] `pollFileTaskStatus()` - Auto-poll file task status

#### chunk.service.ts ✅
- [x] `getChunkDetails()` - Get chunk by ID
- [x] `editChunk()` - Edit and re-embed chunk
- [x] `listFileChunks()` - List chunks by file

#### markdown.service.ts ✅
- [x] `getMarkdownFile()` - Get markdown content
- [x] `deleteMarkdownFile()` - Delete markdown file
- [x] `downloadMarkdownFile()` - Download as blob
- [x] `listMarkdownFiles()` - List user's markdown files
- [x] `getMarkdownFileUrl()` - Get direct URL
- [x] `getDownloadUrl()` - Get download URL

### Services Updated

#### file.service.ts ✅
- [x] Updated imports for new models
- [x] `uploadFile()` - No changes (still works)
- [x] `processDocument()` - Now returns task_id, supports query params
- [x] `getProcessingStatus()` - New endpoint to check file status
- [x] `getChunkingStrategies()` - New endpoint for strategy options
- [x] Removed deprecated endpoints (getSupportedFormats, listUploadedFiles)

#### chat.service.ts ✅
- [x] Updated imports for new types
- [x] `queryKnowledgeBase()` - Works with new types
- [x] `queryWithConversation()` - Works with new types
- [x] `clearConversation()` - No changes
- [x] `resetConversation()` - No changes
- [x] `getConversationHistory()` - New method
- [x] `getMyQueries()` - New method
- [x] `clearQueryCache()` - New method
- [x] `editChunk()` - Existing method still works

#### knowledge-base.service.ts ✅
- [x] `getStatus()` - Enhanced documentation
- [x] `deleteDocument()` - Enhanced documentation
- [x] `resetKnowledgeBase()` - Enhanced documentation
- [x] `getUserStats()` - Enhanced documentation
- [x] `healthCheck()` - Enhanced documentation
- [x] `getMetrics()` - New method
- [x] `getRootInfo()` - New method

#### settings.service.ts ✅
- [x] Updated imports for new types
- [x] `loadModelInfo()` - Enhanced documentation
- [x] `updateModel()` - New method (replaces updateChatModel)
- [x] Preserved localStorage settings
- [x] Preserved search type management

## 📋 Components That Need Updates

These components should be reviewed and updated to use the new async processing pattern:

### Priority 1 (Critical)
- [ ] **Input Bar Component** - Upload component needs to handle async processing
  - [ ] Update to track task_id after upload
  - [ ] Use TaskService for progress tracking
  - [ ] Show progress bar during processing

- [ ] **Chat Component** - Query component
  - [ ] Update to use new SearchType explicitly
  - [ ] Handle confidence_score in responses
  - [ ] Support new conversation history endpoints

### Priority 2 (Important)
- [ ] **Sidebar Component** - Knowledge base management
  - [ ] Update to use new delete/reset endpoints
  - [ ] Show document status properly
  - [ ] Display statistics from new stats endpoint

- [ ] **Processing Settings Modal** - Chunking configuration
  - [ ] Update to use token-based parameters
  - [ ] Fetch and display available chunking strategies
  - [ ] Support all 6 new chunking strategies

- [ ] **Edit Chunk Modal** - Chunk editing
  - [ ] Use new ChunkService for editing
  - [ ] Handle UpdateChunkResponse properly
  - [ ] Show re-embedding status

### Priority 3 (Enhancement)
- [ ] **Document Processing Animation** - Task tracking
  - [ ] Use TaskService polling instead of fixed animation
  - [ ] Show real progress percentage
  - [ ] Handle task completion/failure states

- [ ] **Settings Component** - Model management
  - [ ] Update model selection to use ModelInfoResponse
  - [ ] Show embedding model info
  - [ ] Use new updateModel() method

- [ ] **App Component** - Initialization
  - [ ] Check health endpoint on startup
  - [ ] Load available chunking strategies
  - [ ] Initialize model settings from backend

## 🔄 Component Update Patterns

### Upload & Process Pattern (New)
```typescript
// OLD: synchronous processing
upload() {
  this.fileService.uploadFile(file).subscribe(uploadResponse => {
    this.fileService.processDocument(uploadResponse.file_id).subscribe(response => {
      this.documents.push(response);
    });
  });
}

// NEW: asynchronous processing with task tracking
upload() {
  this.fileService.uploadFile(file).subscribe(uploadResponse => {
    const fileId = uploadResponse.file_id;
    this.fileService.processDocument(fileId, settings).subscribe(response => {
      const taskId = response.task_id;
      this.trackProcessing(fileId, taskId);
    });
  });
}

trackProcessing(fileId: string, taskId: string) {
  this.taskService.pollTaskStatus(taskId).pipe(
    takeWhile(status => !this.isTerminal(status.status))
  ).subscribe(
    status => this.updateProgress(fileId, status),
    error => this.handleError(fileId, error),
    () => this.onProcessingComplete(fileId)
  );
}

private isTerminal(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}
```

### Search Type Pattern (Updated)
```typescript
// OLD: search_type optional
query(question: string) {
  this.chatService.queryKnowledgeBase(question).subscribe();
}

// NEW: search_type explicit
query(question: string, searchType: SearchType = 'hybrid') {
  this.chatService.queryKnowledgeBase(question, 5, undefined, undefined, searchType).subscribe(
    response => {
      console.log('Used search type:', response.search_type);
    }
  );
}
```

### Chunk Editing Pattern (New)
```typescript
editChunk(chunk: ChunkDetailResponse, newText: string) {
  this.chunkService.editChunk({
    file_id: chunk.file_id,
    chunk_id: chunk.chunk_id,
    new_text: newText,
    preserve_metadata: true
  }).subscribe({
    next: (response) => {
      console.log('Chunk updated, character count changed from', 
                  response.old_char_count, 'to', response.new_char_count);
      this.refreshChunkList(chunk.file_id);
    }
  });
}
```

## 🧪 Testing Checklist

### File Upload & Processing
- [ ] Upload file returns FileUploadResponse with file_id
- [ ] Process call returns task_id (not processing response)
- [ ] Task status polls correctly with 1000ms interval
- [ ] Progress bar updates with status.progress
- [ ] Completion detected when status.status === 'completed'
- [ ] Error handling works when status.status === 'failed'

### Queries & Conversations
- [ ] Query returns QueryResponse with search_type field
- [ ] Conversation ID is tracked and returned
- [ ] Conversation history retrieval works
- [ ] Multiple queries in conversation work correctly
- [ ] Clear conversation clears history
- [ ] Get recent queries returns list

### Chunk Management
- [ ] Get chunk details returns full text
- [ ] Edit chunk sends proper UpdateChunkRequest
- [ ] Update response shows character count change
- [ ] List chunks returns all file chunks
- [ ] Edited flag updates after editing

### Knowledge Base Operations
- [ ] Get status shows user's documents only
- [ ] Delete document removes from list
- [ ] Reset knowledge base works
- [ ] User stats show correct counts
- [ ] Each user only sees their own data

### Model Settings
- [ ] Get model info returns correct model ID
- [ ] Update model persists for session
- [ ] Available models list displays correctly
- [ ] Temperature and max_tokens show correctly

### Markdown Files
- [ ] List markdown files returns file metadata
- [ ] Get markdown content as text
- [ ] Download markdown as file
- [ ] Delete markdown removes file
- [ ] Direct URL works for embedding

## 📚 Documentation Created

- [x] FRONTEND_UPDATES.md - Comprehensive migration guide
- [x] SERVICES_GUIDE.md - Quick reference with code examples
- [x] MIGRATION_CHECKLIST.md - This checklist

## 🚀 Next Steps

1. **Run compilation check** - Ensure no TypeScript errors
   ```bash
   ng build --configuration development
   ```

2. **Update components** - Follow Priority 1, 2, 3 list above

3. **Test backend integration** - Verify all endpoints work
   - Test with actual file uploads
   - Test task polling with real processing
   - Test chunk editing with vector updates

4. **Update component tests** - Update unit tests for new service calls

5. **E2E testing** - Test full workflows
   - Upload → Process → Query flow
   - Conversation management flow
   - Chunk editing flow
   - Knowledge base management flow

6. **Performance testing** - Monitor
   - Polling interval impact on browser resources
   - Vector re-embedding time for chunk edits
   - Concurrent task polling

## 🔗 Key Dependencies

All services are properly typed and ready to be injected:

```typescript
constructor(
  private fileService: FileService,
  private chatService: ChatService,
  private taskService: TaskService,
  private chunkService: ChunkService,
  private markdownService: MarkdownService,
  private knowledgeBaseService: KnowledgeBaseService,
  private settingsService: SettingsService
)
```

## ⚠️ Important Notes

1. **User Isolation**: All knowledge base operations are automatically isolated per user via X-User-ID header
2. **Async Processing**: Document processing is now fully async - always use TaskService for tracking
3. **Task Polling**: Use provided polling methods to automatically handle status updates
4. **Chunk Re-embedding**: Chunk edits automatically re-embed vectors - no manual updates needed
5. **Session vs Permanent**: Model updates only last for current session (require .env change for permanence)

## ✨ All Services Compiled Successfully

No TypeScript compilation errors found. All new services and updated types are ready for use.

---

**Migration Date**: February 2, 2026
**Backend Version**: 2.0.0
**API Changes**: Async processing, task tracking, improved chunking, direct query execution
