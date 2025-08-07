/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskListTool } from './task-list.js';
import { taskListState } from '../core/TaskListState.js';

describe('TaskListTool', () => {
  let tool: TaskListTool;

  beforeEach(() => {
    tool = new TaskListTool();
    vi.spyOn(taskListState, 'setTasks').mockClear();
    vi.spyOn(taskListState, 'setCurrentTask').mockClear();
    vi.spyOn(taskListState, 'markTaskAsCompleted').mockClear();
    vi.spyOn(taskListState, 'getTasks').mockClear();
  });

  it('should call taskListState.setTasks when createOrUpdateTasks is called', async () => {
    const tasks = [{ description: 'Test Task' }];
    await tool.execute(
      { name: 'createOrUpdateTasks', tasks },
      {} as AbortSignal,
    );
    expect(taskListState.setTasks).toHaveBeenCalledWith(tasks);
  });

  it('should call taskListState.setCurrentTask when setCurrentTask is called', async () => {
    const taskId = 'task-0';
    await tool.execute({ name: 'setCurrentTask', taskId }, {} as AbortSignal);
    expect(taskListState.setCurrentTask).toHaveBeenCalledWith(taskId);
  });

  it('should call taskListState.markTaskAsCompleted when markTaskAsCompleted is called', async () => {
    const taskId = 'task-0';
    await tool.execute(
      { name: 'markTaskAsCompleted', taskId },
      {} as AbortSignal,
    );
    expect(taskListState.markTaskAsCompleted).toHaveBeenCalledWith(taskId);
  });

  it('should call taskListState.getTasks when getTasks is called', async () => {
    const mockTasks = [
      { id: 'task-0', description: 'Task 0', status: 'pending' as const },
    ];
    vi.spyOn(taskListState, 'getTasks').mockReturnValue(mockTasks);
    const result = await tool.execute({ name: 'getTasks' }, {} as AbortSignal);
    expect(taskListState.getTasks).toHaveBeenCalled();
    expect(result.llmContent).toEqual(JSON.stringify({ tasks: mockTasks }));
    expect(result.returnDisplay).toEqual(JSON.stringify({ tasks: mockTasks }));
  });
});
