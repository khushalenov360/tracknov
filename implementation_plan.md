# RCA: Harita Losing Context & "Dumbing Down"

## The Root Cause

The reason Harita is saying things like *"I can't access specific files..."* and offering to *"help you debug"* is because the **Atomesus API completely ignores the `system` role** in the chat request.

In standard LLM integrations (like OpenAI, Gemini, or Anthropic), we send the massive project snapshot and Harita's personality rules inside a hidden `{"role": "system"}` message. 

However, many smaller custom deployments (like `api.atomesus.com` running `Cipher 8B`) have basic chat templates that silently drop or ignore the `system` message. 

Because Atomesus is dropping the system message:
1. It **never sees** the project data (like the `bhavarkua` workspace).
2. It **forgets** it is supposed to be Harita (the consultant engine).
3. It falls back to its base training data—which happens to be a generic coding/debugging assistant—and outputs generic apologies about not having access to files.

## Proposed Fix

I will implement the **"System Prompt Hack"** for the Atomesus provider. 

Instead of sending the critical context in the `system` role, I will inject the entire system prompt (along with the workspace snapshot) as a `user` message at the very beginning of the chat array, followed by a synthetic `assistant` acknowledgement.

This guarantees that even if Atomesus ignores the `system` role, it is forced to read the workspace context as standard user input, permanently restoring Harita's intelligence and project awareness.

### Changes
#### [MODIFY] `lib/harita-engine/assistant/llm-streamer.ts`
- Update the `Atomesus` fetch call to re-map the `sp` (system prompt) into the `messages` array as a `user` prompt.
