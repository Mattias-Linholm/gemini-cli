/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { taskListState, Task } from '@google/gemini-cli-core';

export const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const handleTasksUpdated = (updatedTasks: Task[]) => {
      console.log('TaskList: handleTasksUpdated received', updatedTasks);
      setTasks(updatedTasks);
    };

    taskListState.on('tasks_updated', handleTasksUpdated);

    // Initial load
    setTasks(taskListState.getTasks());

    return () => {
      taskListState.off('tasks_updated', handleTasksUpdated);
    };
  }, []);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Text bold>Tasks:</Text>
      {tasks.map((task) => (
        <Text key={task.id}>
          {task.status === 'completed' ? (
            <Text color="green">[✔] {task.description}</Text>
          ) : task.status === 'in_progress' ? (
            <Text color="yellow">
              {'[>]'} {task.description}
            </Text>
          ) : (
            <Text>[ ] {task.description}</Text>
          )}
        </Text>
      ))}
    </Box>
  );
};
