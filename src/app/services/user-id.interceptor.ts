import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserService } from './user.service';

export const userIdInterceptor: HttpInterceptorFn = (req, next) => {
  const userService = inject(UserService);
  const userId = userService.getCurrentUserId();
  
  console.log('[UserIdInterceptor] Adding X-User-ID header:', userId);
  
  // Clone request and add the X-User-ID header
  const newReq = req.clone({
    setHeaders: {
      'X-User-ID': userId
    }
  });
  
  return next(newReq);
};
