import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { ChunkService } from '../services/chunk.service';
import { FileService } from '../services/file.service';
import { SettingsService } from '../services/settings.service';
import { ChunkingStrategy, DocumentProcessRequest, FinalizeChunksRequest, ProcessingStatusResponse } from '../models';

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

  isFinalizing: boolean = false;
  isFinalized: boolean = false;

  errorMessage: string | null = null;

  chunkingSettings: DocumentProcessRequest = {
    chunking_strategy: 'fixed_size',
    target_chunk_tokens: 512,
    chunk_overlap_tokens: 50
  };

  chunkingStrategies: Array<{ value: ChunkingStrategy; label: string }> = [
    { value: 'default', label: 'Default' },
    { value: 'fixed_size', label: 'Fixed Size' },
    { value: 'hierarchical', label: 'Hierarchical' },
    { value: 'semantic', label: 'Semantic' }
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
    this.selectedEmbeddingModel = this.embeddingModels[1]?.id || this.embeddingModels[0]?.id || '';
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  toggleSection(section: SectionKey): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  onClose(): void {
    this.stopStatusPolling();
    this.closeModal.emit();
  }

  handleBackdropClick(event: MouseEvent): void {
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
    if (!this.knowledgeBaseName) {
      this.errorMessage = 'No active knowledge base selected.';
      return;
    }

    this.errorMessage = null;
    this.uploadState = 'uploading';
    this.uploadProgress = 10;
    this.uploadMessage = 'Uploading document...';

    this.fileService.uploadFile(this.selectedFile, this.knowledgeBaseName).subscribe({
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
        this.chunkCount = typeof response.chunk_count === 'number' ? response.chunk_count : null;
      },
      error: (err: unknown) => {
        this.isChunking = false;
        this.errorMessage = this.getErrorMessage(err, 'Chunk creation failed');
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
}
