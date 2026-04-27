import { anthropic } from "@ai-sdk/anthropic";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;
  readonly supportedUrls = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: any[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: any[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: any[],
    userPrompt: string
  ): AsyncGenerator<any> {
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";
    if (promptLower.includes("form")) { componentType = "form"; componentName = "ContactForm"; }
    else if (promptLower.includes("card")) { componentType = "card"; componentName = "Card"; }

    yield { type: "stream-start", warnings: [] };

    const emitText = async function*(self: MockLanguageModel, id: string, text: string, delayMs: number) {
      yield { type: "text-start", id };
      for (const char of text) {
        yield { type: "text-delta", id, delta: char };
        await self.delay(delayMs);
      }
      yield { type: "text-end", id };
    };

    const emitToolCall = function*(id: string, toolName: string, args: object) {
      const input = JSON.stringify(args);
      yield { type: "tool-input-start", id, toolName };
      yield { type: "tool-input-delta", id, delta: input };
      yield { type: "tool-input-end", id };
      yield { type: "tool-call", toolCallId: id, toolName, input };
    };

    if (toolMessageCount === 0) {
      yield* emitText(this, "text-1", `This is a static response. Add an Anthropic API key to .env to use real generation. Creating App.jsx now.`, 15);
      yield* emitToolCall("call_3", "str_replace_editor", { command: "create", path: "/App.jsx", file_text: this.getAppCode(componentName) });
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30 } };
      return;
    }

    if (toolMessageCount === 1) {
      yield* emitText(this, "text-2", `I'll create a ${componentName} component for you.`, 25);
      yield* emitToolCall("call_1", "str_replace_editor", { command: "create", path: `/components/${componentName}.jsx`, file_text: this.getComponentCode(componentType) });
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30 } };
      return;
    }

    if (toolMessageCount === 2) {
      yield* emitText(this, "text-3", `Now let me enhance the component with better styling.`, 25);
      yield* emitToolCall("call_2", "str_replace_editor", { command: "str_replace", path: `/components/${componentName}.jsx`, old_str: this.getOldStringForReplace(componentType), new_str: this.getNewStringForReplace(componentType) });
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30 } };
      return;
    }

    yield* emitText(this, "text-4", `Perfect! I've created:\n\n1. **${componentName}.jsx** - A fully-featured ${componentType} component\n2. **App.jsx** - The main app file that displays the component\n\nThe component is now ready to use. You can see the preview on the right side of the screen.`, 30);
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 50, outputTokens: 50 } };
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({ 
  title = "2026 San Diego Padres - Regular Season Batting Averages (Early Season)", 
  description = "A table of early season batting averages for San Diego Padres position players.",
  imageUrl,
  actions 
}) => {
  const players = [
    { name: "Freddy Fermin", position: "C", average: ".118" },
    { name: "Ramon Laureano", position: "RF", average: ".258" },
    { name: "Xander Bogaerts", position: "SS", average: ".200" },
    { name: "Gavin Sheets", position: "LF", average: ".286" },
    { name: "Jackson Merrill", position: "CF", average: ".250" },
    { name: "Manny Machado", position: "3B", average: ".222" },
    { name: "Nick Castellanos", position: "RF", average: ".188" },
    { name: "Fernando Tatis Jr.", position: "RF", average: ".212" },
    { name: "Miguel Andujar", position: "LF", average: ".286" },
    { name: "Jake Cronenworth", position: "2B", average: ".125" },
    { name: "Luis Campusano", position: "C", average: ".200" },
    { name: "Ty France", position: "1B", average: ".125" },
    { name: "Bryce Johnson", position: "CF", average: ".125" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6 text-center">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-neutral-700 border border-neutral-200 rounded-lg overflow-hidden">
            <thead className="bg-neutral-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Player</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">AVG</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.name} className="border-t border-neutral-200">
                  <td className="px-4 py-3">{player.name}</td>
                  <td className="px-4 py-3">{player.position}</td>
                  <td className="px-4 py-3 font-medium">{player.average}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {actions && (
          <div className="mt-4 flex justify-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button 
          onClick={decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Decrease
        </button>
        <button 
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8 text-center">
      <div className="w-full max-w-md">
        <Card 
          title="2026 San Diego Padres - Regular Season Batting Averages (Early Season)"
          description="Updated early season stats for Padres position players."
          actions={
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
              View Roster
            </button>
          }
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(options: any): Promise<any> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const parts: any[] = [];
    for await (const part of this.generateMockStream(options.prompt, userPrompt)) {
      parts.push(part);
    }

    // Build v2 content array from stream parts
    const content: any[] = [];
    const textById: Record<string, string> = {};
    for (const p of parts) {
      if (p.type === "text-delta") textById[p.id] = (textById[p.id] ?? "") + p.delta;
      if (p.type === "tool-call") content.push({ type: "tool-call", toolCallId: p.toolCallId, toolName: p.toolName, input: p.input });
    }
    for (const text of Object.values(textById)) {
      if (text) content.unshift({ type: "text", text });
    }

    const finishPart = parts.find((p) => p.type === "finish");
    return {
      content,
      finishReason: finishPart?.finishReason ?? "stop",
      usage: { inputTokens: 100, outputTokens: 200 },
      warnings: [],
      request: {},
      response: { headers: {} },
    };
  }

  async doStream(options: any): Promise<any> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      request: {},
      response: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
