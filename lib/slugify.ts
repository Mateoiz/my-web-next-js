export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')    // Remove special chars like ! or ?
    .replace(/[\s_-]+/g, '-')    // Replace spaces with -
    .replace(/^-+|-+$/g, '');    // Trim - from start/end
}