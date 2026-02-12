import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { userIdInterceptor } from './services/user-id.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([userIdInterceptor])
    ),
    provideMarkdown(),
    provideZoneChangeDetection({ eventCoalescing: true })
  ]
};
