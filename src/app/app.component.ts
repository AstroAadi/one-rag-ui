import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { timer } from 'rxjs';
import { finalize, switchMap, takeWhile } from 'rxjs/operators';

import { FileService } from './services/file.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { ChunkService } from './services/chunk.service';
import { UploadedDocument, KnowledgeBaseInfo, KnowledgeBaseStatus, DocumentProcessRequest, FinalizeChunksRequest } from './models';
import { ProcessingSettingsModalComponent } from './processing-settings-modal/processing-settings-modal.component';
import { ChunkFinalizeModalComponent } from './chunk-finalize-modal/chunk-finalize-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ProcessingSettingsModalComponent,
    ChunkFinalizeModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  documents: UploadedDocument[] = [];
  knowledgeBases: KnowledgeBaseInfo[] = [];
  activeKnowledgeBase: KnowledgeBaseInfo | null = null;
  activeKnowledgeBaseStatus: KnowledgeBaseStatus | null = null;

  isProcessing: boolean = false;
  processingMessage: string = 'Processing Document...';
  toastMessage: string | null = null;
  isBackendHealthy: boolean = true;
  isKbLoading: boolean = false;
  kbDetailsLoading: boolean = false;
  kbDetailsError: string | null = null;

  showCreateKbForm: boolean = false;
  newKbName: string = '';
  newKbDescription: string = '';

  showProcessingSettingsModal: boolean = false;
  pendingProcessFileId: string | null = null;
  pendingProcessFileName: string = '';

  showFinalizeModal: boolean = false;
  pendingFinalizeFileId: string | null = null;
  pendingFinalizeFileName: string = '';

  constructor(
    private fileService: FileService,
    private kbService: KnowledgeBaseService,
    private chunkService: ChunkService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadKnowledgeBases();
    this.checkBackendHealth();
  }

  checkBackendHealth() {
    this.kbService.healthCheck().subscribe({
      next: () => {
        this.isBackendHealthy = true;
      },
      error: (err) => {
        this.isBackendHealthy = false;
        console.warn('Backend health check failed:', err);
        this.showToast('⚠️ Backend connection issue - some features may not work');
      }
    });
  }

  loadKnowledgeBases() {
    this.isKbLoading = true;
    this.kbService.listKnowledgeBases().subscribe({
      next: (list) => {
        this.knowledgeBases = list.knowledge_bases || [];
        if (this.knowledgeBases.length > 0) {
          const mostRecent = this.knowledgeBases[0];
          this.setActiveKnowledgeBase(mostRecent.knowledge_base_id);
        } else {
          this.activeKnowledgeBase = null;
          this.activeKnowledgeBaseStatus = null;
          this.documents = [];
        }
        this.isKbLoading = false;
      },
      error: (err) => {
        this.isKbLoading = false;
        console.error('Error loading knowledge bases:', err);
      }
    });
  }

  setActiveKnowledgeBase(kbId: string) {
    const kb = this.knowledgeBases.find(k => k.knowledge_base_id === kbId) || null;
    this.activeKnowledgeBase = kb;
    this.activeKnowledgeBaseStatus = null;
    this.kbDetailsLoading = true;
    this.kbDetailsError = null;
    if (!kb) {
      this.documents = [];
      this.kbDetailsLoading = false;
      return;
    }

    this.kbService.getKnowledgeBaseStatus(kbId).subscribe({
      next: (status: KnowledgeBaseStatus) => {
        this.activeKnowledgeBaseStatus = status;
        this.knowledgeBases = this.knowledgeBases.map(k => {
          if (k.knowledge_base_id !== kbId) return k;
          return {
            ...k,
            document_count: status.total_documents,
            total_chunks: status.total_chunks,
            total_size_bytes: status.total_size_bytes
          };
        });
        this.documents = (status.documents || []).map((doc) => {
          const placeholderUrl = this.createDocumentPlaceholder(doc.filename);
          return {
            id: doc.file_id,
            name: doc.filename,
            fileType: 'document',
            uploadTime: new Date(doc.uploaded_at),
            objectUrl: this.sanitizer.bypassSecurityTrustResourceUrl(placeholderUrl),
            content: '',
            status: this.mapBackendDocumentStatus(doc.status, doc.chunks_created),
            chunksCreated: doc.chunks_created,
            fileSizeBytes: doc.file_size_bytes,
            totalPages: doc.total_pages,
            chunkingStrategy: doc.chunking_strategy
          };
        });
        this.kbDetailsLoading = false;
      },
      error: (err) => {
        console.error('Error loading KB status:', err);
        this.kbDetailsLoading = false;
        this.kbDetailsError = err.error?.detail || err.message || 'Failed to load knowledge base details';
      }
    });
  }

  openCreateKbForm() {
    this.showCreateKbForm = true;
  }

  closeCreateKbForm() {
    this.showCreateKbForm = false;
    this.newKbName = '';
    this.newKbDescription = '';
  }

  submitCreateKbForm() {
    this.handleCreateKnowledgeBase({
      name: this.newKbName,
      description: this.newKbDescription
    });
  }

  handleCreateKnowledgeBase(payload: { name: string; description?: string }) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      this.showToast('Knowledge base name is required');
      return;
    }

    this.kbService.createKnowledgeBase({
      knowledge_base_name: trimmed,
      description: payload.description?.trim() || null
    }).subscribe({
      next: (kb) => {
        this.knowledgeBases = [kb, ...this.knowledgeBases];
        this.setActiveKnowledgeBase(kb.knowledge_base_id);
        this.showToast(`Created knowledge base: ${kb.knowledge_base_name}`);
        this.closeCreateKbForm();
      },
      error: (err) => {
        this.showToast('Error creating KB: ' + (err.error?.detail || err.message));
      }
    });
  }

  handleDeleteKnowledgeBase(kbId: string) {
    this.kbService.deleteKnowledgeBase(kbId).subscribe({
      next: () => {
        this.knowledgeBases = this.knowledgeBases.filter(k => k.knowledge_base_id !== kbId);
        if (this.activeKnowledgeBase?.knowledge_base_id === kbId) {
          this.activeKnowledgeBase = null;
          this.activeKnowledgeBaseStatus = null;
          this.documents = [];
        }
        if (this.knowledgeBases.length > 0) {
          this.setActiveKnowledgeBase(this.knowledgeBases[0].knowledge_base_id);
        }
        this.showToast('Knowledge base deleted');
      },
      error: (err) => {
        this.showToast('Error deleting KB: ' + (err.error?.detail || err.message));
      }
    });
  }

  triggerFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bmp,.csv,.doc,.docx,.gif,.jpeg,.jpg,.log,.markdown,.md,.mdown,.mkd,.pdf,.png,.ppt,.pptx,.text,.tif,.tiff,.tsv,.txt,.webp,.xls,.xlsm,.xlsx';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) this.processFile(file);
    };
    input.click();
  }

  processFile(file: File) {
    if (!this.fileService.validateFile(file)) {
      this.showToast('File format not supported. Check supported formats.');
      return;
    }
    if (!this.activeKnowledgeBase) {
      this.showToast('Please select or create a knowledge base before uploading');
      return;
    }

    this.isProcessing = true;
    this.processingMessage = 'Uploading Document...';

    const activeKb = this.activeKnowledgeBase;
    const previewUrlPromise = Promise.resolve(this.createDocumentPlaceholder(file.name));

    previewUrlPromise.then(blobUrl => {
      if (!blobUrl) {
        this.uploadFileWithoutPreview(file);
        return;
      }

      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      this.uploadFileAndPrepareChunking(file, safeUrl, activeKb.knowledge_base_name);
    }).catch(err => {
      console.error('Error preparing preview:', err);
      this.isProcessing = false;
      this.showToast('Error preparing document preview');
    });
  }

  uploadFileWithoutPreview(file: File) {
    if (!this.activeKnowledgeBase) {
      this.showToast('Please select or create a knowledge base before uploading');
      return;
    }

    this.isProcessing = true;
    this.processingMessage = 'Uploading Document...';

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
    this.uploadFileAndPrepareChunking(file, safeUrl, this.activeKnowledgeBase.knowledge_base_name);
  }

  private uploadFileAndPrepareChunking(file: File, safeUrl: SafeResourceUrl, kbName: string) {
    const newDoc: UploadedDocument = {
      id: crypto.randomUUID(),
      name: file.name,
      fileType: this.fileService.getFileCategory(file.name),
      uploadTime: new Date(),
      objectUrl: safeUrl,
      content: '',
      status: 'uploading'
    };

    this.documents = [newDoc, ...this.documents];

    this.fileService.uploadFile(file, kbName).subscribe({
      next: (uploadResponse) => {
        newDoc.id = uploadResponse.file_id;
        newDoc.fileSizeBytes = uploadResponse.file_size_bytes;
        newDoc.status = 'processing';
        this.processingMessage = 'Extracting document...';

        this.waitForExtractionCompletion(uploadResponse.file_id)
          .pipe(finalize(() => { this.isProcessing = false; }))
          .subscribe({
            next: (statusResponse) => {
              if (statusResponse.status === 'completed') {
                newDoc.status = 'uploaded';
                this.pendingProcessFileId = uploadResponse.file_id;
                this.pendingProcessFileName = uploadResponse.filename;
                this.showProcessingSettingsModal = true;
                this.showToast('Extraction complete. Configure chunk settings.');
              } else {
                newDoc.status = 'error';
                this.showToast('Document extraction failed: ' + (statusResponse.message || 'Unknown error'));
              }
            },
            error: (err: any) => {
              console.error('Error checking extraction status:', err);
              newDoc.status = 'error';
              this.showToast('Error checking upload status: ' + (err.error?.detail || err.message));
            }
          });
      },
      error: (err: any) => {
        console.error('Error uploading file:', err);
        newDoc.status = 'error';
        this.isProcessing = false;
        this.showToast('Error: ' + (err.error?.detail || err.message));
      }
    });
  }

  private waitForExtractionCompletion(fileId: string) {
    return timer(0, 2000).pipe(
      switchMap(() => this.fileService.getProcessingStatus(fileId)),
      takeWhile(status => status.status !== 'completed' && status.status !== 'failed', true)
    );
  }

  private mapBackendDocumentStatus(
    backendStatus: 'uploaded' | 'processing' | 'completed' | 'failed',
    chunksCreated: number
  ): UploadedDocument['status'] {
    if (backendStatus === 'failed') {
      return 'error';
    }
    if (backendStatus === 'processing') {
      return 'processing';
    }
    if (backendStatus === 'uploaded') {
      return 'uploaded';
    }
    return chunksCreated > 0 ? 'ready' : 'uploaded';
  }

  closeProcessingSettings() {
    this.showProcessingSettingsModal = false;
    this.pendingProcessFileId = null;
    this.pendingProcessFileName = '';
  }

  openProcessingSettingsForDoc(doc: UploadedDocument) {
    if (doc.status !== 'uploaded') {
      return;
    }
    this.pendingProcessFileId = doc.id;
    this.pendingProcessFileName = doc.name;
    this.showProcessingSettingsModal = true;
  }

  closeFinalizeModal() {
    this.showFinalizeModal = false;
    this.pendingFinalizeFileId = null;
    this.pendingFinalizeFileName = '';
  }

  openFinalizeForDoc(doc: UploadedDocument) {
    if (doc.status !== 'chunked') {
      return;
    }
    this.pendingFinalizeFileId = doc.id;
    this.pendingFinalizeFileName = doc.name;
    this.showFinalizeModal = true;
  }

  handleProcessDocument(settings: DocumentProcessRequest) {
    if (!this.pendingProcessFileId) {
      this.showToast('No uploaded file ready for processing');
      return;
    }

    const fileId = this.pendingProcessFileId;
    const fileName = this.pendingProcessFileName;
    this.showProcessingSettingsModal = false;
    this.pendingProcessFileId = null;
    this.pendingProcessFileName = '';

    const docIndex = this.documents.findIndex(d => d.id === fileId);
    if (docIndex !== -1) {
      this.documents[docIndex] = {
        ...this.documents[docIndex],
        status: 'processing',
        chunkingStrategy: settings.chunking_strategy || this.documents[docIndex].chunkingStrategy || null
      };
    }

    this.isProcessing = true;
    this.processingMessage = 'Creating chunks...';

    this.chunkService.createChunks(fileId, settings)
      .pipe(finalize(() => { this.isProcessing = false; }))
      .subscribe({
        next: (response) => {
          const updatedIndex = this.documents.findIndex(d => d.id === fileId);
          if (updatedIndex !== -1) {
            this.documents[updatedIndex] = {
              ...this.documents[updatedIndex],
              status: 'chunked',
              chunksCreated: typeof response.chunk_count === 'number' ? response.chunk_count : this.documents[updatedIndex].chunksCreated
            };
          }

          this.pendingFinalizeFileId = fileId;
          this.pendingFinalizeFileName = fileName;
          this.showFinalizeModal = true;
          this.showToast('Chunks created. Finalize to save in vector DB.');
        },
        error: (err: any) => {
          console.error('Error creating chunks:', err);
          const failedIndex = this.documents.findIndex(d => d.id === fileId);
          if (failedIndex !== -1) {
            this.documents[failedIndex].status = 'error';
          }
          this.showToast('Error creating chunks: ' + (err.error?.detail || err.message));
        }
      });
  }

  handleFinalizeDocument(request: FinalizeChunksRequest) {
    if (!this.pendingFinalizeFileId) {
      this.showToast('No document ready for finalization');
      return;
    }

    const fileId = this.pendingFinalizeFileId;
    this.showFinalizeModal = false;
    this.pendingFinalizeFileId = null;
    this.pendingFinalizeFileName = '';

    const docIndex = this.documents.findIndex(d => d.id === fileId);
    if (docIndex !== -1) {
      this.documents[docIndex].status = 'processing';
    }

    this.isProcessing = true;
    this.processingMessage = 'Finalizing chunks to vector DB...';

    this.chunkService.finalizeChunks(fileId, request)
      .pipe(finalize(() => { this.isProcessing = false; }))
      .subscribe({
        next: (response) => {
          const updatedIndex = this.documents.findIndex(d => d.id === fileId);
          if (updatedIndex !== -1) {
            this.documents[updatedIndex] = {
              ...this.documents[updatedIndex],
              status: 'ready',
              chunksCreated: typeof response.indexed_chunks === 'number' ? response.indexed_chunks : this.documents[updatedIndex].chunksCreated
            };
          }
          this.showToast('Document indexed successfully and ready for queries.');
          if (this.activeKnowledgeBase) {
            this.setActiveKnowledgeBase(this.activeKnowledgeBase.knowledge_base_id);
          }
        },
        error: (err: any) => {
          console.error('Error finalizing chunks:', err);
          const failedIndex = this.documents.findIndex(d => d.id === fileId);
          if (failedIndex !== -1) {
            this.documents[failedIndex].status = 'chunked';
          }
          this.showToast('Error finalizing chunks: ' + (err.error?.detail || err.message));
        }
      });
  }

  createDocumentPlaceholder(filename: string): string {
    const html = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; 
                  flex-direction: column; background: #f8fafc; color: #64748b; padding: 2rem; text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
        <h2 style="margin: 0 0 0.5rem 0; color: #0f172a;">Document Preview Not Available</h2>
        <p style="margin: 0; font-size: 0.9rem;">
          ${filename} is a document file that requires special processing.<br/>
          The file has been uploaded and is ready for processing.
        </p>
        <p style="margin: 1rem 0 0 0; font-size: 0.85rem; color: #94a3b8;">
          You can ask questions about its content using the chat.
        </p>
      </div>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }

  handleDeleteDoc(id: string) {
    if (!this.activeKnowledgeBase) {
      this.showToast('Please select a knowledge base first');
      return;
    }
    if (!confirm('Delete this document from the knowledge base?')) {
      return;
    }

    this.kbService.deleteDocumentFromKnowledgeBase(this.activeKnowledgeBase.knowledge_base_id, id).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== id);
        this.showToast('Document deleted successfully');
      },
      error: (err) => {
        this.showToast('Error deleting document: ' + (err.error?.detail || err.message));
      }
    });
  }

  clearActiveKnowledgeBase() {
    this.activeKnowledgeBase = null;
    this.activeKnowledgeBaseStatus = null;
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = null, 3000);
  }
}
