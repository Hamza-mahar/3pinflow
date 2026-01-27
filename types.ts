
export interface UrlAnalysis {
  topic: string;
  coreContent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: 'buy' | 'learn' | 'download' | 'explore' | string;
  mainBenefits: string[];
  targetAudience: string;
  visualAngleOpportunities: string;
}

export interface PinVariation {
  title: string;
  description: string;
  altText: string;
  suggestedBoards: string[];
  keywords: string[];
  strategy: {
    seoAngle: string;
    emotionalTrigger: string;
    headlineStyle: string;
    visualStyle: string;
    targetUserLevel: 'Beginner' | 'Advanced' | 'All';
    intentType: 'Informational' | 'Commercial';
  };
  visualStrategy: {
    styleType: 'Lifestyle' | 'Editorial' | 'Collage' | 'StepFeature' | 'CloseUpWide';
    compositionParams: {
      cameraAngle: string;
      distance: 'Close-up' | 'Medium' | 'Wide';
      lighting: 'Warm' | 'Neutral' | 'Bright' | 'Dramatic';
    };
    textOverlay: string;
    supportingText?: string;
    imagePrompt: string;
    colorPalette: string[];
  };
  performanceIntelligence: {
    viralHook: string;
    ctrBooster: string;
    distributionVelocity: string;
  };
  experimentationLayer: {
    hypothesis: string;
    testMetric: string;
    winnerAction: string;
  };
  authorityLayer: {
    nicheDominance: string;
    trustSignal: string;
    stabilityStrategy: string;
  };
  scheduledDate?: string;
  generatedImageUrl?: string; // Local preview (Base64)
  publicMediaUrl?: string; // STEP 24: Publicly accessible HTTPS URL
}

export interface CampaignResult {
  sourceUrl: string;
  analysis: UrlAnalysis;
  variations: PinVariation[];
}

export interface GenerationState {
  loading: boolean;
  error: string | null;
  results: CampaignResult[] | null;
}

export interface AppSettings {
  pinsPerDay: number;
  startDate: string;
  variationsPerUrl: number;
}
