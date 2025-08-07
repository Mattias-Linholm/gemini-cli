/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult, Icon } from './tools.js';
import { taskListState } from '../core/TaskListState.js';
import { Type } from '@google/genai';

export class TaskListTool extends BaseTool<
  {
    name:
    | 'createOrUpdateTasks'
    | 'setCurrentTask'
    | 'markTaskAsCompleted'
    | 'getTasks';
    tasks?: Array<{ description: string }>;
    taskId?: string;
  },
  ToolResult
> {
  constructor() {
    super(
      'task_list',
      'Task List',
      'This is a core tool for the LLM to manage and track progress on complex tasks. It is highly recommended to use this tool to break down larger problems into manageable steps, keep the task list updated, and mark tasks as complete as progress is made.',
      Icon.LightBulb,
      {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'The name of the function to call.',
            enum: [
              'createOrUpdateTasks',
              'setCurrentTask',
              'markTaskAsCompleted',
              'getTasks',
            ],
          },
          tasks: {
            type: Type.ARRAY,
            description:
              'An array of task objects, each with a description. Only for createOrUpdateTasks.',
            items: {
              type: Type.OBJECT,
              properties: {
                description: {
                  type: Type.STRING,
                  description: 'The description of the task.',
                },
              },
              required: ['description'],
            },
          },
          taskId: {
            type: Type.STRING,
            description:
              'The ID of the task to set as current. Task IDs are 0-indexed. Only for setCurrentTask and markTaskAsCompleted.',
          },
        },
        required: ['name'],
      },
    );
  }

  async execute(
    params: {
      name:
      | 'createOrUpdateTasks'
      | 'setCurrentTask'
      | 'markTaskAsCompleted'
      | 'getTasks';
      tasks?: Array<{ description: string }>;
      taskId?: string;
    },
    _abortSignal: AbortSignal,
  ): Promise<ToolResult> {
    switch (params.name) {
      case 'createOrUpdateTasks':
        if (!params.tasks) {
          return {
            llmContent:
              'Error: tasks parameter is required for createOrUpdateTasks.',
            returnDisplay:
              'Error: tasks parameter is required for createOrUpdateTasks.',
          };
        }
        taskListState.setTasks(params.tasks);
        return {
          llmContent: 'Task list created/updated successfully.',
          returnDisplay: 'Task list created/updated successfully.',
        };
      case 'setCurrentTask':
        if (!params.taskId) {
          return {
            llmContent:
              'Error: taskId parameter is required for setCurrentTask.',
            returnDisplay:
              'Error: taskId parameter is required for setCurrentTask.',
          };
        }
        taskListState.setCurrentTask(params.taskId);
        return {
          llmContent: `Task ${params.taskId} set as current.`,
          returnDisplay: `Task ${params.taskId} set as current.`,
        };
      case 'markTaskAsCompleted':
        if (!params.taskId) {
          return {
            llmContent:
              'Error: taskId parameter is required for markTaskAsCompleted.',
            returnDisplay:
              'Error: taskId parameter is required for markTaskAsCompleted.',
          };
        }
        taskListState.markTaskAsCompleted(params.taskId);
        return {
          llmContent: `Task ${params.taskId} marked as completed.`,
          returnDisplay: `Task ${params.taskId} marked as completed.`,
        };
      case 'getTasks': {
        const tasks = taskListState.getTasks();
        return {
          llmContent: JSON.stringify({ tasks }),
          returnDisplay: JSON.stringify({ tasks }),
        };
      }
      default:
        return {
          llmContent: `Error: Unknown function name: ${params.name}`,
          returnDisplay: `Error: Unknown function name: ${params.name}`,
        };
    }
  }
}
