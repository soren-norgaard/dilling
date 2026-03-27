import { createAzure } from "@ai-sdk/azure";
import { createOpenAI } from "@ai-sdk/openai";

const isAzure = !!process.env.AZURE_OPENAI_ENDPOINT;

/** JSON Schema map for tool parameter patching (populated from route.ts) */
let _toolSchemaMap: Record<string, object> | null = null;

export function registerToolSchemas(map: Record<string, object>) {
  _toolSchemaMap = map;
}

/**
 * Custom fetch that patches tool schemas before sending to MPS.
 * Workaround: AI SDK + zod v4 produces empty tool parameters;
 * we inject the correct JSON Schemas from our pre-built map.
 */
const patchingFetch: typeof globalThis.fetch = async (url, init) => {
  if (_toolSchemaMap && typeof init?.body === "string") {
    try {
      const body = JSON.parse(init.body);
      if (Array.isArray(body.tools)) {
        for (const t of body.tools) {
          const name = t?.function?.name;
          if (name && _toolSchemaMap[name]) {
            t.function.parameters = _toolSchemaMap[name];
          }
        }
        init = { ...init, body: JSON.stringify(body) };
      }
    } catch { /* pass through */ }
  }
  return globalThis.fetch(url, init);
};

const azureProvider = isAzure
  ? createAzure({
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai`,
      apiKey: process.env.OPENAI_API_KEY ?? "",
      apiVersion: process.env.AZURE_API_VERSION ?? "2025-04-01-preview",
      useDeploymentBasedUrls: true,
      fetch: patchingFetch,
    })
  : null;

const openaiProvider = !isAzure
  ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" })
  : null;

/** Default model for agent use — uses chat completions (not responses API) */
export const agentModel = azureProvider
  ? azureProvider.chat(process.env.OPENAI_MODEL ?? "gpt-4o")
  : openaiProvider!.chat(process.env.OPENAI_MODEL ?? "gpt-4o");
