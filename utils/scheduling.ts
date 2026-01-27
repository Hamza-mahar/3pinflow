
import { CampaignResult, AppSettings, PinVariation } from "../types";

/**
 * STEP 23 — SCHEDULING LOGIC FIX
 * Implements strict Daily Distribution Algorithm:
 * WHILST remainingPins > 0:
 *   assign min(pinsPerDay, remainingPins) to current date
 */
export function scheduleCampaign(results: CampaignResult[], settings: AppSettings): CampaignResult[] {
  const { pinsPerDay: rawPinsPerDay, startDate } = settings;
  const pinsPerDay = Math.max(1, rawPinsPerDay || 3);
  const start = new Date(startDate);
  
  // 1. Flatten all pins for global distribution
  const flattenedPins: { url: string; variation: PinVariation; uIdx: number; vIdx: number }[] = [];
  
  // Ensure we pick all variations from all URLs
  results.forEach((r, uIdx) => {
    r.variations.forEach((v, vIdx) => {
      flattenedPins.push({
        url: r.sourceUrl,
        variation: v,
        uIdx,
        vIdx
      });
    });
  });

  // 2. Strict Daily Distribution
  const scheduledFlat = flattenedPins.map((item, index) => {
    const dayOffset = Math.floor(index / pinsPerDay);
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    
    // Publish Time Slotting (09:00 - 21:00)
    const pinIndexInDay = index % pinsPerDay;
    const hour = 9 + Math.floor((pinIndexInDay * 12) / pinsPerDay);
    const minute = (pinIndexInDay * 17) % 60; // Jitter minutes
    
    date.setHours(hour, minute, 0, 0);

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    
    return { ...item, dateStr };
  });

  // 3. Re-map to results structure
  return results.map((urlResult, uIdx) => ({
    ...urlResult,
    variations: urlResult.variations.map((variation, vIdx) => {
      const scheduled = scheduledFlat.find(s => s.uIdx === uIdx && s.vIdx === vIdx);
      return {
        ...variation,
        scheduledDate: scheduled ? scheduled.dateStr : ''
      };
    })
  }));
}
