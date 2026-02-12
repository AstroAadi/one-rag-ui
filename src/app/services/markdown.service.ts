import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MarkdownFileInfo } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get markdown file content by user_id and file_id
   * @param userId User identifier
   * @param fileId File identifier (without .md extension)
   * @returns Markdown file content as plain text
   */
  getMarkdownFile(userId: string, fileId: string): Observable<string> {
    return this.http.get(
      `${this.API_URL}/markdown_output/${userId}/${fileId}.md`,
      { responseType: 'text' }
    );
  }

  /**
   * Delete a markdown file by user_id and file_id
   * @param userId User identifier
   * @param fileId File identifier
   */
  deleteMarkdownFile(userId: string, fileId: string): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/markdown_output/${userId}/${fileId}.md`
    );
  }

  /**
   * Download markdown file (forces download instead of inline display)
   * @param userId User identifier
   * @param fileId File identifier
   */
  downloadMarkdownFile(userId: string, fileId: string): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}/markdown_output/${userId}/${fileId}.md/download`,
      { responseType: 'blob' }
    );
  }

  /**
   * List all markdown files for a specific user
   * @param userId User identifier
   * @returns List of markdown files with metadata
   */
  listMarkdownFiles(userId: string): Observable<MarkdownFileInfo[]> {
    return this.http.get<MarkdownFileInfo[]>(
      `${this.API_URL}/markdown_output/list/${userId}`
    );
  }

  /**
   * Get markdown file URL for direct access
   * Useful for displaying in iframe or fetching with custom options
   */
  getMarkdownFileUrl(userId: string, fileId: string): string {
    return `${this.API_URL}/markdown_output/${userId}/${fileId}.md`;
  }

  /**
   * Get markdown download URL
   */
  getDownloadUrl(userId: string, fileId: string): string {
    return `${this.API_URL}/markdown_output/${userId}/${fileId}.md/download`;
  }
}
