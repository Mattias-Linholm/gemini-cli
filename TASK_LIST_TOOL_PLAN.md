# Plan: Implement a Task List Tool for LLM Self-Organization

The tool will allow the LLM to define a list of tasks, display it to the user, and update the status of each task (`pending`, `in_progress`, `completed`) as it works through a problem.

---

### **Proposed Plan**

#### **1. Core Tool Logic & State Management (`@gemini/core`)**

The foundation of the tool will live in the `@gemini/core` package, which is responsible for tool definitions and execution.

- **State Management:** We'''ll create a new, simple, in-memory state manager for the tasks. This ensures the task list is tied to the current session.
  - **File:** `packages/core/src/core/TaskListState.ts`
  - **Contents:** This module will export a singleton-like object or class that holds the list of tasks and the ID of the currently active task. It will also contain an event emitter (e.g., using Node.js'''s `EventEmitter`) to notify listeners (the UI) of any changes.
  - **Task Interface:** Define a `Task` interface:
    ```typescript
    export interface Task {
      id: string;
      description: string;
      status: '''pending''' | '''in_progress''' | '''completed''';
    }
    ```

- **Tool Definition:** We will create the actual tool that the LLM will call.
  - **File:** `packages/core/src/tools/task-list.ts`
  - **Functions:** The tool will expose the following functions to the LLM:
    - `createOrUpdateTasks(tasks: { description: string }[])`: Replaces the current task list with a new one. The initial status for all tasks will be `pending`. This is what the LLM calls first to outline its plan.
    - `setCurrentTask(taskId: string)`: Sets the status of the specified task to `in_progress` and marks any previous `in_progress` task as `pending` or `completed` as appropriate.
    - `markTaskAsCompleted(taskId: string)`: Sets the status of the specified task to `completed`.
    - `getTasks()`: Returns the current list of all tasks and their statuses.

#### **2. UI Component (`@gemini/cli`)**

To make the task list useful, the user needs to see it. We'''ll create a dedicated UI component using Ink.

- **Component File:** `packages/cli/src/ui/components/TaskList.tsx`
- **Functionality:**
  - This React component will subscribe to the `TaskListState` from `@gemini/core`.
  - It will render the list of tasks, updating in real-time as the LLM calls the tool functions.
  - It will use visual cues for task status:
    - `[ ] Pending Task Description`
    - `[>] In Progress Task Description` (in a different color, e.g., yellow)
    - `[✔] Completed Task Description` (in green and/or strikethrough)
  - The component will only render if a task list has been created for the current session.

#### **3. Integration**

Next, we'''ll integrate the new logic and UI into the existing application.

- **Tool Registration:**
  - In `packages/core/src/tools/index.ts` (or the relevant aggregator file), we will import and add the new `TaskListTool` to the list of built-in tools available to the LLM.
- **UI Integration:**
  - In the main UI file, `packages/cli/src/gemini.tsx`, we will import and render the new `<TaskList />` component. It should be placed in a persistent location within the UI, perhaps just above the user input prompt or below the main response area, so it'''s always visible during a session.
- **State-UI Bridge:**
  - We will modify `packages/cli/src/gemini.tsx` to listen for events from the `TaskListState`'''s event emitter. When an event is received (e.g., `tasks_updated`), it will trigger a re-render of the main component, which will pass the new state down to the `<TaskList />` component. A React Context is a good pattern for this.

#### **4. Testing**

Finally, we'''ll add tests to ensure the new feature is robust.

- **Core Logic Tests:**
  - **File:** `packages/core/src/tools/task-list.test.ts`
  - **Purpose:** Write Vitest unit tests for the `TaskListTool` functions. We'''ll mock the state manager and verify that calling the tool functions results in the correct state changes.
- **UI Component Tests:**
  - **File:** `packages/cli/src/ui/components/TaskList.test.tsx`
  - **Purpose:** Use `ink-testing-library` to render the `<TaskList />` component with various states (e.g., no tasks, a few pending tasks, one in progress) and assert that the output (`lastFrame()`) is rendered correctly with the expected symbols and colors.
