export function redactTechnicalMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gi, "[URL]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[EMAIL]")
    .slice(0, 500);
}
