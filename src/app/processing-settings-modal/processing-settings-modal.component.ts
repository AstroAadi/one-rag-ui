import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChunkService } from '../services/chunk.service';
import { ChunkingStrategy, DocumentProcessRequest, PreviewChunk, PreviewChunksResponse } from '../models';

@Component({
  selector: 'app-processing-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing-settings-modal.component.html',
  styleUrls: ['./processing-settings-modal.component.css']
})
export class ProcessingSettingsModalComponent implements OnInit {
  @Input() fileName: string = '';
  @Input() fileId: string = '';
  @Input() inline: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() processDocument = new EventEmitter<DocumentProcessRequest>();

  isProcessing: boolean = false;
  isPreviewLoading: boolean = false;
  previewChunksData: PreviewChunk[] = [];
  previewParentChunks: PreviewChunk[] = [];
  showPreviewPopup: boolean = false;

  settings: {
    chunking_strategy: ChunkingStrategy;
    chunk_size: number;
    chunk_overlap: number;
    max_buffer_size: number;
    breakpoint_threshold: number;
    parent_chunk_size: number;
    child_chunk_size: number;
    child_chunk_overlap: number;
  } = {
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

  constructor(private chunkService: ChunkService) {}

  ngOnInit(): void {
    // Initialize settings with defaults
  }

  onProcess(): void {
    this.processDocument.emit(this.buildPayload());
  }

  onPreview(): void {
    if (!this.fileId) {
      return;
    }

    this.isPreviewLoading = true;
    this.previewChunksData = [];
    this.previewParentChunks = [];
    const payload = this.buildPayload();

    this.chunkService.previewChunks(this.fileId, payload).subscribe({
      next: (response: PreviewChunksResponse) => {
        this.isPreviewLoading = false;
        const normalized = this.normalizePreviewResponse(response);
        this.previewChunksData = normalized.flat;
        this.previewParentChunks = normalized.parents;
        this.showPreviewPopup = true;
      },
      error: () => {
        this.isPreviewLoading = false;
      }
    });
  }

  onClose(): void {
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

  resetToDefaults(): void {
    this.settings = {
      chunking_strategy: 'fixed_size',
      chunk_size: 512,
      chunk_overlap: 50,
      max_buffer_size: 8,
      breakpoint_threshold: 0.65,
      parent_chunk_size: 1500,
      child_chunk_size: 300,
      child_chunk_overlap: 30
    };
    this.previewChunksData = [];
    this.previewParentChunks = [];
    this.showPreviewPopup = false;
  }

  usesFixedSettings(): boolean {
    return this.settings.chunking_strategy === 'fixed_size' || this.settings.chunking_strategy === 'semantic';
  }

  isSemanticStrategy(): boolean {
    return this.settings.chunking_strategy === 'semantic';
  }

  isHierarchicalStrategy(): boolean {
    return this.settings.chunking_strategy === 'hierarchical';
  }

  getPreviewText(chunk: PreviewChunk): string {
    return chunk.content_preview || chunk.text || chunk.content || '';
  }

  getCharCount(chunk: PreviewChunk): number | null {
    const value = (chunk.char_count ?? chunk.full_char_count);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  closePreviewPopup(): void {
    this.showPreviewPopup = false;
  }

  handlePreviewBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePreviewPopup();
    }
  }

  private buildPayload(): DocumentProcessRequest {
    const strategy = this.settings.chunking_strategy;
    const payload: DocumentProcessRequest = { chunking_strategy: strategy };

    if (strategy === 'fixed_size') {
      payload.chunk_size = this.settings.chunk_size;
      payload.chunk_overlap = this.settings.chunk_overlap;
    } else if (strategy === 'semantic') {
      payload.chunk_size = this.settings.chunk_size;
      payload.chunk_overlap = this.settings.chunk_overlap;
      payload.max_buffer_size = this.settings.max_buffer_size;
      payload.breakpoint_threshold = this.settings.breakpoint_threshold;
    } else if (strategy === 'hierarchical') {
      payload.parent_chunk_size = this.settings.parent_chunk_size;
      payload.child_chunk_size = this.settings.child_chunk_size;
      payload.child_chunk_overlap = this.settings.child_chunk_overlap;
    }

    return payload;
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
