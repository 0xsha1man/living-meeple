import path from 'path';

/**
 * Replaces placeholders in a template string with provided values.
 * Placeholders are in the format `{{key}}`.
 * @param template The template string containing placeholders.
 * @param values An object where keys match placeholders and values are the replacements.
 * @returns The template string with all placeholders filled.
 */
export const fillPromptTemplate = (template: string, values: { [key: string]: string | number }) => {
  return Object.entries(values).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, template);
};

/**
 * Pauses execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to wait.
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Looks up the MIME type for a given filename based on its extension.
 * @param filename The name of the file.
 * @returns The corresponding MIME type string, defaulting to 'image/png'.
 */
export function lookupMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/png'; // default
}