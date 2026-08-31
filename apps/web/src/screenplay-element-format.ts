import type { ScreenplayElementCategory } from "@film/schema";

export const SCREENPLAY_ELEMENT_LABELS: Record<ScreenplayElementCategory, string> = {
  cast: "Cast",
  background: "Background",
  location: "Location",
  prop: "Props",
  wardrobe: "Wardrobe",
  makeup: "Makeup",
  vehicle: "Vehicles",
  animal: "Animals",
  stunt: "Stunts",
  special_effect: "SFX",
  visual_effect: "VFX",
  sound: "Sound",
  music: "Music",
  equipment: "Equipment",
  other: "Other",
};
