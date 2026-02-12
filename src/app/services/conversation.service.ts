import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ConversationHistory, QueryHistoryItem } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get conversation history from database
   */
  getConversationHistory(conversationId: string): Observable<ConversationHistory> {
    return this.http.get<ConversationHistory>(
      `${this.API_URL}/query/history/${conversationId}`
    );
  }

  /**
   * Clear conversation history from database
   */
  clearConversation(conversationId: string): Observable<any> {
    return this.http.post(
      `${this.API_URL}/query/clear-conversation/${conversationId}`,
      {}
    );
  }

  /**
   * Get recent queries for current user
   */
  getMyQueries(limit: number = 20): Observable<QueryHistoryItem[]> {
    return this.http.get<QueryHistoryItem[]>(
      `${this.API_URL}/query/my-queries`,
      { params: { limit: limit.toString() } }
    );
  }
}
