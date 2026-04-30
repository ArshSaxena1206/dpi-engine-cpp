const API = 'http://localhost:3001/api/v1';

export interface GenerateParams {
  packetCount: number;
  protocols: string[];
  domains: string[];
  ipRange: string;
}

export interface GenerateResponse {
  jobId: string;
  filename: string;
}

/**
 * Sends generation parameters to the backend to create a synthetic PCAP file.
 * @param {GenerateParams} params - The generation configuration.
 * @returns {Promise<GenerateResponse>} The parsed JSON response from the server.
 */
export async function generatePcap(
  params: GenerateParams
): Promise<GenerateResponse> {
  const res = await fetch(`${API}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      err = { error: { message: 'Network error or invalid response' } };
    }
    throw new Error(err?.error?.message ?? 'Failed to generate PCAP');
  }

  return res.json();
}
