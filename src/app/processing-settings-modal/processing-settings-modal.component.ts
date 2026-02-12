import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentProcessRequest, ChunkingStrategy } from '../models';

@Component({
  selector: 'app-processing-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing-settings-modal.component.html',
  styleUrls: ['./processing-settings-modal.component.css']
})
export class ProcessingSettingsModalComponent implements OnInit {
  @Input() fileName: string = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() processDocument = new EventEmitter<DocumentProcessRequest>();

  isProcessing: boolean = false;

  settings: {
    chunking_strategy: ChunkingStrategy;
    target_chunk_tokens: number;
    chunk_overlap_tokens: number;
  } = {
    chunking_strategy: 'fixed_size',
    target_chunk_tokens: 512,
    chunk_overlap_tokens: 50
  };

  chunkingStrategies = [
    { value: 'default', label: 'Default' },
    { value: 'fixed_size', label: 'Fixed Size' },
    { value: 'hierarchical', label: 'Hierarchical' },
    { value: 'semantic', label: 'Semantic' }
  ];

  ngOnInit(): void {
    // Initialize settings with defaults
  }

  onProcess(): void {
    const payload: DocumentProcessRequest = {
      chunking_strategy: this.settings.chunking_strategy,
      target_chunk_tokens: this.settings.target_chunk_tokens,
      chunk_overlap_tokens: this.settings.chunk_overlap_tokens
    };
    this.processDocument.emit(payload);
  }

  onClose(): void {
    this.closeModal.emit();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  resetToDefaults(): void {
    this.settings = {
      chunking_strategy: 'fixed_size',
      target_chunk_tokens: 512,
      chunk_overlap_tokens: 50
    };
  }

  /**
   * Show/hide overlap_chars field based on chunking strategy
   */
  showOverlapChars(): boolean {
    return true;
  }
}
