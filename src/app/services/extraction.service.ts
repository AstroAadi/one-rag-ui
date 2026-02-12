import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UploadedDocument } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ExtractionService {

  // Simulate API call to extract text
  extractDocument(file: File): Observable<UploadedDocument> {
    const dummyContent = `This is the simulated extracted content for ${file.name}. 
    In a real ONE-RAG system, this would contain the parsed text from the PDF or DOCX file.
    The system has analyzed the structure and identified key entities suitable for retrieval.`;

    const doc: UploadedDocument = {
      id: crypto.randomUUID(),
      name: file.name,
      fileType: file.type,
      uploadTime: new Date(),
      content: dummyContent,
      
      // We provide a placeholder here to satisfy the interface.
      // The real 'SafeResourceUrl' is created in AppComponent (UI layer) 
      // via DomSanitizer and overwrites this value.
      objectUrl: '' as any 
    };

    // Simulate network latency (1.5s)
    return of(doc).pipe(delay(1500));
  }
}