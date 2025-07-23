/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompletion } from './useCompletion.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  CommandContext,
  CommandKind,
  SlashCommand,
} from '../commands/types.js';
import { Config, FileDiscoveryService } from '@google/gemini-cli-core';



describe('useCompletion git-aware filtering integration', () => {
  let testRootDir: string;
  let mockConfig: Config;

  async function createEmptyDir(...pathSegments: string[]) {
    const fullPath = path.join(testRootDir, ...pathSegments);
    await fs.mkdir(fullPath, { recursive: true });
    return fullPath;
  }

  async function createTestFile(content: string, ...pathSegments: string[]) {
    const fullPath = path.join(testRootDir, ...pathSegments);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return fullPath;
  }

  const slashCommands = [
    {
      name: 'help',
      description: 'Show help',
      kind: CommandKind.BUILT_IN,
      action: vi.fn(),
    },
    {
      name: 'clear',
      description: 'Clear screen',
      kind: CommandKind.BUILT_IN,
      action: vi.fn(),
    },
  ];

  // A minimal mock is sufficient for these tests.
  const mockCommandContext = {} as CommandContext;

  const mockSlashCommands: SlashCommand[] = [
    {
      name: 'help',
      altNames: ['?'],
      description: 'Show help',
      action: vi.fn(),
      kind: CommandKind.BUILT_IN,
    },
    {
      name: 'stats',
      altNames: ['usage'],
      description: 'check session stats. Usage: /stats [model|tools]',
      action: vi.fn(),
      kind: CommandKind.BUILT_IN,
    },
    {
      name: 'clear',
      description: 'Clear the screen',
      action: vi.fn(),
      kind: CommandKind.BUILT_IN,
    },
    {
      name: 'memory',
      description: 'Manage memory',
      kind: CommandKind.BUILT_IN,
      // This command is a parent, no action.
      subCommands: [
        {
          name: 'show',
          description: 'Show memory',
          kind: CommandKind.BUILT_IN,
          action: vi.fn(),
        },
        {
          name: 'add',
          description: 'Add to memory',
          kind: CommandKind.BUILT_IN,
          action: vi.fn(),
        },
      ],
    },
    {
      name: 'chat',
      description: 'Manage chat history',
      kind: CommandKind.BUILT_IN,
      subCommands: [
        {
          name: 'save',
          description: 'Save chat',
          kind: CommandKind.BUILT_IN,
          action: vi.fn(),
        },
        {
          name: 'resume',
          description: 'Resume a saved chat',
          kind: CommandKind.BUILT_IN,
          action: vi.fn(),
          // This command provides its own argument completions
          completion: vi
            .fn()
            .mockResolvedValue([
              'my-chat-tag-1',
              'my-chat-tag-2',
              'my-channel',
            ]),
        },
      ],
    },
  ];

  beforeEach(async () => {
    testRootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'completion-integration-test-'),
    );
    mockConfig = {
      getTargetDir: () => testRootDir,
      getProjectRoot: () => testRootDir,
      getFileFilteringOptions: vi.fn(() => ({
        respectGitIgnore: true,
        respectGeminiIgnore: true,
      })),
      getEnableRecursiveFileSearch: vi.fn(() => true),
      getFileService: vi.fn(() => new FileDiscoveryService(testRootDir)),
    } as any as Config;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(testRootDir, { recursive: true, force: true });
  });

  it('should filter git-ignored entries from @ completions', async () => {
    await createEmptyDir('.git');
    await createTestFile('dist', '.gitignore');
    await createEmptyDir('data');

    const { result } = renderHook(() =>
      useCompletion(
        '@d',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfig,
      ),
    );

    // Wait for async operations to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150)); // Account for debounce
    });

    expect(result.current.suggestions).toEqual(
      expect.arrayContaining([{ label: 'data/', value: 'data/' }]),
    );
    expect(result.current.showSuggestions).toBe(true);
  });

  it('should filter git-ignored directories from @ completions', async () => {
    await createEmptyDir('.git');
    await createTestFile(
      'node_modules\ndist\n.env',
      '.gitignore',
    );
    // gitignored entries
    await createEmptyDir('node_modules');
    await createEmptyDir('dist');
    await createTestFile('', '.env');

    // visible
    await createEmptyDir('src');
    await createTestFile('', 'README.md');

    const { result } = renderHook(() =>
      useCompletion(
        '@',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfig,
      ),
    );

    // Wait for async operations to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150)); // Account for debounce
    });

    expect(result.current.suggestions).toEqual(
      [
        { label: 'README.md', value: 'README.md' },
        { label: 'src/', value: 'src/' },
      ],
    );
    expect(result.current.showSuggestions).toBe(true);
  });

  it('should handle recursive search with git-aware filtering', async () => {
    await createEmptyDir('.git');
    await createTestFile(
      'node_modules/\ntemp/',
      '.gitignore',
    );
    await createTestFile('', 'data', 'test.txt');
    await createEmptyDir('dist');
    await createEmptyDir('node_modules');
    await createTestFile('', 'src', 'index.ts');
    await createEmptyDir('src', 'components');
    await createTestFile('', 'temp', 'temp.log');


    const { result } = renderHook(() =>
      useCompletion(
        '@t',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfig,
      ),
    );

    // Wait for async operations to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Should not include anything from node_modules or dist
    const suggestionLabels = result.current.suggestions.map((s) => s.label);
    expect(suggestionLabels).not.toContain('temp/');
    expect(suggestionLabels).not.toContain('node_modules/');
  });

  it('should not perform recursive search when disabled in config', async () => {
    const mockConfigNoRecursive = {
      ...mockConfig,
      getEnableRecursiveFileSearch: vi.fn(() => false),
    } as unknown as Config;

    await createEmptyDir('data');
    await createEmptyDir('dist');

    const { result } = renderHook(() =>
      useCompletion(
        '@d',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfigNoRecursive,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(result.current.suggestions).toEqual([
      { label: 'data/', value: 'data/' },
      { label: 'dist/', value: 'dist/' },
    ]);
  });

  it('should work without config (fallback behavior)', async () => {
    await createEmptyDir('src');
    await createEmptyDir('node_modules');
    await createTestFile('', 'README.md');

    const { result } = renderHook(() =>
      useCompletion(
        '@',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        undefined,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Without config, should include all files
    expect(result.current.suggestions).toHaveLength(3);
    expect(result.current.suggestions).toEqual(
      expect.arrayContaining([
        { label: 'src/', value: 'src/' },
        { label: 'node_modules/', value: 'node_modules/' },
        { label: 'README.md', value: 'README.md' },
      ]),
    );
  });

  it('should handle git discovery service initialization failure gracefully', async () => {
    // Intentionally don't create a .git directory to cause an initialization failure.
    await createEmptyDir('src');
    await createTestFile('', 'README.md');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useCompletion(
        '@',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfig,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Since we use centralized service, initialization errors are handled at config level
    // This test should verify graceful fallback behavior
    expect(result.current.suggestions.length).toBeGreaterThanOrEqual(0);
    // Should still show completions even if git discovery fails
    expect(result.current.suggestions.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('should handle directory-specific completions with git filtering', async () => {
    await createEmptyDir('.git');
    await createTestFile('*.log', '.gitignore');
    await createTestFile('', 'src', 'component.tsx');
    await createTestFile('', 'src', 'temp.log');
    await createTestFile('', 'src', 'index.ts');

    const { result } = renderHook(() =>
      useCompletion(
        '@src/comp',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfig,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Should filter out .log files but include matching .tsx files
    expect(result.current.suggestions).toEqual([
      { label: 'component.tsx', value: 'component.tsx' },
    ]);
  });

  it('should use glob for top-level @ completions when available', async () => {
    await createTestFile('', 'src', 'index.ts');
    await createTestFile('', 'derp', 'script.ts');
    await createTestFile('', 'README.md');

    const { result } = renderHook(() =>
      useCompletion(
        '@s',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfig,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(result.current.suggestions).toEqual([
      { label: 'src/', value: 'src/' },
      { label: path.join('derp','script.ts'), value: path.join('derp','script.ts') },
    ]);
  });

  it('should include dotfiles in glob search when input starts with a dot', async () => {
    await createTestFile('', '.env');
    await createTestFile('', '.gitignore');
    await createTestFile('', 'src', 'index.ts');

    const { result } = renderHook(() =>
      useCompletion(
        '@.',
        testRootDir,
        true,
        slashCommands,
        mockCommandContext,
        mockConfig,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(result.current.suggestions).toEqual([
      { label: '.env', value: '.env' },
      { label: '.gitignore', value: '.gitignore' },
    ]);
  });

  it('should suggest top-level command names based on partial input', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/mem',
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toEqual([
      { label: 'memory', value: 'memory', description: 'Manage memory' },
    ]);
    expect(result.current.showSuggestions).toBe(true);
  });

  it.each([['/?'], ['/usage']])(
    'should not suggest commands when altNames is fully typed',
    async (altName) => {
      const { result } = renderHook(() =>
        useCompletion(
          altName,
          testRootDir,
          true,
          mockSlashCommands,
          mockCommandContext,
        ),
      );

      expect(result.current.suggestions).toHaveLength(0);
    },
  );

  it('should suggest commands based on partial altNames matches', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/usag', // part of the word "usage"
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toEqual([
      { label: 'stats', value: 'stats', description: 'check session stats. Usage: /stats [model|tools]' },
    ]);
  });

  it('should suggest sub-command names for a parent command', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/memory a',
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toEqual([
      { label: 'add', value: 'add', description: 'Add to memory' },
    ]);
  });

  it('should suggest all sub-commands when the query ends with the parent command and a space', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/memory ',
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.suggestions).toEqual(
      expect.arrayContaining([
        { label: 'show', value: 'show', description: 'Show memory' },
        { label: 'add', value: 'add', description: 'Add to memory' },
      ]),
    );
  });

  it('should call the command.completion function for argument suggestions', async () => {
    const availableTags = ['my-chat-tag-1', 'my-chat-tag-2', 'another-channel'];
    const mockCompletionFn = vi
      .fn()
      .mockImplementation(async (context: CommandContext, partialArg: string) =>
        availableTags.filter((tag) => tag.startsWith(partialArg)),
      );

    const mockCommandsWithFiltering = JSON.parse(
      JSON.stringify(mockSlashCommands),
    ) as SlashCommand[];

    const chatCmd = mockCommandsWithFiltering.find(
      (cmd) => cmd.name === 'chat',
    );
    if (!chatCmd || !chatCmd.subCommands) {
      throw new Error(
        "Test setup error: Could not find the 'chat' command with subCommands in the mock data.",
      );
    }

    const resumeCmd = chatCmd.subCommands.find((sc) => sc.name === 'resume');
    if (!resumeCmd) {
      throw new Error(
        "Test setup error: Could not find the 'resume' sub-command in the mock data.",
      );
    }

    resumeCmd.completion = mockCompletionFn;

    const { result } = renderHook(() =>
      useCompletion(
        '/chat resume my-ch',
        testRootDir,
        true,
        mockCommandsWithFiltering,
        mockCommandContext,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(mockCompletionFn).toHaveBeenCalledWith(mockCommandContext, 'my-ch');

    expect(result.current.suggestions).toEqual([
      { label: 'my-chat-tag-1', value: 'my-chat-tag-1' },
      { label: 'my-chat-tag-2', value: 'my-chat-tag-2' },
    ]);
  });

  it('should not provide suggestions for a fully typed command that has no sub-commands or argument completion', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/clear ',
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.showSuggestions).toBe(false);
  });

  it('should not provide suggestions for an unknown command', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/unknown-command',
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.showSuggestions).toBe(false);
  });

  it('should suggest sub-commands for a fully typed parent command without a trailing space', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/memory', // Note: no trailing space
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    // Assert that suggestions for sub-commands are shown immediately
    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.suggestions).toEqual(
      expect.arrayContaining([
        { label: 'show', value: 'show', description: 'Show memory' },
        { label: 'add', value: 'add', description: 'Add to memory' },
      ]),
    );
    expect(result.current.showSuggestions).toBe(true);
  });

  it('should NOT provide suggestions for a perfectly typed command that is a leaf node', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/clear', // No trailing space
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.showSuggestions).toBe(false);
  });

  it('should call command.completion with an empty string when args start with a space', async () => {
    const mockCompletionFn = vi
      .fn()
      .mockResolvedValue(['my-chat-tag-1', 'my-chat-tag-2', 'my-channel']);

    const isolatedMockCommands = JSON.parse(
      JSON.stringify(mockSlashCommands),
    ) as SlashCommand[];

    const resumeCommand = isolatedMockCommands
      .find((cmd) => cmd.name === 'chat')
      ?.subCommands?.find((cmd) => cmd.name === 'resume');

    if (!resumeCommand) {
      throw new Error(
        'Test setup failed: could not find resume command in mock',
      );
    }
    resumeCommand.completion = mockCompletionFn;

    const { result } = renderHook(() =>
      useCompletion(
        '/chat resume ', // Trailing space, no partial argument
        testRootDir,
        true,
        isolatedMockCommands,
        mockCommandContext,
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(mockCompletionFn).toHaveBeenCalledWith(mockCommandContext, '');
    expect(result.current.suggestions).toHaveLength(3);
    expect(result.current.showSuggestions).toBe(true);
  });

  it('should suggest all top-level commands for the root slash', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/',
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions.length).toBe(mockSlashCommands.length);
    expect(result.current.suggestions.map((s) => s.label)).toEqual(
      expect.arrayContaining(['help', 'clear', 'memory', 'chat', 'stats']),
    );
  });

  it('should provide no suggestions for an invalid sub-command', async () => {
    const { result } = renderHook(() =>
      useCompletion(
        '/memory dothisnow',
        testRootDir,
        true,
        mockSlashCommands,
        mockCommandContext,
      ),
    );

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.showSuggestions).toBe(false);
  });
});