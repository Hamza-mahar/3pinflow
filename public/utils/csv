
import { CampaignResult } from "../types";

function validateRow(row: string[], idx: number) {
  const [title, mediaUrl, board, description, link, date, keywords] = row.map(cell => cell.replace(/^"|"$/g, ''));

  if (!title || title.length < 1) throw new Error(`Row ${idx}: Title empty.`);
  
  // CRITICAL RULE: No Base64 or Blobs in CSV
  if (!mediaUrl || !mediaUrl.startsWith("https://") || mediaUrl.includes("data:image") || mediaUrl.includes("blob:")) {
    throw new Error(`Row ${idx}: Media URL is not a public HTTPS link. Current: ${mediaUrl.substring(0, 30)}...`);
  }
  
  if (!board) throw new Error(`Row ${idx}: Board empty.`);
  if (!description) throw new Error(`Row ${idx}: Description empty.`);
  if (!link || !link.startsWith("https://")) throw new Error(`Row ${idx}: Link empty or not HTTPS.`);
  if (!date) throw new Error(`Row ${idx}: Date empty.`);
  if (!keywords) throw new Error(`Row ${idx}: Keywords empty.`);

  return true;
}

export function generateCSVString(data: CampaignResult[]): string {
  const expectedTotal = data.length * 3;
  const headers = [
    "Title",
    "Media URL",
    "Pinterest board",
    "Description",
    "Link",
    "Publish date",
    "Keywords"
  ];
  
  const rows = data.flatMap(urlResult => 
    urlResult.variations.map(variation => {
      // MANDATORY: Use publicMediaUrl only
      const mediaUrl = variation.publicMediaUrl;
      
      if (!mediaUrl || !mediaUrl.startsWith("https://")) {
        throw new Error(`Cloud Sync Missing: Variation "${variation.title}" has no public HTTPS URL. Export blocked.`);
      }

      return [
        `"${variation.title.replace(/"/g, '""')}"`,
        `"${mediaUrl}"`,
        `"${variation.suggestedBoards[0].replace(/"/g, '""')}"`,
        `"${variation.description.replace(/"/g, '""')}"`,
        `"${urlResult.sourceUrl}"`,
        `"${variation.scheduledDate || ''}"`,
        `"${variation.keywords.join(", ").replace(/"/g, '""')}"`
      ];
    })
  );

  // CRITICAL EXPORT SAFETY CHECK
  if (rows.length !== expectedTotal) {
    throw new Error(`Batch Integrity Failure: Expected ${expectedTotal} rows, found ${rows.length}.`);
  }

  // Row-level deep validation
  rows.forEach((row, idx) => validateRow(row, idx + 1));

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export function exportToPinterestCSV(data: CampaignResult[]) {
  try {
    const csvContent = generateCSVString(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `pinflow_bulk_ready_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error: any) {
    console.error("CSV Export Guard Triggered:", error.message);
    alert(`EXPORT BLOCKED: ${error.message}`);
  }
}
