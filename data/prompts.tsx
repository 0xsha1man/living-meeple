export const PROMPT_TEMPLATES = {
  base: {
    neutralBackground: `A top-down, flat-lay view of a simple, neutral, light-colored textured background. The texture should resemble clean, plain parchment or canvas, suitable for a children's history book illustration. The image must be a flat texture only, with no defined edges, borders, or map-like features. It must be very simple and uncluttered.`,
  },
  map: {
    features: `
      Step 1: Analyze the provided style reference image to understand the cartographic style for features like forests, rivers, and hills. The style is for a children's history book, so it must be simple, clear, and not overly detailed.
      Step 2: Using the provided base image as a canvas, draw only the topographical features described: "{{description}}". The features should be drawn in a generalized, almost iconic way, not a realistic or tactical military map style.
      The final image must only contain the newly drawn features on the original background. All other elements must remain unchanged. The drawing must be free of any text, labels, or icons. The result should be clean and uncluttered.
    `,
    landmarks: `
      Step 1: Analyze the provided style reference image to understand the cartographic style. The style is for a children's history book, so it must be simple, clear, and not overly detailed.
      Step 2: Using the provided map as a canvas, add only the key landmarks described: "{{description}}". The landmarks should be simple icons or shapes, not detailed drawings.
      The final image must only contain the newly added landmarks, with all other map elements preserved. The drawing must be free of any text, labels, or icons. The result should be clean and uncluttered.
    `,
  },
  storyboard: {
    placement: `Using the current map, add {{amount}} instances of the {{assetName}} asset at the location of {{location}}, arranged as {{density}}. The placement should be clear and not overcrowd the map. The goal is to show a general location, not precise military formation. Keep all other elements unchanged.`,
    movement: `Using the current map, draw a simple, clean, low-opacity (around 20%) {{color}} arrow starting from the area of {{start}}, representing a {{type}}, and pointing towards the area of {{end}}. The arrow should clearly indicate direction without cluttering the map. Keep all other elements unchanged.`,
    label: `Using the current map, add the text "{{text}}" to the feature known as {{location}}. Use a clean, bold, black sans-serif font. The label must be legible, placed thoughtfully to not obscure important details, and help in understanding the map, not cluttering it. Keep all other elements unchanged.`,
  },
};
