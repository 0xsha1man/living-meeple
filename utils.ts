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