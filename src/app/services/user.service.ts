import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly USER_ID_STORAGE_KEY = 'onerag_user_id';
  private userIdSubject: BehaviorSubject<string>;
  public userId$: Observable<string>;

  constructor() {
    const storedUserId = this.loadUserId();
    this.userIdSubject = new BehaviorSubject<string>(storedUserId);
    this.userId$ = this.userIdSubject.asObservable();
  }

  /**
   * Load user ID from localStorage or generate a new one
   */
  private loadUserId(): string {
    const stored = localStorage.getItem(this.USER_ID_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    // Generate a new user ID
    const newUserId = this.generateUserId();
    localStorage.setItem(this.USER_ID_STORAGE_KEY, newUserId);
    return newUserId;
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string {
    return this.userIdSubject.value;
  }

  /**
   * Set user ID (for login scenarios)
   */
  setUserId(userId: string): void {
    localStorage.setItem(this.USER_ID_STORAGE_KEY, userId);
    this.userIdSubject.next(userId);
  }

  /**
   * Clear user ID (for logout)
   */
  clearUserId(): void {
    localStorage.removeItem(this.USER_ID_STORAGE_KEY);
    const newUserId = this.generateUserId();
    localStorage.setItem(this.USER_ID_STORAGE_KEY, newUserId);
    this.userIdSubject.next(newUserId);
  }
}
