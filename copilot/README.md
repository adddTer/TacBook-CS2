# React Agentic Copilot (v1.0.0)

This directory contains a standalone, project-agnostic Agentic Copilot system designed for React/Vite applications. It provides a full-featured AI assistant with support for conversational memory, tool calling (Agentic Workflow), streaming responses, and reasoning logic displays (<think> blocks).

## Structure
- `/core`: The headless Copilot Engine, maintaining thread states, models, storage, LLM streaming, and token management.
  - `config.ts`: Configuration defaults, local storage wrappers.
  - `engine.ts`: Core `AgenticEngine` class for message generation and tool loop.
  - `openai_adapter.ts`: Compatibility layer for non-Gemini models (OpenAI, DeepSeek).
  - `storage.ts`: IndexedDB storage for threads and snapshots.
  - `types.ts`: Universal interfaces.
- `/ui`: Flexible React UI components.
  - `CopilotUI.tsx`: The main chat window component.
  - `AiConfigModal.tsx`: Settings modal for managing API keys and models.

## Migration Guide

To integrate this Copilot into another React project, follow these steps:

### 1. Copy the Directory
Copy this entire `copilot/` directory into the root or `src/` directory of your target project.

### 2. Install Dependencies
Ensure the target project has the required dependencies. You may need to run:
```bash
npm install @google/genai motion idb-keyval lucide-react react-markdown remark-gfm remark-math rehype-katex rehype-raw katex mermaid
```

### 3. Create Project-Specific Utilities
The specific behavior of the Copilot is driven by your project's tools and prompts. Create a `CopilotIntegration` folder (e.g., `components/CopilotIntegration`) in your project to house them:
- **`prompts.ts`**: Define your `systemInstructionBase` and the `toolNameMap` (for translating tool calls into human-readable action history summaries).
- **`tools.ts`**: Define your `toolDeclarations` (Gemini FunctionDeclarations) and `createToolHandlers` (the actual execution logic relying on your app state).
- **`GlobalCopilot.tsx`**: A simple wrapper around `CopilotUI` that passes your `tools` and `prompts` as props.

### 4. Implement the Wrapper
Example of a `GlobalCopilot.tsx` wrapper:

```tsx
import React from 'react';
import { CopilotUI } from '../../copilot/ui/CopilotUI';
import { toolDeclarations, createToolHandlers } from './tools';
import { systemInstructionBase, toolNameMap } from './prompts';

export const GlobalCopilot = (props: any) => {
    return (
        <CopilotUI
            toolDeclarations={toolDeclarations}
            createHandlers={createToolHandlers}
            systemInstructionBase={systemInstructionBase}
            context={props} // Pass through your app's state for the handlers to use
            title="My App Copilot"
            toolNameMap={toolNameMap}
            emptyStateTitle="Hello, I am your assistant"
            emptyStateDescription="I am ready to help you with anything."
        />
    );
};
```

### 5. Render in your App
Mount your `GlobalCopilot` wrapper in your root component:

```tsx
import { GlobalCopilot } from './components/CopilotIntegration/GlobalCopilot';

function App() {
  return (
    <div>
      <MyAppContent />
      <GlobalCopilot appData={data} />
    </div>
  );
}
```

## Features
- **Prompt Caching & Persistence**: Uses IndexedDB for deep local history.
- **Model Agnostic**: Can map calls to Gemini, OpenAI, or DeepSeek depending on config.
- **Agentic Loop**: Can run actions autonomously based on the `toolDeclarations` mapped.
- **Rich Rendering**: Transparent action logs, markdown, math expressions, tables, and Mermaid charts.
