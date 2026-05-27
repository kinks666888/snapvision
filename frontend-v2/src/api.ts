export type RegionType = 'kline' | 'macd';

export interface AnalysisResponse {
  kline_pattern?: string;
  macd_signal?: string;
  confidence?: number;
  cached?: boolean;
  error?: string;
  raw_response?: string;
}

export async function analyzeImage(
  imageBase64: string,
  regionType: RegionType
): Promise<AnalysisResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_base64: imageBase64,
      region_type: regionType,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
