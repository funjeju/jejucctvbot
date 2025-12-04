/**
 * Safely retrieves a value from a nested object using a string path.
 * e.g., getValueByPath(obj, 'a.b[0].c')
 * @param obj The object to query.
 * @param path The string path to the desired value.
 * @returns The value if found, otherwise undefined.
 */
export const getValueByPath = (obj: any, path: string): any => {
  // First, handle array accessors like `[0]` by converting them to dot notation like `.0`
  const processedPath = path.replace(/\[(\w+)\]/g, '.$1');
  // Then, split the path by dots
  const keys = processedPath.split('.');

  let result = obj;
  for (const key of keys) {
    if (result === null || result === undefined) {
      return undefined;
    }
    result = result[key];
  }
  return result;
};

/**
 * Utility function to merge class names (shadcn style)
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}