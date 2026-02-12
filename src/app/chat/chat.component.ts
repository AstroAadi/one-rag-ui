import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown'; // <--- Import Module
import { ChatMessage, SourceDocument } from '../models';
import { EditChunkModalComponent } from '../edit-chunk-modal/edit-chunk-modal.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, 
    MarkdownModule, // <--- Add to imports
    EditChunkModalComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnChanges {
  @Input() messages: ChatMessage[] = [];
  @Input() isTyping: boolean = false;
  @Output() clearChat = new EventEmitter<void>();
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  selectedSourceForEdit: SourceDocument | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages'] || changes['isTyping']) {
      // Small delay to allow DOM to render new markdown height
      setTimeout(() => this.scrollToBottom(), 150);
    }
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  onClearChat(): void {
    this.clearChat.emit();
  }

  openEditModal(source: SourceDocument): void {
    this.selectedSourceForEdit = source;
  }

  closeEditModal(): void {
    this.selectedSourceForEdit = null;
  }

  onChunkUpdated(updatedSource: SourceDocument): void {
    // Find and update the source in the messages
    for (const message of this.messages) {
      if (message.sources) {
        const sourceIndex = message.sources.findIndex(
          s => s.chunk_id === updatedSource.chunk_id
        );
        if (sourceIndex !== -1) {
          message.sources[sourceIndex] = updatedSource;
        }
      }
    }
    this.closeEditModal();
  }
}