import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { QueryResponse, QueryHistoryItem } from '../models';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_URL = environment.apiUrl;
  private currentConversationId: string | null = null;

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService
  ) {
    // Initialize with a new conversation ID
    this.generateNewConversationId();
  }

  /**
   * Generate a new conversation ID for tracking multi-turn conversations
   */
  private generateNewConversationId(): void {
    this.currentConversationId = crypto.randomUUID();
  }

  /**
   * Get the current conversation ID
   */
  getCurrentConversationId(): string {
    if (!this.currentConversationId) {
      this.generateNewConversationId();
    }
    return this.currentConversationId || crypto.randomUUID();
  }

  /**
   * Start a new conversation (reset conversation ID)
   */
  startNewConversation(): void {
    this.generateNewConversationId();
  }

  /**
   * Query knowledge base with search type (simple query)
   */
  queryKnowledgeBase(
    question: string, 
    knowledgeBaseId: string,
    topK?: number,
    fileId?: string,
    temperature?: number,
    searchType?: 'dense' | 'sparse' | 'hybrid'
  ): Observable<QueryResponse> {
    const settings = this.settingsService.getCurrentSettings();
    const actualTopK = topK !== undefined ? topK : settings.topK;
    const actualSearchType = searchType || this.settingsService.getSearchType();

    const payload: any = {
      question: question,
      knowledge_base_id: knowledgeBaseId,
      top_k: actualTopK,
      search_type: actualSearchType
    };

    // Add optional parameters if provided
    if (fileId) payload.file_id = fileId;
    if (temperature !== undefined) payload.temperature = temperature;

    return this.http.post<QueryResponse>(
      `${this.API_URL}/query/`,
      payload
    );
  }

  /**
   * Query knowledge base with conversation history for multi-turn conversations
   */
  queryWithConversation(
    question: string, 
    knowledgeBaseId: string,
    conversationId?: string,
    topK?: number,
    fileId?: string,
    temperature?: number,
    searchType?: 'dense' | 'sparse' | 'hybrid'
  ): Observable<QueryResponse> {
    const settings = this.settingsService.getCurrentSettings();
    const actualTopK = topK !== undefined ? topK : settings.topK;
    const actualSearchType = searchType || this.settingsService.getSearchType();
    const convId = conversationId || this.getCurrentConversationId();

    const payload: any = {
      question: question,
      knowledge_base_id: knowledgeBaseId,
      conversation_id: convId,
      top_k: actualTopK,
      search_type: actualSearchType
    };

    // Add optional parameters if provided
    if (fileId) payload.file_id = fileId;
    if (temperature !== undefined) payload.temperature = temperature;

    return this.http.post<QueryResponse>(
      `${this.API_URL}/query/conversation`,
      payload
    );
  }

  /**
   * Clear conversation history
   */
  clearConversation(conversationId?: string): Observable<any> {
    const convId = conversationId || this.getCurrentConversationId();
    
    return this.http.post(
      `${this.API_URL}/query/clear-conversation/${convId}`,
      {}
    );
  }

  /**
   * Reset current conversation and start fresh
   */
  resetConversation(): void {
    const currentConvId = this.currentConversationId;
    
    // Clear conversation from backend if it exists
    if (currentConvId) {
      this.clearConversation(currentConvId).subscribe({
        error: (err) => console.warn('Could not clear conversation from backend:', err)
      });
    }
    
    // Start new conversation locally
    this.startNewConversation();
  }

  /**
   * Get conversation history for a conversation ID
   */
  getConversationHistory(conversationId: string): Observable<any> {
    return this.http.get(
      `${this.API_URL}/query/history/${conversationId}`
    );
  }

  /**
   * Get recent queries for current user
   */
  getMyQueries(limit: number = 20): Observable<QueryHistoryItem[]> {
    return this.http.get<QueryHistoryItem[]>(
      `${this.API_URL}/query/my-queries?limit=${limit}`
    );
  }

  /**
   * Clear query cache for current user
   */
  clearQueryCache(): Observable<any> {
    return this.http.post(
      `${this.API_URL}/query/clear-cache`,
      {}
    );
  }

  /**
   * Edit a chunk in the knowledge base
   */
  editChunk(
    chunkId: string,
    fileId: string,
    newText: string,
    userId: string
  ): Observable<any> {
    const payload = {
      file_id: fileId,
      chunk_id: chunkId,
      new_text: newText,
      preserve_metadata: true
    };

    return this.http.put(
      `${this.API_URL}/chunks/edit`,
      payload,
      {
        headers: {
          'X-User-ID': userId
        }
      }
    );
  }
}
