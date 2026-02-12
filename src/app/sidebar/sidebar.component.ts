import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadedDocument, KnowledgeBaseInfo, TaskStatus, QueryHistoryItem, MarkdownFileInfo } from '../models';
import { SettingsService } from '../services/settings.service';
import { ChatService } from '../services/chat.service';
import { TaskService } from '../services/task.service';
import { FileService } from '../services/file.service';
import { UserService } from '../services/user.service';
import { KnowledgeBaseService } from '../services/knowledge-base.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnChanges {
  @Input() documents: UploadedDocument[] = [];
  @Input() knowledgeBases: KnowledgeBaseInfo[] = [];
  @Input() activeKnowledgeBaseId: string | null = null;
  @Input() activeDocId: string | null = null;
  @Input() isOpen: boolean = true;

  @Output() selectDoc = new EventEmitter<string>();
  @Output() deleteDoc = new EventEmitter<string>();
  @Output() fileDropped = new EventEmitter<File>();
  @Output() selectKnowledgeBase = new EventEmitter<string>();
  @Output() createKnowledgeBase = new EventEmitter<{ name: string; description?: string }>();
  @Output() deleteKnowledgeBase = new EventEmitter<string>();

  dragActive: boolean = false;
  activeTab: 'documents' | 'settings' = 'documents';
  newKbName: string = '';
  newKbDescription: string = '';

  // Settings properties
  localSettings: any = { topK: 5, chatModel: '', embeddingModel: '' };
  modelInfo: any = null;
  temperature: number = 0.7;
  searchType: 'dense' | 'sparse' | 'hybrid' = 'hybrid';
  modelUpdateStatus: 'success' | 'error' | null = null;
  modelUpdateMessage: string = '';
  resetKbStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  resetKbMessage: string = '';

  kbStats: any | null = null;
  kbStatsLoading: boolean = false;
  tasks: TaskStatus[] = [];
  tasksLoading: boolean = false;
  tasksLimit: number = 20;
  tasksStatusFilter: string = '';
  queryHistory: QueryHistoryItem[] = [];
  queryHistoryLoading: boolean = false;
  queryLimit: number = 10;
  markdownFiles: MarkdownFileInfo[] = [];
  markdownLoading: boolean = false;

  constructor(
    public settingsService: SettingsService,
    private chatService: ChatService,
    private taskService: TaskService,
    private fileService: FileService,
    private userService: UserService,
    private kbService: KnowledgeBaseService
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeKnowledgeBaseId'] && this.activeTab === 'settings') {
      this.loadKbStats();
    }
  }

  loadSettings() {
    this.localSettings = { ...this.settingsService.getCurrentSettings() };
    this.searchType = this.settingsService.getSearchType();
    this.loadModelInfo();
  }

  loadModelInfo() {
    this.settingsService.loadModelInfo().subscribe({
      next: (info) => {
        this.modelInfo = info;
        this.localSettings.chatModel = info.current_model_id;
        this.localSettings.embeddingModel = info.embedding_model_id;
        this.temperature = info.temperature;
      },
      error: (err) => console.error('Error loading model info:', err)
    });
  }

  // Document handlers
  onSelect(id: string) {
    this.selectDoc.emit(id);
  }

  onDelete(event: Event, id: string) {
    event.stopPropagation();
    this.deleteDoc.emit(id);
  }

  onDragOver(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.dragActive = true;
  }

  onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.dragActive = false;
  }

  onDrop(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.dragActive = false;
    if (evt.dataTransfer?.files.length) {
      this.fileDropped.emit(evt.dataTransfer.files[0]);
    }
  }

  // Settings handlers
  setActiveTab(tab: 'documents' | 'settings') {
    this.activeTab = tab;
    if (tab === 'settings') {
      this.loadKbStats();
      this.loadTasks();
      this.loadQueryHistory();
      this.loadMarkdownFiles();
    }
  }

  loadKbStats() {
    if (!this.activeKnowledgeBaseId) {
      this.kbStats = null;
      return;
    }
    this.kbStatsLoading = true;
    this.kbService.getKnowledgeBaseStats(this.activeKnowledgeBaseId).subscribe({
      next: (stats) => {
        this.kbStats = stats;
        this.kbStatsLoading = false;
      },
      error: () => {
        this.kbStats = null;
        this.kbStatsLoading = false;
      }
    });
  }

  loadTasks() {
    this.tasksLoading = true;
    const status = this.tasksStatusFilter || undefined;
    this.taskService.getUserTasks(this.tasksLimit, status).subscribe({
      next: (tasks) => {
        this.tasks = tasks || [];
        this.tasksLoading = false;
      },
      error: () => {
        this.tasks = [];
        this.tasksLoading = false;
      }
    });
  }

  loadQueryHistory() {
    this.queryHistoryLoading = true;
    this.chatService.getMyQueries(this.queryLimit).subscribe({
      next: (items) => {
        this.queryHistory = items || [];
        this.queryHistoryLoading = false;
      },
      error: () => {
        this.queryHistory = [];
        this.queryHistoryLoading = false;
      }
    });
  }

  loadMarkdownFiles() {
    this.markdownLoading = true;
    const userId = this.userService.getCurrentUserId();
    this.fileService.listMarkdownFiles(userId).subscribe({
      next: (files) => {
        this.markdownFiles = files || [];
        this.markdownLoading = false;
      },
      error: () => {
        this.markdownFiles = [];
        this.markdownLoading = false;
      }
    });
  }

  markdownDownloadUrl(fileId: string): string {
    const userId = this.userService.getCurrentUserId();
    return this.fileService.getMarkdownDownloadUrl(userId, fileId);
  }

  deleteMarkdown(fileId: string): void {
    const userId = this.userService.getCurrentUserId();
    this.fileService.deleteMarkdownFile(userId, fileId).subscribe({
      next: () => {
        this.markdownFiles = this.markdownFiles.filter(f => f.file_id !== fileId);
      },
      error: () => {}
    });
  }

  onSelectKnowledgeBase(kbId: string | null) {
    if (!kbId) return;
    this.selectKnowledgeBase.emit(kbId);
  }

  onCreateKnowledgeBase() {
    const name = this.newKbName.trim();
    if (!name) {
      this.resetKbStatus = 'error';
      this.resetKbMessage = 'Knowledge base name is required';
      setTimeout(() => {
        this.resetKbStatus = 'idle';
        this.resetKbMessage = '';
      }, 3000);
      return;
    }
    this.createKnowledgeBase.emit({ name, description: this.newKbDescription.trim() || undefined });
    this.newKbName = '';
    this.newKbDescription = '';
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
        this.loadModelInfo();
        setTimeout(() => {
          this.modelUpdateStatus = null;
          this.modelUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        this.modelUpdateStatus = 'error';
        this.modelUpdateMessage = `Error: ${err.error?.detail || err.message}`;
      }
    });
  }

  onEmbeddingModelChange() {
    this.settingsService.updateEmbeddingModel(this.localSettings.embeddingModel);
  }

  onKeywordWeightChange() {
    // This method is no longer used - replaced by onSearchTypeChange
  }

  onSemanticWeightChange() {
    // This method is no longer used - replaced by onSearchTypeChange
  }

  onSearchTypeChange() {
    this.settingsService.setSearchType(this.searchType);
  }

  onDeleteKnowledgeBase() {
    if (!this.activeKnowledgeBaseId) {
      this.resetKbStatus = 'error';
      this.resetKbMessage = 'Select a knowledge base to delete';
      setTimeout(() => {
        this.resetKbStatus = 'idle';
        this.resetKbMessage = '';
      }, 3000);
      return;
    }

    if (!confirm('⚠️ WARNING: This will permanently delete this knowledge base and ALL its documents. This action CANNOT be undone!\n\nAre you absolutely sure?')) {
      return;
    }

    if (!confirm('Final confirmation: delete this knowledge base?')) {
      return;
    }

    this.resetKbStatus = 'loading';
    this.resetKbMessage = 'Deleting knowledge base...';

    this.deleteKnowledgeBase.emit(this.activeKnowledgeBaseId);
    this.chatService.resetConversation();
    setTimeout(() => {
      this.resetKbStatus = 'idle';
      this.resetKbMessage = '';
    }, 4000);
  }

  onReset() {
    if (confirm('Reset all settings to defaults? This will not change the backend model configuration.')) {
      this.settingsService.resetSettings();
      this.loadSettings();
    }
  }

  getModelName(modelId: string): string {
    const model = this.settingsService.availableChatModels.find((m: any) => m.id === modelId);
    return model ? model.name : modelId;
  }

  getEmbeddingModelName(modelId: string): string {
    const model = this.settingsService.availableEmbeddingModels.find((m: any) => m.id === modelId);
    return model ? model.name : modelId;
  }
}
