import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SourceDocument } from '../models';
import { ChatService } from '../services/chat.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-edit-chunk-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-chunk-modal.component.html',
  styleUrls: ['./edit-chunk-modal.component.css']
})
export class EditChunkModalComponent implements OnInit {
  @Input() source!: SourceDocument;
  @Output() closeModal = new EventEmitter<void>();
  @Output() chunkUpdated = new EventEmitter<SourceDocument>();

  editText: string = '';
  isSaving: boolean = false;
  saveError: string | null = null;

  constructor(
    private chatService: ChatService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.editText = this.source.full_text || this.source.content;
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onSave(): void {
    if (!this.editText.trim()) {
      this.saveError = 'Chunk text cannot be empty';
      return;
    }

    this.isSaving = true;
    this.saveError = null;

    const userId = this.userService.getCurrentUserId();

    this.chatService.editChunk(
      this.source.chunk_id,
      this.source.file_id,
      this.editText,
      userId
    ).subscribe({
      next: (response) => {
        this.isSaving = false;
        
        // Update the source object with new text
        const updatedSource: SourceDocument = {
          ...this.source,
          full_text: this.editText,
          content: this.editText.substring(0, this.source.content.length)
        };

        this.chunkUpdated.emit(updatedSource);
        this.closeModal.emit();
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = err.error?.detail || err.message || 'Error saving chunk';
      }
    });
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
