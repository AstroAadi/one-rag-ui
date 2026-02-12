import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../services/settings.service';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { ChatService } from '../services/chat.service';
import { AppSettings, ModelInfoResponse } from '../models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  isEmbedded: boolean = false; // Set to true when used in sidebar

  localSettings: AppSettings = {
    topK: 5,
    chatModel: ''
  };

  modelInfo: ModelInfoResponse | null = null;
  modelUpdateStatus: 'success' | 'error' | null = null;
  modelUpdateMessage: string = '';
  
  // Advanced query settings
  temperature: number = 0.7;
  searchType: 'dense' | 'sparse' | 'hybrid' = 'hybrid';
  
  // Knowledge base reset status
  resetKbStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  resetKbMessage: string = '';

  constructor(
    private settingsService: SettingsService,
    private kbService: KnowledgeBaseService,
    private chatService: ChatService
  ) {}

  get availableChatModels() {
    return this.settingsService.availableChatModels;
  }

  ngOnInit() {
    // Load current settings
    this.localSettings = { ...this.settingsService.getCurrentSettings() };
    
    // Load search type from service
    this.searchType = this.settingsService.getSearchType();
    
    // Load model info from backend
    this.loadModelInfo();
  }

  loadModelInfo() {
    this.settingsService.loadModelInfo().subscribe({
      next: (info) => {
        this.modelInfo = info;
        // Update local settings with backend values
        this.localSettings.chatModel = info.current_model_id;
        this.temperature = info.temperature;
      },
      error: (err) => {
        console.error('Error loading model info:', err);
      }
    });
  }

  onTopKChange() {
    this.settingsService.updateTopK(this.localSettings.topK);
  }

  onChatModelChange() {
    this.modelUpdateStatus = null;
    this.modelUpdateMessage = 'Updating model...';
    
    this.settingsService.updateChatModel(this.localSettings.chatModel).subscribe({
      next: (response) => {
        this.modelUpdateStatus = 'success';
        this.modelUpdateMessage = 'Model updated successfully!';
        this.loadModelInfo(); // Refresh model info
        
        // Clear status after 3 seconds
        setTimeout(() => {
          this.modelUpdateStatus = null;
          this.modelUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        this.modelUpdateStatus = 'error';
        this.modelUpdateMessage = `Error: ${err.error?.detail || err.message}`;
        
        // Revert to previous model on error
        if (this.modelInfo) {
          this.localSettings.chatModel = this.modelInfo.current_model_id;
        }
      }
    });
  }

  onTemperatureChange() {
    // Temperature is just for display in settings, used during queries
  }

  onSearchTypeChange() {
    this.settingsService.setSearchType(this.searchType);
  }

  onDeleteKnowledgeBase() {
    const kbId = prompt('Enter the Knowledge Base ID to delete:');
    if (!kbId) {
      return;
    }

    if (!confirm('⚠️ WARNING: This will permanently delete the knowledge base and ALL its documents. This action CANNOT be undone!\n\nAre you absolutely sure?')) {
      return;
    }

    this.resetKbStatus = 'loading';
    this.resetKbMessage = 'Deleting knowledge base...';

    this.kbService.deleteKnowledgeBase(kbId).subscribe({
      next: () => {
        this.resetKbStatus = 'success';
        this.resetKbMessage = 'Knowledge base deleted successfully!';
        this.chatService.resetConversation();
        setTimeout(() => {
          this.resetKbStatus = 'idle';
          this.resetKbMessage = '';
        }, 4000);
      },
      error: (err) => {
        this.resetKbStatus = 'error';
        this.resetKbMessage = `Error: ${err.error?.detail || err.message}`;
        setTimeout(() => {
          this.resetKbStatus = 'idle';
          this.resetKbMessage = '';
        }, 4000);
      }
    });
  }

  onReset() {
    if (confirm('Reset all settings to defaults? This will not change the backend model configuration.')) {
      this.settingsService.resetSettings();
      this.localSettings = { ...this.settingsService.getCurrentSettings() };
      this.loadModelInfo();
    }
  }

  onClose() {
    this.close.emit();
  }

  onOverlayClick(event: MouseEvent) {
    // Close when clicking the overlay background
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  getModelName(modelId: string): string {
    const model = this.availableChatModels.find(m => m.id === modelId);
    return model ? model.name : modelId;
  }
}
