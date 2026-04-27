import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolInvocationArgs = {
  command?: string;
  path?: string;
  file_text?: string;
  insert_line?: number;
  old_str?: string;
  new_str?: string;
};

interface ToolInvocationMessageProps {
  invocation: {
    toolName: string;
    args?: ToolInvocationArgs;
    state?: string;
    result?: string;
  };
}

function getFriendlyMessage(invocation: ToolInvocationMessageProps["invocation"]) {
  const { toolName, args } = invocation;

  if (toolName === "str_replace_editor") {
    const path = args?.path ? ` "${args.path}"` : ""
    switch (args?.command) {
      case "create":
        return `Creating file${path}...`;
      case "str_replace":
        return `Editing file${path}...`;
      case "insert":
        return `Inserting content into file${path}...`;
      case "undo_edit":
        return `Reverting changes in file${path}...`;
      default:
        return `Performing file edit on${path || " a file"}...`;
    }
  }

  return `Running ${toolName}...`;
}

export function ToolInvocationMessage({ invocation }: ToolInvocationMessageProps) {
  const message = getFriendlyMessage(invocation);

  return (
    <div className={cn(
      "inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-mono border",
      invocation.state === "result"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-neutral-50 text-neutral-700 border-neutral-200"
    )}>
      {invocation.state === "result" ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span>{message}</span>
    </div>
  );
}
