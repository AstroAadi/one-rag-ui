import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChunkDetailResponse,
  CreateChunksResponse,
  DocumentProcessRequest,
  FinalizeChunksRequest,
  FinalizeChunksResponse,
  UpdateChunkRequest,
  UpdateChunkResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ChunkService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createChunks(fileId: string, settings: DocumentProcessRequest): Observable<CreateChunksResponse> {
    const params = new URLSearchParams();
    params.append('file_id', fileId);

    if (settings.chunking_strategy) {
      params.append('chunking_strategy', settings.chunking_strategy);
    }
    if (settings.target_chunk_tokens !== undefined) {
      params.append('target_chunk_tokens', settings.target_chunk_tokens.toString());
    }
    if (settings.chunk_overlap_tokens !== undefined) {
      params.append('chunk_overlap_tokens', settings.chunk_overlap_tokens.toString());
    }
    if (settings.force_recreate !== undefined) {
      params.append('force_recreate', String(settings.force_recreate));
    }

    return this.http.post<CreateChunksResponse>(
      `${this.API_URL}/chunks/create?${params.toString()}`,
      {}
    );
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
      `${this.API_URL}/chunks/finalize?${params.toString()}`,
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
