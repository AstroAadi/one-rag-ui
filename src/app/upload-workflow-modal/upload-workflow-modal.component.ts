import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { ChunkService } from '../services/chunk.service';
import { FileService } from '../services/file.service';
import { SettingsService } from '../services/settings.service';
import {
  ChunkingStrategy,
  DocumentProcessRequest,
  FinalizeChunksRequest,
  PreviewChunk,
  PreviewChunksResponse,
  ProcessingStatusResponse
} from '../models';

type SectionKey = 'upload' | 'chunk' | 'finalize';
type UploadState = 'idle' | 'uploading' | 'uploaded' | 'failed';

@Component({
  selector: 'app-upload-workflow-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-workflow-modal.component.html',
  styleUrls: ['./upload-workflow-modal.component.css']
})
export class UploadWorkflowModalComponent implements OnDestroy {
  @Input() knowledgeBaseName: string = '';
  @Input() knowledgeBaseId: string = '';
  @Input() inline: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() workflowCompleted = new EventEmitter<string>();

  expandedSections: Record<SectionKey, boolean> = {
    upload: true,
    chunk: true,
    finalize: true
  };

  selectedFile: File | null = null;
  uploadedFileId: string | null = null;
  uploadedFilename: string = '';

  uploadState: UploadState = 'idle';
  uploadProgress: number = 0;
  uploadMessage: string = 'Select a file to begin.';

  isChunking: boolean = false;
  isChunked: boolean = false;
  chunkCount: number | null = null;
  isPreviewLoading: boolean = false;
  previewChunksData: PreviewChunk[] = [];
  previewParentChunks: PreviewChunk[] = [];
  showPreviewPopup: boolean = false;

  isFinalizing: boolean = false;
  isFinalized: boolean = false;

  errorMessage: string | null = null;

  chunkingSettings: DocumentProcessRequest = {
    chunking_strategy: 'fixed_size',
    chunk_size: 512,
    chunk_overlap: 50,
    max_buffer_size: 8,
    breakpoint_threshold: 0.65,
    parent_chunk_size: 1500,
    child_chunk_size: 300,
    child_chunk_overlap: 30
  };

  chunkingStrategies: Array<{ value: ChunkingStrategy; label: string }> = [
    { value: 'default', label: 'Default' },
    { value: 'fixed_size', label: 'Fixed Size' },
    { value: 'hierarchical', label: 'Hierarchical' },
    { value: 'semantic', label: 'Semantic' },
    { value: 'no_chunking', label: 'No Chunking' }
  ];

  embeddingModels: Array<{ id: string; name: string }> = [];
  selectedEmbeddingModel: string = '';
  batchSize: number = 50;

  private statusPollingSub: Subscription | null = null;

  constructor(
    private fileService: FileService,
    private chunkService: ChunkService,
    private settingsService: SettingsService
  ) {
    this.embeddingModels = this.settingsService.availableEmbeddingModels;
    this.selectedEmbeddingModel = this.embeddingModels[0]?.id || this.embeddingModels[1]?.id || '';
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  toggleSection(section: SectionKey): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  onClose(): void {
    this.stopStatusPolling();
    this.showPreviewPopup = false;
    this.closeModal.emit();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (this.inline) {
      return;
    }
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!this.fileService.validateFile(file)) {
      this.errorMessage = 'File format not supported. Check supported formats.';
      this.selectedFile = null;
      return;
    }

    this.resetWorkflowForNewFile();
    this.selectedFile = file;
    this.uploadMessage = 'Ready to upload.';
  }

  startUpload(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Select a file before uploading.';
      return;
    }
    if (!this.knowledgeBaseName && !this.knowledgeBaseId) {
      this.errorMessage = 'No active knowledge base selected.';
      return;
    }

    this.errorMessage = null;
    this.uploadState = 'uploading';
    this.uploadProgress = 10;
    this.uploadMessage = 'Uploading document...';

