import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FileUploadResponse, DocumentProcessRequest, ProcessingStatusResponse, ChunkingStrategy, MarkdownFileInfo } from '../models';

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

  uploadFile(file: File, knowledgeBaseName: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('knowledge_base_name', knowledgeBaseName);
    
    return this.http.post<FileUploadResponse>(
      `${this.API_URL}/upload/`,
      formData
    );
  }

  /**
   * Process and index a document (asynchronous - returns task_id)
   * Process runs in background and returns a task_id for status tracking
   */
  processDocument(
    fileId: string, 
    settings?: DocumentProcessRequest
  ): Observable<{ task_id: string }> {
    const params = new URLSearchParams();
    
    if (settings?.chunking_strategy) {
      params.append('chunking_strategy', settings.chunking_strategy);
    }
    if (settings?.chunk_size !== undefined) {
      params.append('chunk_size', settings.chunk_size.toString());
    }
    if (settings?.chunk_overlap !== undefined) {
      params.append('chunk_overlap', settings.chunk_overlap.toString());
    }
    if (settings?.max_buffer_size !== undefined) {
      params.append('max_buffer_size', settings.max_buffer_size.toString());
    }
    if (settings?.breakpoint_threshold !== undefined) {
      params.append('breakpoint_threshold', settings.breakpoint_threshold.toString());
    }
    if (settings?.parent_chunk_size !== undefined) {
      params.append('parent_chunk_size', settings.parent_chunk_size.toString());
    }
    if (settings?.child_chunk_size !== undefined) {
      params.append('child_chunk_size', settings.child_chunk_size.toString());
    }
    if (settings?.child_chunk_overlap !== undefined) {
      params.append('child_chunk_overlap', settings.child_chunk_overlap.toString());
    }

    const queryString = params.toString();
    const url = `${this.API_URL}/upload/process/${fileId}${queryString ? '?' + queryString : ''}`;
    
    return this.http.post<{ task_id: string }>(url, {});
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
    return this.http.get<ChunkingStrategy[]>(
      `${this.API_URL}/upload/chunking-strategies`
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
