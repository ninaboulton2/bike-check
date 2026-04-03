export type Locale = "en" | "fr";

export type Messages = Record<string, unknown>;

/**
 * Translation helper — resolves a dot-path key against a nested messages object
 * and replaces `{param}` placeholders with values.
 *
 * Example: t(messages, "components.status.remainingKm", { km: 153 })
 */
export function t(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let value: unknown = messages;
  for (const part of parts) {
    if (value == null || typeof value !== "object") return key;
    value = (value as Record<string, unknown>)[part];
  }
  if (typeof value !== "string") return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export async function getMessages(locale: Locale): Promise<Messages> {
  if (locale === "fr") {
    const mod = await import("./fr");
    return mod.messages as unknown as Messages;
  }
  const mod = await import("./en");
  return mod.messages as unknown as Messages;
}

export function getMessagesSync(locale: Locale): Messages {
  // For client-side use where we bundle both locales
  if (locale === "fr") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./fr").messages as unknown as Messages;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./en").messages as unknown as Messages;
}
