# Quick Reference - Updated Services

## Service Imports
```typescript
import { FileService } from './services/file.service';
import { ChatService } from './services/chat.service';
import { TaskService } from './services/task.service';
import { ChunkService } from './services/chunk.service';
import { MarkdownService } from './services/markdown.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { SettingsService } from './services/settings.service';
```

## Common Usage Patterns

### 1. Upload and Process Document with Progress Tracking
```typescript
import { takeWhile } from 'rxjs/operators';

constructor(
  private fileService: FileService,
  private taskService: TaskService
) {}

uploadAndProcess(file: File) {
  this.fileService.uploadFile(file).subscribe({
    next: (uploadResponse) => {
      console.log('File uploaded:', uploadResponse.file_id);
      
      // Start processing
      this.fileService.processDocument(uploadResponse.file_id, {
        chunking_strategy: 'semantic',
        target_chunk_tokens: 512,
        chunk_overlap_tokens: 128
      }).subscribe({
        next: (response) => {
          const taskId = response.task_id;
          console.log('Processing started with task:', taskId);
          
          // Poll task status
          this.taskService.pollTaskStatus(taskId, 1000).pipe(
            takeWhile(status => status.status !== 'completed' && status.status !== 'failed')
          ).subscribe(status => {
            console.log(`Progress: ${status.progress}%`);
            if (status.status === 'completed') {
              console.log('Processing complete!');
            }
          });
        },
        error: (err) => console.error('Processing failed:', err)
      });
    },
    error: (err) => console.error('Upload failed:', err)
  });
}
```

### 2. Query Knowledge Base with Search Type
```typescript
constructor(private chatService: ChatService) {}

query(question: string, searchType: 'dense' | 'sparse' | 'hybrid' = 'hybrid') {
  this.chatService.queryKnowledgeBase(
    question,
    5,        // topK
    undefined, // fileId (optional)
    0.7,      // temperature
    searchType
  ).subscribe({
    next: (response) => {
      console.log('Answer:', response.answer);
      console.log('Confidence:', response.confidence_score);
      console.log('Search type used:', response.search_type);
      console.log('Sources:', response.sources);
    }
  });
}
```

### 3. Manage Conversation History
```typescript
constructor(private chatService: ChatService) {}

// Start new conversation
startNewConversation() {
  this.chatService.startNewConversation();
  const convId = this.chatService.getCurrentConversationId();
  console.log('New conversation:', convId);
}

// Query with conversation
queryWithHistory(question: string) {
  this.chatService.queryWithConversation(
    question,
    undefined, // uses current conversation ID
    5
  ).subscribe(response => {
    console.log('Conversation ID:', response.conversation_id);
  });
}

// Get conversation history
getHistory() {
  const convId = this.chatService.getCurrentConversationId();
  this.chatService.getConversationHistory(convId).subscribe(history => {
    console.log('Messages:', history.messages);
  });
}

// Clear conversation
clearConversation() {
  this.chatService.clearConversation().subscribe(() => {
    console.log('Conversation cleared');
  });
}
```

### 4. Edit Chunks in Knowledge Base
```typescript
constructor(private chunkService: ChunkService) {}

editChunk(chunkId: string, fileId: string, newText: string) {
  this.chunkService.editChunk({
    file_id: fileId,
    chunk_id: chunkId,
    new_text: newText,
    preserve_metadata: true
  }).subscribe({
    next: (response) => {
      console.log('Chunk updated');
      console.log('Character count changed from', response.old_char_count, 'to', response.new_char_count);
    }
  });
}

// Get chunk details before editing
getChunkForEditing(chunkId: string, fileId: string) {
  this.chunkService.getChunkDetails(chunkId, fileId).subscribe({
    next: (chunk) => {
      console.log('Chunk text:', chunk.text);
      console.log('Edited before?', chunk.edited);
      // Open editor with chunk.text
    }
  });
}

// List all chunks in a file
listChunks(fileId: string) {
  this.chunkService.listFileChunks(fileId, 50).subscribe({
    next: (chunks) => {
      console.log('Total chunks:', chunks.length);
      chunks.forEach(c => console.log(`Chunk ${c.chunk_index}:`, c.text.substring(0, 100)));
    }
  });
}
```

### 5. Get Knowledge Base Status
```typescript
constructor(private kbService: KnowledgeBaseService) {}

getStatus() {
  this.kbService.getStatus().subscribe({
    next: (status) => {
      console.log('Total documents:', status.total_documents);
      console.log('Total chunks:', status.total_chunks);
      console.log('Average chunks per doc:', status.avg_chunks_per_document);
      
      status.documents.forEach(doc => {
        console.log(`- ${doc.filename}: ${doc.chunks_created} chunks (${doc.status})`);
      });
    }
  });
}

// Get user statistics
getStats() {
  this.kbService.getUserStats().subscribe({
    next: (stats) => {
      console.log('Total queries:', stats.total_queries);
      console.log('Documents by status:', stats.documents_by_status);
    }
  });
}

// Delete document
deleteDocument(fileId: string) {
  this.kbService.deleteDocument(fileId).subscribe({
    next: () => console.log('Document deleted'),
    error: (err) => console.error('Deletion failed:', err)
  });
}
```

