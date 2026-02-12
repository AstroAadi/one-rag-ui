import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AppSettings, ModelInfoResponse, ModelUpdateRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly API_URL = environment.apiUrl;
  
  // Default settings
  private defaultSettings: AppSettings = {
    topK: 5,
    chatModel: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  };

  // Available models (can be expanded based on your AWS Bedrock access)
  public readonly availableChatModels = [
    { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet' },
    { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet' },
    { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' },
    { id: 'anthropic.claude-v2:1', name: 'Claude 2.1' },
    { id: 'anthropic.claude-v2', name: 'Claude 2' }
  ];

  public readonly availableEmbeddingModels = [
    { id: 'amazon.titan-embed-text-v1', name: 'Titan Embed Text V1' },
    { id: 'amazon.titan-embed-text-v2:0', name: 'Titan Embed Text V2' },
    { id: 'cohere.embed-english-v3', name: 'Cohere Embed English V3' },
    { id: 'cohere.embed-multilingual-v3', name: 'Cohere Embed Multilingual V3' }
  ];

  // Settings state
  private settingsSubject = new BehaviorSubject<AppSettings>(this.loadSettings());
  public settings$ = this.settingsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load settings from backend on initialization
    this.loadModelInfo().subscribe();
  }

  /**
   * Load settings from localStorage or use defaults
   */
  private loadSettings(): AppSettings {
    const stored = localStorage.getItem('onerag_settings');
    if (stored) {
      try {
        return { ...this.defaultSettings, ...JSON.parse(stored) };
      } catch (e) {
        console.error('Error parsing stored settings:', e);
      }
    }
    return this.defaultSettings;
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: AppSettings): void {
    localStorage.setItem('onerag_settings', JSON.stringify(settings));
    this.settingsSubject.next(settings);
  }

  /**
   * Get current settings
   */
  getCurrentSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  /**
   * Update top_k value
   */
  updateTopK(topK: number): void {
    const settings = { ...this.getCurrentSettings(), topK };
    this.saveSettings(settings);
  }

  /**
   * Update chat model
   */
  updateChatModel(modelId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/settings/model`, { model_id: modelId }).pipe(
      tap(() => {
        const settings = { ...this.getCurrentSettings(), chatModel: modelId };
        this.saveSettings(settings);
      })
    );
  }

  /**
   * Update embedding model (note: this typically requires backend restart)
   */
  updateEmbeddingModel(modelId: string): void {
    const settings = { ...this.getCurrentSettings(), embeddingModel: modelId };
    this.saveSettings(settings);
    // Note: Embedding model change requires backend configuration update
  }

  /**
   * Get current model info from backend
   * Returns model configuration including model ID, temperature, max tokens, and embedding model
   */
  loadModelInfo(): Observable<ModelInfoResponse> {
    return this.http.get<ModelInfoResponse>(`${this.API_URL}/settings/model`).pipe(
      tap(info => {
        // Update local settings with backend info
        const settings = this.getCurrentSettings();
        settings.chatModel = info.current_model_id;
        
        this.saveSettings(settings);
      })
    );
  }

  /**
   * Update model at runtime
   * This only updates for current session. To make permanent, update BEDROCK_MODEL_ID in .env
   */
  updateModel(request: ModelUpdateRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/settings/model`, request).pipe(
      tap(() => {
        const settings = { ...this.getCurrentSettings(), chatModel: request.model_id };
        this.saveSettings(settings);
      })
    );
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): void {
    this.saveSettings(this.defaultSettings);
  }

  /**
   * Set search type (dense, sparse, or hybrid)
   */
  setSearchType(searchType: 'dense' | 'sparse' | 'hybrid'): void {
    // Store search type in localStorage for use during queries
    localStorage.setItem('onerag_search_type', searchType);
  }

  /**
   * Get current search type (defaults to 'hybrid')
   */
  getSearchType(): 'dense' | 'sparse' | 'hybrid' {
    const stored = localStorage.getItem('onerag_search_type');
    if (stored === 'dense' || stored === 'sparse' || stored === 'hybrid') {
      return stored;
    }
    return 'hybrid';
  }
}
