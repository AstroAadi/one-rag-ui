import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChunkDetailResponse,
  ChunkingStrategy,
  CreateChunksResponse,
  DocumentProcessRequest,
  FinalizeChunksRequest,
  FinalizeChunksResponse,
  PreviewChunksResponse,
  UpdateChunkRequest,
  UpdateChunkResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ChunkService {
  private readonly API_URL = environment.apiUrl;
  private readonly ROOT_API_URL = this.API_URL.endsWith('/api')
    ? this.API_URL.slice(0, -4)
    : this.API_URL;

  constructor(private http: HttpClient) {}

  createChunks(fileId: string, settings: DocumentProcessRequest): Observable<CreateChunksResponse> {
    const strategy = settings.chunking_strategy || 'default';
    const payload = this.buildChunkingPayload(fileId, strategy, settings);
    return this.http.post<CreateChunksResponse>(
      `${this.ROOT_API_URL}/create`,
      payload
    );
  }

  previewChunks(fileId: string, settings: DocumentProcessRequest): Observable<PreviewChunksResponse> {
    const strategy = settings.chunking_strategy || 'default';
    const payload = this.buildChunkingPayload(fileId, strategy, settings);
    return this.http.post<PreviewChunksResponse>(
      `${this.ROOT_API_URL}/preview`,
      payload
    );
  }

  private buildChunkingPayload(
    fileId: string,
    strategy: ChunkingStrategy,
    settings: DocumentProcessRequest
  ): Record<string, unknown> {
    const basePayload: Record<string, unknown> = {
      file_id: fileId,
      chunking_strategy: strategy
    };

    if (strategy === 'default' || strategy === 'no_chunking') {
      return basePayload;
    }

    if (strategy === 'fixed_size') {
      return {
        ...basePayload,
        chunk_size: settings.chunk_size,
        chunk_overlap: settings.chunk_overlap
      };
    }

    if (strategy === 'semantic') {
      return {
        ...basePayload,
        chunk_size: settings.chunk_size,
        chunk_overlap: settings.chunk_overlap,
        max_buffer_size: settings.max_buffer_size,
        breakpoint_threshold: settings.breakpoint_threshold
      };
    }

    return {
      ...basePayload,
      parent_chunk_size: settings.parent_chunk_size,
      child_chunk_size: settings.child_chunk_size,
      child_chunk_overlap: settings.child_chunk_overlap
    };
  }

  finalizeChunks(fileId: string, request: FinalizeChunksRequest = {}): Observable<FinalizeChunksResponse> {
    const params = new URLSearchParams();
    params.append('file_id', fileId);
    if (request.batch_size !== undefined) {
      params.append('batch_size', request.batch_size.toString());
    }
    if (request.embedding_model) {
      params.append('embedding_model', request.embedding_model);
    }

    return this.http.post<FinalizeChunksResponse>(
      `${this.ROOT_API_URL}/finalize?${params.toString()}`,
      request.chunk_ids ?? null
    );
  }

  /**
   * Get chunk details by chunk ID
   * @param chunkId Unique chunk identifier
   * @param fileId Optional file ID for additional validation
   * @param knowledgeBaseId Optional KB ID for validation
   */
  getChunkDetails(chunkId: string, fileId?: string, knowledgeBaseId?: string): Observable<ChunkDetailResponse> {
    let url = `${this.API_URL}/chunks/${chunkId}`;
    const params = new URLSearchParams();
    if (fileId) params.append('file_id', fileId);
    if (knowledgeBaseId) params.append('knowledge_base_id', knowledgeBaseId);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    return this.http.get<ChunkDetailResponse>(url);
  }

  /**
   * Edit a chunk in the vector database
   * Re-embeds the new text and updates vectors in Qdrant
   * @param request Update chunk request with file_id, chunk_id, and new_text
   */
  editChunk(request: UpdateChunkRequest): Observable<UpdateChunkResponse> {
    return this.http.put<UpdateChunkResponse>(
      `${this.API_URL}/chunks/edit`,
      request
    );
  }

  /**
   * List all chunks for a specific file
   * @param fileId Parent file ID
   * @param limit Maximum number of chunks to return (default: 100)
   */
  listFileChunks(fileId: string, limit: number = 100): Observable<ChunkDetailResponse[]> {
    return this.http.get<ChunkDetailResponse[]>(
      `${this.API_URL}/chunks/file/${fileId}/chunks?limit=${limit}`
    );
  }

  /**
   * List all chunks for a knowledge base (paginated)
   */
  listKnowledgeBaseChunks(kbId: string, limit: number = 100, offset: number = 0): Observable<ChunkDetailResponse[]> {
    return this.http.get<ChunkDetailResponse[]>(
      `${this.API_URL}/chunks/kb/${kbId}/chunks?limit=${limit}&offset=${offset}`
    );
  }
}
