/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from 'ink-testing-library';
import { TaskList } from './TaskList';
import { taskListState } from '@google/gemini-cli-core';
import { vi } from 'vitest';

describe('TaskList', () => {
  beforeEach(() => {
    vi.spyOn(taskListState, 'getTasks').mockReturnValue([]);
    vi.spyOn(taskListState, 'on');
    vi.spyOn(taskListState, 'off');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render if no tasks are present', () => {
    const { lastFrame } = render(<TaskList />);
    expect(lastFrame()).toBe('');
  });

  it('should render pending tasks correctly', () => {
    vi.spyOn(taskListState, 'getTasks').mockReturnValue([
      { id: '1', description: 'Task 1', status: 'pending' },
      { id: '2', description: 'Task 2', status: 'pending' },
    ]);
    const { lastFrame } = render(<TaskList />);
    expect(lastFrame()).toMatchSnapshot();
  });

  it('should render in-progress tasks correctly', () => {
    vi.spyOn(taskListState, 'getTasks').mockReturnValue([
      { id: '1', description: 'Task 1', status: 'in_progress' },
    ]);
    const { lastFrame } = render(<TaskList />);
    expect(lastFrame()).toMatchSnapshot();
  });

  it('should render completed tasks correctly', () => {
    vi.spyOn(taskListState, 'getTasks').mockReturnValue([
      { id: '1', description: 'Task 1', status: 'completed' },
    ]);
    const { lastFrame } = render(<TaskList />);
    expect(lastFrame()).toMatchSnapshot();
  });

  it('should update when tasks_updated event is emitted', () => {
    const { lastFrame } = render(<TaskList />);
    expect(lastFrame()).toBe('');

    taskListState.emit('tasks_updated', [
      { id: '1', description: 'New Task', status: 'pending' },
    ]);

    expect(lastFrame()).toMatchSnapshot();
  });

  it('should clean up event listener on unmount', () => {
    const { unmount } = render(<TaskList />);
    expect(taskListState.on).toHaveBeenCalledWith(
      'tasks_updated',
      expect.any(Function),
    );
    unmount();
    expect(taskListState.off).toHaveBeenCalledWith(
      'tasks_updated',
      expect.any(Function),
    );
  });
});
