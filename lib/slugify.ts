export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // 1. Separate accents from letters (e.g., 'é' -> 'e' + '´')
    .normalize('NFD')
    // 2. Remove the separated accent marks
    .replace(/[\u0300-\u036f]/g, '')
    // 3. Remove everything else that isn't a word char, whitespace, or hyphen
    .replace(/[^\w\s-]/g, '')
    // 4. Replace spaces and underscores with hyphens
    .replace(/[\s_-]+/g, '-')
    // 5. Remove hyphens from start or end
    .replace(/^-+|-+$/g, '');
}