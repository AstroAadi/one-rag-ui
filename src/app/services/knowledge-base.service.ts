import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { KnowledgeBaseStatus, KnowledgeBaseList, KnowledgeBaseInfo, KnowledgeBaseCreate, KnowledgeBaseUpdate } from '../models';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * List all knowledge bases for the current user
   */
  listKnowledgeBases(): Observable<KnowledgeBaseList> {
    return this.http.get<KnowledgeBaseList>(`${this.API_URL}/knowledge-bases/`);
  }

  /**
   * Create a new knowledge base
   */
  createKnowledgeBase(request: KnowledgeBaseCreate): Observable<KnowledgeBaseInfo> {
    return this.http.post<KnowledgeBaseInfo>(`${this.API_URL}/knowledge-bases/`, request);
  }

  /**
   * Get detailed status of a knowledge base
   */
  getKnowledgeBaseStatus(kbId: string): Observable<KnowledgeBaseStatus> {
    return this.http.get<KnowledgeBaseStatus>(`${this.API_URL}/knowledge-bases/${kbId}`);
  }

  /**
   * Update knowledge base name or description
   */
  updateKnowledgeBase(kbId: string, request: KnowledgeBaseUpdate): Observable<KnowledgeBaseInfo> {
    return this.http.put<KnowledgeBaseInfo>(`${this.API_URL}/knowledge-bases/${kbId}`, request);
  }

  /**
   * Delete a knowledge base and all its contents
   */
  deleteKnowledgeBase(kbId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/knowledge-bases/${kbId}`);
  }

  /**
   * Delete a specific document from a knowledge base
   */
  deleteDocumentFromKnowledgeBase(kbId: string, fileId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/knowledge-bases/${kbId}/documents/${fileId}`);
  }

  /**
   * Get detailed statistics for a knowledge base
   */
  getKnowledgeBaseStats(kbId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/knowledge-bases/${kbId}/stats`);
  }

  /**
   * Health check endpoint - verify API is running
   * Checks:
   * - Database connectivity
   * - Task manager status
   * - System resources
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.API_URL}/health`);
  }

  /**
   * Get system metrics
   * Returns detailed metrics about:
   * - Task processing
   * - Database connections
   * - Request statistics
   */
  getMetrics(): Observable<any> {
    return this.http.get(`${this.API_URL}/metrics`);
  }

  /**
   * Get root endpoint info
   * Returns system information
   */
  getRootInfo(): Observable<any> {
    return this.http.get(`${this.API_URL}/`);
  }
}
