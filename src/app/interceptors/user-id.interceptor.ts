import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class UserIdInterceptor implements HttpInterceptor {
  private userService = inject(UserService);

  constructor() {
    console.log('[UserIdInterceptor] Initialized');
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get current user ID
    const userId = this.userService.getCurrentUserId();
    console.log('[UserIdInterceptor] Adding X-User-ID header:', userId);

    // Clone request and add X-User-ID header
    const modifiedRequest = request.clone({
      setHeaders: {
        'X-User-ID': userId
      }
    });

    console.log('[UserIdInterceptor] Modified request headers:', modifiedRequest.headers.keys());

    return next.handle(modifiedRequest);
  }
}

