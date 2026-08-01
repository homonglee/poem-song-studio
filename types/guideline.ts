export const guidelineTypes = ["poem", "artwork", "song", "narration", "video", "youtube"] as const;

export type GuidelineType = (typeof guidelineTypes)[number];

export interface GuidelineVersion {
  id: string;
  type: GuidelineType;
  version: number;
  content: string;
  createdAt: string;
  deleted: boolean;
}