### 6. Manage Markdown Files
```typescript
constructor(private markdownService: MarkdownService) {}

// Get markdown content
getMarkdown(userId: string, fileId: string) {
  this.markdownService.getMarkdownFile(userId, fileId).subscribe({
    next: (content) => {
      console.log('Markdown content:', content);
      // Display in editor or render
    }
  });
}

// Download markdown
downloadMarkdown(userId: string, fileId: string) {
  this.markdownService.downloadMarkdownFile(userId, fileId).subscribe({
    next: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileId}.md`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  });
}

// List user's markdown files
listMarkdowns(userId: string) {
  this.markdownService.listMarkdownFiles(userId).subscribe({
    next: (files) => {
      console.log('Markdown files:', files);
      files.forEach(f => {
        const url = this.markdownService.getMarkdownFileUrl(f.user_id, f.file_id);
        console.log(`View: ${url}`);
      });
    }
  });
}
```

### 7. Model Settings Management
```typescript
constructor(private settingsService: SettingsService) {}

// Get current model info
getModelInfo() {
  this.settingsService.loadModelInfo().subscribe({
    next: (info) => {
      console.log('Current model:', info.current_model_id);
      console.log('Temperature:', info.temperature);
      console.log('Max tokens:', info.max_tokens);
      console.log('Embedding model:', info.embedding_model_id);
    }
  });
}

// Update model
updateModel(modelId: string) {
  this.settingsService.updateModel({ model_id: modelId }).subscribe({
    next: () => console.log('Model updated'),
    error: (err) => console.error('Update failed:', err)
  });
}

// Get available models
getAvailableModels() {
  return this.settingsService.availableChatModels;
  // Returns: [
  //   { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet' },
  //   { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet' },
  //   ...
  // ]
}
```

### 8. Get Recent Queries
```typescript
constructor(private chatService: ChatService) {}

getRecentQueries() {
  this.chatService.getMyQueries(20).subscribe({
    next: (queries) => {
      console.log('Recent queries:', queries);
    }
  });
}

// Clear query cache
clearCache() {
  this.chatService.clearQueryCache().subscribe({
    next: () => console.log('Cache cleared')
  });
}
```

### 9. Task Management
```typescript
constructor(private taskService: TaskService) {}

// Get all user tasks
getAllTasks() {
  this.taskService.getUserTasks(50, 'completed').subscribe({
    next: (tasks) => console.log('Completed tasks:', tasks)
  });
}

// Get task stats
getStats() {
  this.taskService.getTaskStats().subscribe({
    next: (stats) => {
      console.log('Total tasks:', stats.total_tasks);
      console.log('Status breakdown:', stats.by_status);
      console.log('Type breakdown:', stats.by_type);
    }
  });
}

// Cancel task
cancelTask(taskId: string) {
  this.taskService.cancelTask(taskId).subscribe({
    next: () => console.log('Task cancelled')
  });
}
```

## New Types to Use

```typescript
// File upload
import { FileUploadResponse } from './models';

// Processing
import { DocumentProcessRequest, ProcessingStatusResponse } from './models';

// Task tracking
import { TaskStatus, TaskStatsResponse } from './models';

// Queries
import { QueryRequest, ConversationQueryRequest, QueryResponse, SearchType } from './models';

// Chunks
import { ChunkDetailResponse, UpdateChunkRequest, UpdateChunkResponse } from './models';

// Knowledge base
import { KnowledgeBaseStatus, UserStats } from './models';

// Settings
import { ModelInfoResponse, ModelUpdateRequest } from './models';

// Chunking
import { ChunkingStrategy } from './models';
```

## Best Practices

1. **Always use TaskService for processing status** - Don't try to poll with FileService
2. **Handle async processing properly** - Use takeWhile or subscription management
3. **Pass search_type explicitly** - Don't rely on defaults in queries
4. **Preserve metadata when editing chunks** - Keep preserve_metadata: true
5. **Check task status before cleanup** - Ensure 'completed' or 'failed' before UI updates
6. **User-isolate knowledge base ops** - All KB operations are automatically isolated per user
7. **Session vs permanent settings** - Model updates only last for current session

## Error Handling Template

```typescript
this.someService.method().subscribe({
  next: (data) => {
    // Success - data is typed
    console.log(data);
  },
  error: (error) => {
    // HTTP error
    if (error.status === 404) {
      console.error('Not found');
    } else if (error.status === 422) {
      console.error('Validation error:', error.error.detail);
    } else {
      console.error('Unknown error:', error);
    }
  },
  complete: () => {
    // Optional: called when observable completes
    console.log('Operation complete');
  }
});
```
