import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  APIKBRequest,
  ChunkingStrategy,
  CloudStorageKBRequest,
  DatabaseKBAddDataRequest,
  DatabaseKBRequest,
  DocumentProcessRequest,
  FileUploadResponse,
  MarkdownFileInfo,
  ProcessingStatusResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly API_URL = environment.apiUrl;
  
  // All supported file types
  private readonly SUPPORTED_FORMATS = [
    'bmp', 'csv', 'doc', 'docx', 'gif', 'jpeg', 'jpg', 'log', 'markdown', 'md',
    'mdown', 'mkd', 'pdf', 'png', 'ppt', 'pptx', 'text', 'tif', 'tiff', 'tsv',
    'txt', 'webp', 'xls', 'xlsm', 'xlsx'
  ];

  // Image preview formats (can be displayed directly)
  private readonly IMAGE_FORMATS = ['bmp', 'gif', 'jpeg', 'jpg', 'png', 'tif', 'tiff', 'webp'];

  // Text preview formats (can be displayed as text)
  private readonly TEXT_FORMATS = ['csv', 'log', 'markdown', 'md', 'mdown', 'mkd', 'text', 'tsv', 'txt'];

  // PDF preview formats (can be displayed in iframe with PDF viewer)
  private readonly PDF_FORMATS = ['pdf'];

  // Document formats that need special handling (convert to PDF for preview)
  private readonly DOCUMENT_FORMATS = ['doc', 'docx', 'ppt', 'pptx'];
  private readonly SUPPORTED_CHUNKING_STRATEGIES: ChunkingStrategy[] = [
    'default',
    'fixed_size',
    'hierarchical',
    'semantic',
    'no_chunking'
  ];

  constructor(private http: HttpClient) {}

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Validate if file format is supported
   */
  validateFile(file: File): boolean {
    const extension = this.getFileExtension(file.name);
    return this.SUPPORTED_FORMATS.includes(extension);
  }

  /**
   * Get the type category of a file (image, text, pdf, document, etc)
   */
  getFileCategory(filename: string): 'image' | 'text' | 'pdf' | 'document' | 'unknown' {
    const ext = this.getFileExtension(filename);
    
    if (this.IMAGE_FORMATS.includes(ext)) return 'image';
    if (this.TEXT_FORMATS.includes(ext)) return 'text';
    if (this.PDF_FORMATS.includes(ext)) return 'pdf';
    if (this.DOCUMENT_FORMATS.includes(ext)) return 'document';
    
    return 'unknown';
  }

  /**
   * Check if file can be previewed directly (images, PDFs, text)
   */
  canPreviewDirectly(filename: string): boolean {
    const category = this.getFileCategory(filename);
    return category === 'image' || category === 'pdf' || category === 'text';
  }

  uploadFile(
    file: File,
    knowledgeBaseName?: string,
    knowledgeBaseId?: string
  ): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Keep both keys for backward/forward compatibility across backend versions.
    if (knowledgeBaseName && knowledgeBaseName.trim()) {
      formData.append('knowledge_base_name', knowledgeBaseName.trim());
    }
    if (knowledgeBaseId && knowledgeBaseId.trim()) {
      formData.append('knowledge_base_id', knowledgeBaseId.trim());
    }
    
    return this.http.post<FileUploadResponse>(
      `${this.API_URL}/upload/file-upload`,
      formData
    );
  }

  /**
   * This endpoint was removed from the API.
   * Use ChunkService.createChunks() and ChunkService.finalizeChunks() instead.
   */
  processDocument(
    fileId: string,
    settings?: DocumentProcessRequest
  ): Observable<{ task_id: string }> {
    void fileId;
    void settings;
    return throwError(() => new Error(
      'processDocument endpoint removed. Use ChunkService.createChunks() and ChunkService.finalizeChunks().'
    ));
  }

  /**
   * Get processing status for a file
   */
  getProcessingStatus(fileId: string): Observable<ProcessingStatusResponse> {
    return this.http.get<ProcessingStatusResponse>(
      `${this.API_URL}/upload/status/${fileId}`
    );
  }

  /**
   * Get available chunking strategies
   */
  getChunkingStrategies(): Observable<ChunkingStrategy[]> {
    return of(this.SUPPORTED_CHUNKING_STRATEGIES);
  }

  /**
   * Create a KB from cloud storage source (S3/Azure/GCS)
   */
  createCloudStorageKB(request: CloudStorageKBRequest): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `${this.API_URL}/upload/cloud-storage`,
      request
    );
  }

  /**
   * Create a KB from database source
   */
  createDatabaseKB(request: DatabaseKBRequest): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `${this.API_URL}/upload/database`,
      request
    );
  }

  /**
   * Manually sync an existing database KB
   */
  syncDatabaseKB(kbId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `${this.API_URL}/upload/database/sync/${kbId}`,
      {}
    );
  }

  /**
   * Append query results to an existing database KB
   */
  addDataToDatabaseKB(kbId: string, request: DatabaseKBAddDataRequest): Observable<Record<string, unknown>> {
    return this.http.put<Record<string, unknown>>(
      `${this.API_URL}/upload/database/${kbId}`,
      request
    );
  }

  /**
   * Create a KB from API endpoint source
   */
  createApiEndpointKB(request: APIKBRequest): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `${this.API_URL}/upload/api-endpoint`,
      request
    );
  }

  /**
   * Create blob URL for preview
   */
  createBlobUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Create a data URL from file for text preview
   */
  createTextPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        // Wrap text in HTML for display
        const html = `
          <pre style="padding: 20px; font-family: 'Monaco', 'Menlo', monospace; 
                       font-size: 12px; line-height: 1.4; white-space: pre-wrap; 
                       word-wrap: break-word; color: #1f2937; background: #f8fafc;">${this.escapeHtml(text)}</pre>
        `;
        const blob = new Blob([html], { type: 'text/html' });
        resolve(URL.createObjectURL(blob));
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Fetch markdown content from backend
   */
  getMarkdownContent(markdownPath: string): Observable<string> {
    // Handle relative paths by making them relative to API URL
    let url = markdownPath;
    if (!url.startsWith('http')) {
      // Remove leading slash if present, then prepend API URL
      url = url.startsWith('/') ? url.substring(1) : url;
      url = `${this.API_URL}/${url}`;
    }
    return this.http.get(url, { responseType: 'text' });
  }

  /**
   * List markdown files for a user
   */
  listMarkdownFiles(userId: string): Observable<MarkdownFileInfo[]> {
    return this.http.get<MarkdownFileInfo[]>(
      `${this.API_URL}/markdown_output/list/${userId}`
    );
  }

  /**
   * Get markdown file content by user and file ID
   */
  getMarkdownFile(userId: string, fileId: string): Observable<string> {
    return this.http.get(
      `${this.API_URL}/markdown_output/${userId}/${fileId}.md`,
      { responseType: 'text' }
    );
  }

  /**
   * Get a direct download URL for a markdown file
   */
  getMarkdownDownloadUrl(userId: string, fileId: string): string {
    return `${this.API_URL}/markdown_output/${userId}/${fileId}.md/download`;
  }

  /**
   * Delete a markdown file
   */
  deleteMarkdownFile(userId: string, fileId: string): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/markdown_output/${userId}/${fileId}.md`
    );
  }
}
