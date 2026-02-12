# Quick Reference Card - Frontend v2.0.0

## New Services & Their Purposes

### TaskService ⭐ NEW
```typescript
// For monitoring background processing
taskService.pollTaskStatus(taskId)  // Auto-poll
taskService.getTaskStatus(taskId)   // Single check
taskService.getUserTasks()          // List all user tasks
taskService.getTaskStats()          // Get statistics
```

### ChunkService ⭐ NEW
```typescript
// For managing document chunks
chunkService.getChunkDetails(id)    // Get chunk text
chunkService.editChunk(request)     // Edit & re-embed
chunkService.listFileChunks(fileId) // List chunks
```

### MarkdownService ⭐ NEW
```typescript
// For markdown file operations
markdownService.getMarkdownFile(userId, fileId)      // Get content
markdownService.downloadMarkdownFile(userId, fileId) // Download
markdownService.listMarkdownFiles(userId)            // List files
```

## Updated Services

### FileService 🔄 UPDATED
```typescript
// Upload stays the same
uploadFile(file)

// Processing now returns task_id!
processDocument(fileId) // Returns { task_id: string }

// New methods
getProcessingStatus(fileId)
getChunkingStrategies()
```

### ChatService 🔄 UPDATED
```typescript
// Queries now require search_type
queryKnowledgeBase(question, 5, undefined, 0.7, 'hybrid')

// New conversation methods
getConversationHistory(conversationId)
getMyQueries(limit)
clearQueryCache()
```

### KnowledgeBaseService 🔄 UPDATED
```typescript
// Same methods, enhanced documentation
getStatus()         // User-specific
deleteDocument()    // Safe deletion
resetKnowledgeBase() // User-specific reset
getUserStats()      // User stats only
healthCheck()       // System health
```

### SettingsService 🔄 UPDATED
```typescript
// New method
updateModel(request)  // Instead of updateChatModel()

// Still supported
loadModelInfo()
getSearchType()
setSearchType()
```

## Most Important Changes

### 1️⃣ Processing is Async
```typescript
// OLD (doesn't work anymore)
fileService.processDocument(fileId).subscribe(response => {
  // response has chunks_created, markdown_path, etc
});

// NEW (correct way)
fileService.processDocument(fileId).subscribe(response => {
  const taskId = response.task_id; // Get task ID!
  taskService.pollTaskStatus(taskId).subscribe(status => {
    // Monitor progress via status.progress
  });
});
```

### 2️⃣ Search Type is Required
```typescript
// OLD (search_type was optional)
chatService.queryKnowledgeBase(question)

// NEW (search_type is explicit)
chatService.queryKnowledgeBase(
  question,
  5,
  undefined,
  0.7,
  'hybrid'  // Must specify: dense | sparse | hybrid
)
```

### 3️⃣ Chunk Editing
```typescript
// NEW capability available
import { ChunkService } from './services/chunk.service';

chunkService.editChunk({
  file_id: 'file-123',
  chunk_id: 'chunk-xyz',
  new_text: 'Updated content',
  preserve_metadata: true
});
```

## Type Imports

```typescript
// Models
import {
  FileUploadResponse,
  QueryResponse,
  TaskStatus,
  ChunkDetailResponse,
  UpdateChunkRequest,
  MarkdownFileInfo,
  SearchType,
  ChunkingStrategy,
  KnowledgeBaseStatus,
  UserStats,
  ModelInfoResponse,
  ModelUpdateRequest
} from './models';

// Services
import { FileService } from './services/file.service';
import { ChatService } from './services/chat.service';
import { TaskService } from './services/task.service';
import { ChunkService } from './services/chunk.service';
import { MarkdownService } from './services/markdown.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { SettingsService } from './services/settings.service';
```

## Common Workflows

### Upload → Process → Track Progress
```typescript
this.fileService.uploadFile(file).subscribe(upload => {
  this.fileService.processDocument(upload.file_id, {
    chunking_strategy: 'semantic',
    target_chunk_tokens: 512,
    chunk_overlap_tokens: 128
  }).subscribe(response => {
    this.taskService.pollTaskStatus(response.task_id).pipe(
      takeWhile(s => s.status !== 'completed' && s.status !== 'failed')
    ).subscribe(
      status => console.log(`Progress: ${status.progress}%`)
    );
  });
});
```

