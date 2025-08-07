/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { taskListState } from '../core/TaskListState.js';

describe('TaskListState', () => {
  beforeEach(() => {
    // Reset the state before each test
    taskListState.setTasks([]);
  });

  it('should create tasks with pending status', () => {
    const tasksToCreate = [
      { description: 'Task 1' },
      { description: 'Task 2' },
    ];
    taskListState.setTasks(tasksToCreate);

    const tasks = taskListState.getTasks();
    expect(tasks.length).toBe(2);
    expect(tasks[0]).toEqual({
      id: 'task-0',
      description: 'Task 1',
      status: 'pending',
    });
    expect(tasks[1]).toEqual({
      id: 'task-1',
      description: 'Task 2',
      status: 'pending',
    });
  });

  it('should set a task as in_progress', () => {
    taskListState.setTasks([{ description: 'Task 1' }]);
    taskListState.setCurrentTask('task-0');

    const tasks = taskListState.getTasks();
    expect(tasks[0].status).toBe('in_progress');
  });

  it('should mark a task as completed', () => {
    taskListState.setTasks([{ description: 'Task 1' }]);
    taskListState.markTaskAsCompleted('task-0');

    const tasks = taskListState.getTasks();
    expect(tasks[0].status).toBe('completed');
  });

  it('should emit tasks_updated event when tasks are set', () => {
    const listener = vi.fn();
    taskListState.on('tasks_updated', listener);

    taskListState.setTasks([{ description: 'New Task' }]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(taskListState.getTasks());
  });

  it('should emit tasks_updated event when current task is set', () => {
    taskListState.setTasks([{ description: 'Task 1' }]);
    const listener = vi.fn();
    taskListState.on('tasks_updated', listener);

    taskListState.setCurrentTask('task-0');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(taskListState.getTasks());
  });

  it('should emit tasks_updated event when task is completed', () => {
    taskListState.setTasks([{ description: 'Task 1' }]);
    const listener = vi.fn();
    taskListState.on('tasks_updated', listener);

    taskListState.markTaskAsCompleted('task-0');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(taskListState.getTasks());
  });

  it('should return a copy of tasks array', () => {
    taskListState.setTasks([{ description: 'Task 1' }]);
    const tasks1 = taskListState.getTasks();
    const tasks2 = taskListState.getTasks();

    expect(tasks1).toEqual(tasks2);
    expect(tasks1).not.toBe(tasks2);
  });

  it('should not modify tasks if invalid taskId is provided for setCurrentTask', () => {
    taskListState.setTasks([{ description: 'Task 1' }]);
    taskListState.setCurrentTask('non-existent-task');
    const tasks = taskListState.getTasks();
    expect(tasks[0].status).toBe('pending');
  });

  it('should not modify tasks if invalid taskId is provided for markTaskAsCompleted', () => {
    taskListState.setTasks([{ description: 'Task 1' }]);
    taskListState.markTaskAsCompleted('non-existent-task');
    const tasks = taskListState.getTasks();
    expect(tasks[0].status).toBe('pending');
  });

  it('should mark previous in_progress task as pending when new task is set to in_progress', () => {
    taskListState.setTasks([
      { description: 'Task 1' },
      { description: 'Task 2' },
    ]);
    taskListState.setCurrentTask('task-0');
    taskListState.setCurrentTask('task-1');

    const tasks = taskListState.getTasks();
    expect(tasks[0].status).toBe('pending');
    expect(tasks[1].status).toBe('in_progress');
  });
});
