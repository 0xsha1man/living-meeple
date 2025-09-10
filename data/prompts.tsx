export const PROMPT_TEMPLATES = {
  map: {
    features: `
      Step 1: Analyze the provided style reference image to understand the cartographic style for features like forests, rivers, and hills. The style is for a children's history book, so it must be simple, clear, and not overly detailed.
      Step 2: Using the provided base image as a canvas, ONLY add features described: "{{description}}" with color pencil. Use the full image and do not leave gutter or padding, having features flow off the edge of the image. The features MUST be drawn in a generalized, almost iconic way, not a realistic or tactical military map style.
      The final image MUST have the newly drawn features seemlessly blended into the original image. All other elements must remain unchanged. The result MUST be clean, uncluttered free of any texts or labels.
    `,
    landmarks: `
      Step 1: Analyze the provided style reference image to understand the cartographic style for features like forests, rivers, and hills. The style is for a children's history book, so it must be simple, clear, and not overly detailed.
      Step 2: Using the provided map as a canvas, ONLY add landmarks described: "{{description}}" with color pencil. Use the full image and do not leave gutter or padding, having features flow off the edge of the image. The landmarks MUST be drawn in a generalized, almost iconic way, not a realistic or tactical military map style.
      The final image MUST have the newly drawn landmarks seemlessly blended into the original image. All other elements must remain unchanged. The result MUST be clean, uncluttered free of any texts or labels.
    `,
  },
  storyboard: {
    placement: `Using the current map, add {{amount}} instances of the {{meeple_asset_name}} asset at the location of {{location}}, arranged as {{density}}. The placement should be clear and not overcrowd the map. The placement must not also cover other elements already there completely. Shift the placement slightly or layer in such a way that allows both to be seen in whole or part. Scale the assets to fit the image appropriate. The goal is to show a general location, not precise military formation. Keep all other elements unchanged.`,
    movement: `Using the current map, add in color pencil a simple, clean, wide arrow starting from the area below the meeples at {{start}}, representing a {{type}} movement, and the arrow tip pointing towards the area of {{end}}. The arrow should be the same color as the meeples at the start location. The arrow should clearly indicate direction without cluttering the map. The arrow should be of a low opacity of 20% and blend seemless into the image. Keep all other elements unchanged.`,
    label: `Using the current map, add the text "{{text}}" at the following {{location}}. Use a clean, bold, arial-type without any glow, stroke or other effects as if written in black color pencil. The label must be legible, placed thoughtfully to not obscure important details, and help in understanding the map, not cluttering it. Double check for spelling. Keep all other elements unchanged.`,
  },
};