    this.fileService.uploadFile(
      this.selectedFile,
      this.knowledgeBaseName,
      this.knowledgeBaseId
    ).subscribe({
      next: (uploadResponse) => {
        this.uploadedFileId = uploadResponse.file_id;
        this.uploadedFilename = uploadResponse.filename;
        this.uploadProgress = 20;
        this.uploadMessage = 'Extracting document...';
        this.startStatusPolling(uploadResponse.file_id);
      },
      error: (err: unknown) => {
        this.uploadState = 'failed';
        this.uploadProgress = 0;
        this.errorMessage = this.getErrorMessage(err, 'Upload failed');
      }
    });
  }

  createChunks(): void {
    if (!this.uploadedFileId || this.uploadState !== 'uploaded') {
      this.errorMessage = 'Upload and extraction must complete before chunking.';
      return;
    }

    this.errorMessage = null;
    this.isChunking = true;

    this.chunkService.createChunks(this.uploadedFileId, this.chunkingSettings).subscribe({
      next: (response) => {
        this.isChunking = false;
        this.isChunked = true;
        this.chunkCount = typeof response.chunks_created === 'number'
          ? response.chunks_created
          : (typeof response.chunk_count === 'number' ? response.chunk_count : null);
      },
      error: (err: unknown) => {
        this.isChunking = false;
        this.errorMessage = this.getErrorMessage(err, 'Chunk creation failed');
      }
    });
  }

  previewChunks(): void {
    if (!this.uploadedFileId || this.uploadState !== 'uploaded') {
      this.errorMessage = 'Upload and extraction must complete before previewing chunks.';
      return;
    }

    this.errorMessage = null;
    this.isPreviewLoading = true;
    this.previewChunksData = [];
    this.previewParentChunks = [];

    this.chunkService.previewChunks(this.uploadedFileId, this.chunkingSettings).subscribe({
      next: (response: PreviewChunksResponse) => {
        this.isPreviewLoading = false;
        const normalized = this.normalizePreviewResponse(response);
        this.previewChunksData = normalized.flat;
        this.previewParentChunks = normalized.parents;
        this.showPreviewPopup = true;
      },
      error: (err: unknown) => {
        this.isPreviewLoading = false;
        this.errorMessage = this.getErrorMessage(err, 'Chunk preview failed');
      }
    });
  }

  finalizeChunks(): void {
    if (!this.uploadedFileId || !this.isChunked) {
      this.errorMessage = 'Create chunks before finalizing.';
      return;
    }

    this.errorMessage = null;
    this.isFinalizing = true;

    const request: FinalizeChunksRequest = {
      batch_size: this.batchSize,
      embedding_model: this.selectedEmbeddingModel
    };

    this.chunkService.finalizeChunks(this.uploadedFileId, request).subscribe({
      next: () => {
        this.isFinalizing = false;
        this.isFinalized = true;
        if (this.uploadedFileId) {
          this.workflowCompleted.emit(this.uploadedFileId);
        }
      },
      error: (err: unknown) => {
        this.isFinalizing = false;
        this.errorMessage = this.getErrorMessage(err, 'Finalize failed');
      }
    });
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes < 1) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  }

  private startStatusPolling(fileId: string): void {
    this.stopStatusPolling();
    this.statusPollingSub = timer(0, 2000).pipe(
      switchMap(() => this.fileService.getProcessingStatus(fileId)),
      takeWhile(status => status.status !== 'completed' && status.status !== 'failed', true)
    ).subscribe({
      next: (statusResponse: ProcessingStatusResponse) => {
        this.uploadProgress = this.resolveProgress(statusResponse);
        this.uploadMessage = statusResponse.message || this.statusLabel(statusResponse.status);

        if (statusResponse.status === 'completed') {
          this.uploadState = 'uploaded';
          this.uploadProgress = 100;
          this.uploadMessage = 'Upload and extraction completed.';
        } else if (statusResponse.status === 'failed') {
          this.uploadState = 'failed';
          this.errorMessage = statusResponse.message || 'Document extraction failed.';
        }
      },
      error: (err: unknown) => {
        this.uploadState = 'failed';
        this.errorMessage = this.getErrorMessage(err, 'Could not fetch upload status');
      }
    });
  }

  private resolveProgress(statusResponse: ProcessingStatusResponse): number {
    if (typeof statusResponse.progress === 'number' && Number.isFinite(statusResponse.progress)) {
      const bounded = Math.max(0, Math.min(100, Math.round(statusResponse.progress)));
      return statusResponse.status === 'completed' ? 100 : bounded;
    }

    if (statusResponse.status === 'completed') {
      return 100;
    }
    if (statusResponse.status === 'failed') {
      return this.uploadProgress;
    }
    if (statusResponse.status === 'processing') {
      return Math.max(this.uploadProgress, 35);
    }
    return Math.max(this.uploadProgress, 20);
  }

  private statusLabel(status: ProcessingStatusResponse['status']): string {
    if (status === 'processing') return 'Processing...';
    if (status === 'completed') return 'Completed';
    if (status === 'failed') return 'Failed';
    return 'Uploaded';
  }

  private resetWorkflowForNewFile(): void {
    this.stopStatusPolling();
    this.errorMessage = null;
    this.uploadedFileId = null;
    this.uploadedFilename = '';
    this.uploadState = 'idle';
    this.uploadProgress = 0;
    this.uploadMessage = 'Select a file to begin.';
    this.isChunking = false;
    this.isChunked = false;
    this.chunkCount = null;
    this.isPreviewLoading = false;
    this.previewChunksData = [];
    this.previewParentChunks = [];
    this.showPreviewPopup = false;
    this.isFinalizing = false;
    this.isFinalized = false;
  }

  private stopStatusPolling(): void {
    if (this.statusPollingSub) {
      this.statusPollingSub.unsubscribe();
      this.statusPollingSub = null;
    }
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (!err || typeof err !== 'object') {
      return fallback;
    }
    const errorObj = err as { error?: { detail?: string }, message?: string };
    return errorObj.error?.detail || errorObj.message || fallback;
  }

  usesFixedSettings(): boolean {
    return this.chunkingSettings.chunking_strategy === 'fixed_size' || this.chunkingSettings.chunking_strategy === 'semantic';
  }

  isSemanticStrategy(): boolean {
    return this.chunkingSettings.chunking_strategy === 'semantic';
  }

  isHierarchicalStrategy(): boolean {
    return this.chunkingSettings.chunking_strategy === 'hierarchical';
  }

  getPreviewText(chunk: PreviewChunk): string {
    return chunk.content_preview || chunk.text || chunk.content || '';
  }

  getCharCount(chunk: PreviewChunk): number | null {
    const value = (chunk.char_count ?? chunk.full_char_count);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  getChunkType(chunk: PreviewChunk): string {
    const t = chunk.chunk_type;
    return typeof t === 'string' && t.trim() ? t : (Array.isArray(chunk.children) ? 'parent' : 'chunk');
  }

  closePreviewPopup(): void {
    this.showPreviewPopup = false;
  }

  handlePreviewBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePreviewPopup();
    }
  }

  private normalizePreviewResponse(response: PreviewChunksResponse): {
    flat: PreviewChunk[];
    parents: PreviewChunk[];
  } {
    const candidates = [response.preview_chunks, response.chunks, response.sample_chunks];
    const firstList = candidates.find((value) => Array.isArray(value)) as PreviewChunk[] | undefined;
    const list = Array.isArray(firstList) ? firstList : [];

    const isParentLike = (chunk: PreviewChunk): boolean => {
      if (chunk.chunk_type === 'parent') return true;
      if (Array.isArray(chunk.children) && chunk.children.length > 0) return true;
      return false;
    };

    const parents = list.filter(isParentLike);

    if (parents.length > 0) {
      return {
        flat: [],
        parents: parents.slice(0, 5)
      };
    }

    return {
      flat: list.slice(0, 5),
      parents: []
    };
  }
}
