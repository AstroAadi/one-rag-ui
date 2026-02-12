import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TaskStatus, TaskStatsResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get task status by task ID
   */
  getTaskStatus(taskId: string): Observable<TaskStatus> {
    return this.http.get<TaskStatus>(
      `${this.API_URL}/tasks/${taskId}`
    );
  }

  /**
   * Cancel a task by task ID
   */
  cancelTask(taskId: string): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/tasks/${taskId}`
    );
  }

  /**
   * Get the most recent task status for a specific file
   */
  getFileTaskStatus(fileId: string): Observable<TaskStatus> {
    return this.http.get<TaskStatus>(
      `${this.API_URL}/tasks/file/${fileId}`
    );
  }

  /**
   * Get all tasks for the current user
   * @param limit Maximum number of tasks to return (default: 50, max: 200)
   * @param statusFilter Optional filter by status (pending, running, completed, failed, cancelled)
   */
  getUserTasks(limit: number = 50, statusFilter?: string): Observable<TaskStatus[]> {
    let url = `${this.API_URL}/tasks/user/all?limit=${limit}`;
    if (statusFilter) {
      url += `&status_filter=${statusFilter}`;
    }
    return this.http.get<TaskStatus[]>(url);
  }

  /**
   * Get task statistics for the current user
   */
  getTaskStats(): Observable<TaskStatsResponse> {
    return this.http.get<TaskStatsResponse>(
      `${this.API_URL}/tasks/stats/summary`
    );
  }

  /**
   * Get system-wide task statistics (admin only in production)
   */
  getSystemTaskStats(): Observable<any> {
    return this.http.get(
      `${this.API_URL}/tasks/system/stats`
    );
  }

  /**
   * Poll task status periodically until completion
   * Emits TaskStatus updates every intervalMs until task is completed or failed
   * @param taskId Task ID to poll
   * @param intervalMs Polling interval in milliseconds (default: 1000)
   */
  pollTaskStatus(taskId: string, intervalMs: number = 1000): Observable<TaskStatus> {
    return interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.getTaskStatus(taskId))
    );
  }

  /**
   * Poll file task status periodically until completion
   * @param fileId File ID to poll
   * @param intervalMs Polling interval in milliseconds (default: 1000)
   */
  pollFileTaskStatus(fileId: string, intervalMs: number = 1000): Observable<TaskStatus> {
    return interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.getFileTaskStatus(fileId))
    );
  }
}