### Query with Conversation
```typescript
const convId = this.chatService.getCurrentConversationId();
this.chatService.queryWithConversation(question, convId, 5, undefined, 0.7, 'hybrid')
  .subscribe(response => {
    console.log(response.answer);
    // Later: Get history
    this.chatService.getConversationHistory(convId).subscribe(h => {
      console.log(h.messages);
    });
  });
```

### Edit Chunk
```typescript
this.chunkService.getChunkDetails(chunkId).subscribe(chunk => {
  // User edits chunk.text...
  this.chunkService.editChunk({
    file_id: chunk.file_id,
    chunk_id: chunkId,
    new_text: editedText,
    preserve_metadata: true
  }).subscribe(() => console.log('Updated!'));
});
```

## Search Types Explained

| Type | Use Case | Performance |
|------|----------|-------------|
| `dense` | Semantic meaning | Slower |
| `sparse` | Keyword matching | Faster |
| `hybrid` | Both (RRF fusion) | Medium |

## Chunking Strategies Explained

| Strategy | Best For | Parameters |
|----------|----------|------------|
| `fixed_size` | General documents | target_chunk_tokens |
| `sentence` | Prose/articles | target_chunk_tokens |
| `paragraph` | Structured docs | target_chunk_tokens |
| `sliding_window` | Context preservation | overlap_tokens |
| `recursive` | Complex hierarchy | None (automatic) |
| `semantic` | Meaning-aware chunking | target_chunk_tokens |

## Testing Checklist

```
Upload & Processing
☐ File uploads correctly
☐ Process returns task_id
☐ Task status polls and completes
☐ Progress updates show 0-100%

Queries
☐ Query returns answer + sources
☐ Search type is in response
☐ Confidence score is present
☐ Sources have all metadata

Conversations
☐ Conversation ID returned
☐ History retrieves past messages
☐ Clear conversation works
☐ Recent queries list works

Chunks
☐ Get chunk returns full text
☐ Edit chunk updates vector
☐ List chunks returns all
☐ Metadata preserved

Knowledge Base
☐ Status shows user docs only
☐ Delete document removes it
☐ Stats are user-specific
☐ Reset clears all user data

Settings
☐ Get model info works
☐ Update model persists session
☐ Search type preference saves

System
☐ Health check returns status
☐ Metrics endpoint works
```

## Error Handling Template

```typescript
this.service.method().subscribe({
  next: (data: ResponseType) => {
    // Handle success
  },
  error: (error: any) => {
    if (error.status === 404) {
      // Not found
    } else if (error.status === 422) {
      // Validation error - check error.error.detail
    } else if (error.status === 500) {
      // Server error
    }
  }
});
```

## Header Requirements

All endpoints except `/health` and `/metrics` require:
```
X-User-ID: <user_id>
```

Automatically added by user-id.interceptor.ts

## Performance Tips

1. **Poll interval**: Default 1000ms - increase for slower networks
2. **Task cancellation**: Call taskService.cancelTask() for long-running tasks
3. **Query caching**: Use clearQueryCache() when KB changes
4. **Chunk editing**: Re-embedding is automatic, be patient
5. **Conversation pruning**: Regularly clear old conversations

## Documentation Links

📖 **Complete Guides**
- FRONTEND_UPDATES.md - Full migration guide (5000+ words)
- SERVICES_GUIDE.md - Code examples (2000+ words)
- API_ENDPOINTS.md - Endpoint reference (2000+ words)
- MIGRATION_CHECKLIST.md - Component updates (1500+ words)

💡 **Quick Refs**
- This file - Quick cards
- models.ts - Type definitions
- Each service file - JSDoc comments

## Version Info

- **Backend**: v2.0.0
- **Frontend**: Updated Feb 2, 2026
- **API Status**: ✅ Fully integrated
- **Compilation**: ✅ No errors
- **Documentation**: ✅ Complete

---

**Pro Tips**:
- Use `takeWhile()` to stop polling automatically
- Always set `search_type` explicitly in queries
- Check `status.progress` for real-time updates
- Preserve metadata when editing chunks
- User isolation is automatic - don't worry!

**Questions?** Check the comprehensive guides or service JSDoc comments.
