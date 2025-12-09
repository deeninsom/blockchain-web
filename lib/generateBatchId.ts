export function generateBatchId(prefix: string = 'BATCH'): string {
  const now = new Date();

  const datePart = now.toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);

  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${prefix}-${datePart}-${randomPart}`;
}