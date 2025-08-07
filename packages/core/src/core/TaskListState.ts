/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

class TaskListState extends EventEmitter {
  private tasks: Task[] = [];
  private currentTaskId: string | null = null;

  constructor() {
    super();
  }

  setTasks(newTasks: Array<{ description: string }>): void {
    this.tasks = newTasks.map((task, index) => ({
      id: `${index}`,
      description: task.description,
      status: 'pending',
    }));
    this.currentTaskId = null;
    this.emit('tasks_updated', this.tasks);
  }

  setCurrentTask(taskId: string): void {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) {
      return;
    }

    const newTasks = [...this.tasks];

    // Mark previous in_progress task as pending or completed
    if (this.currentTaskId) {
      const prevTaskIndex = newTasks.findIndex(
        (task) => task.id === this.currentTaskId,
      );
      if (
        prevTaskIndex !== -1 &&
        newTasks[prevTaskIndex].status === 'in_progress'
      ) {
        newTasks[prevTaskIndex] = {
          ...newTasks[prevTaskIndex],
          status: 'pending',
        };
      }
    }

    newTasks[taskIndex] = { ...newTasks[taskIndex], status: 'in_progress' };

    this.tasks = newTasks;
    this.currentTaskId = taskId;
    this.emit('tasks_updated', this.tasks);
  }

  markTaskAsCompleted(taskId: string): void {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) {
      return;
    }
    const newTasks = [...this.tasks];
    newTasks[taskIndex] = { ...newTasks[taskIndex], status: 'completed' };
    this.tasks = newTasks;
    if (this.currentTaskId === taskId) {
      this.currentTaskId = null;
    }
    this.emit('tasks_updated', this.tasks);
  }

  getTasks(): Task[] {
    return [...this.tasks];
  }
}

export const taskListState = new TaskListState();
