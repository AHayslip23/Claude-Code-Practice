import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolInvocationMessage } from "../ToolInvocationMessage";

test("shows friendly create file message for str_replace_editor create", () => {
  render(
    <ToolInvocationMessage
      invocation={{
        toolName: "str_replace_editor",
        state: "running",
        args: { command: "create", path: "/src/App.tsx" },
      }}
    />
  );

  expect(screen.getByText('Creating file "/src/App.tsx"...')).toBeDefined();
});

test("shows friendly edit file message for str_replace_editor str_replace", () => {
  render(
    <ToolInvocationMessage
      invocation={{
        toolName: "str_replace_editor",
        state: "running",
        args: { command: "str_replace", path: "/src/App.tsx" },
      }}
    />
  );

  expect(screen.getByText('Editing file "/src/App.tsx"...')).toBeDefined();
});

test("shows running default message for unknown tool", () => {
  render(
    <ToolInvocationMessage
      invocation={{
        toolName: "unknown_tool",
        state: "running",
      }}
    />
  );

  expect(screen.getByText("Running unknown_tool...")).toBeDefined();
});
