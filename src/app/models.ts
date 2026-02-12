import { SafeResourceUrl } from '@angular/platform-browser';

// Frontend models
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  isTyping?: boolean;
  sources?: SourceDocument[];
}

export interface UploadedDocument {
  id: string;
  name: string;
  fileType: string;
  uploadTime: Date;
  objectUrl: SafeResourceUrl; 
  content: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'chunked' | 'ready' | 'error';
  chunksCreated?: number;
  fileSizeBytes?: number;
  totalPages?: number;
  chunkingStrategy?: string | null;
  markdownPath?: string;
  taskId?: string;
}

// Backend API Response Types - File Upload & Processing
export interface FileUploadResponse {
  file_id: string;
  knowledge_base_id: string;
  knowledge_base_name: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  upload_time: string;
  status: ProcessingStatus;
  message: string;
}

export interface DocumentProcessRequest {
  chunking_strategy?: ChunkingStrategy;
  target_chunk_tokens?: number;
  chunk_overlap_tokens?: number;
  force_recreate?: boolean;
}

export type ChunkingStrategy = 'default' | 'fixed_size' | 'hierarchical' | 'semantic';

export type ProcessingStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface ProcessingStatusResponse {
  file_id: string;
  status: ProcessingStatus;
  progress?: number;
  message?: string;
  task_id?: string;
}

export interface CreateChunksResponse {
  file_id?: string;
  chunk_count?: number;
  chunk_ids?: string[];
  chunking_strategy?: ChunkingStrategy;
  message?: string;
  [key: string]: unknown;
}

export interface FinalizeChunksRequest {
  batch_size?: number;
  chunk_ids?: string[] | null;
  embedding_model?: string;
}

export interface FinalizeChunksResponse {
  file_id?: string;
  indexed_chunks?: number;
  message?: string;
  [key: string]: unknown;
}

// Task Status & Management
export interface TaskStatus {
  task_id: string;
  task_type: string;
  description: string;
  user_id: string;
  file_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  processing_time?: number;
  error?: string;
}

export interface TaskStatsResponse {
  user_id: string;
  total_tasks: number;
  by_status: Record<string, number>;
  by_type?: Record<string, number>;
  recent_tasks?: TaskStatus[];
}

// Query & Conversation
export type SearchType = 'dense' | 'sparse' | 'hybrid';

export interface QueryRequest {
  question: string;
  knowledge_base_id: string;
  top_k?: number;
  file_id?: string;
  temperature?: number;
  search_type?: SearchType;
}

export interface ConversationQueryRequest {
  question: string;
  conversation_id: string;
  knowledge_base_id: string;
  top_k?: number;
  file_id?: string;
  temperature?: number;
  search_type?: SearchType;
}

export interface SourceDocument {
  content: string;
  filename: string;
  chunk_id: string;
  file_id: string;
  knowledge_base_id?: string;
  full_text?: string;
  relevance_score: number;
  page_number?: number;
  chunk_type?: string;
  chunk_index?: number;
  semantic_score?: number;
  keyword_score?: number;
}

export interface QueryResponse {
  question: string;
  answer: string;
  sources: SourceDocument[];
  processing_time: number;
  search_type?: SearchType;
  confidence_score?: number;
  knowledge_base_id?: string;
  conversation_id?: string;
}

// Knowledge Base
export interface DocumentInfo {
  file_id: string;
  knowledge_base_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: ProcessingStatus;
  chunks_created: number;
  total_pages: number;
  uploaded_at: string;
  processed_at?: string;
  word_count?: number;
  image_count?: number;
  table_count?: number;
  chunking_strategy?: string;
}

export interface KnowledgeBaseStatus {
  knowledge_base_id: string;
  knowledge_base_name: string;
  user_id: string;
  description?: string | null;
  total_documents: number;
  total_chunks: number;
  documents: DocumentInfo[];
  total_size_bytes?: number;
  created_at: string;
  last_accessed?: string;
}

export interface KnowledgeBaseInfo {
  knowledge_base_id: string;
  user_id: string;
  knowledge_base_name: string;
  description?: string | null;
  document_count?: number;
  total_chunks?: number;
  total_size_bytes?: number;
  created_at: string;
  updated_at?: string | null;
  last_accessed?: string | null;
}

export interface KnowledgeBaseList {
  user_id: string;
  total_knowledge_bases: number;
  knowledge_bases: KnowledgeBaseInfo[];
}

export interface KnowledgeBaseCreate {
  knowledge_base_name: string;
  description?: string | null;
}

export interface KnowledgeBaseUpdate {
  knowledge_base_name?: string | null;
  description?: string | null;
}

export interface UserStats {
  user_id: string;
  total_documents: number;
  total_chunks: number;
  total_queries: number;
  total_conversations: number;
  total_size_bytes: number;
  avg_chunks_per_document: number;
  documents_by_status: Record<ProcessingStatus, number>;
}

// Chunk Management
export interface ChunkDetailResponse {
  chunk_id: string;
  file_id: string;
  text: string;
  filename: string;
  user_id: string;
  chunk_type?: string;
  page_number?: number;
  char_count: number;
  chunk_index: number;
  created_at: string;
  edited?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateChunkRequest {
  file_id: string;
  chunk_id: string;
  new_text: string;
  preserve_metadata?: boolean;
}

export interface UpdateChunkResponse {
  message: string;
  chunk_id: string;
  file_id: string;
  user_id: string;
  old_char_count: number;
  new_char_count: number;
  updated_at: string;
}

// Markdown Output
export interface MarkdownFileInfo {
  file_id: string;
  filename: string;
  user_id: string;
  created_at?: string;
  file_size?: number;
}

// Model & Settings
export interface ModelInfoResponse {
  current_model_id: string;
  temperature: number;
  max_tokens: number;
  embedding_model_id: string;
}

export interface ModelUpdateRequest {
  model_id: string;
}

export interface AppSettings {
  topK: number;
  chatModel: string;
  embeddingModel?: string;
}

// Conversation History
export interface ConversationMessage {
  question: string;
  answer: string;
  timestamp: string;
  sources: SourceDocument[];
}

export interface ConversationHistory {
  conversation_id: string;
  user_id: string;
  created_at: string;
  last_updated_at: string;
  messages: ConversationMessage[];
}

export interface QueryHistoryItem {
  query_id: string;
  question: string;
  answer: string;
  timestamp: string;
  conversation_id?: string;
  processing_time: number;
  sources_count: number;
}
