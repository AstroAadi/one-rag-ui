import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinalizeChunksRequest } from '../models';

@Component({
  selector: 'app-chunk-finalize-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chunk-finalize-modal.component.html',
  styleUrls: ['./chunk-finalize-modal.component.css']
})
export class ChunkFinalizeModalComponent {
  @Input() fileName: string = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() finalizeDocument = new EventEmitter<FinalizeChunksRequest>();

  batchSize: number = 50;

  onFinalize(): void {
    this.finalizeDocument.emit({ batch_size: this.batchSize });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
