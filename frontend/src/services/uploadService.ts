const API = 'http://localhost:3001/api/v1';

/**
 * Uploads a PCAP file to the backend for DPI processing.
 * @param {File} file - The PCAP file to upload.
 * @returns {Promise<any>} The parsed JSON response from the server.
 */
export async function uploadPcap(file: File) {
  const formData = new FormData();
  formData.append('pcapFile', file);

  const res = await fetch(`${API}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      err = { error: { message: 'Network error or invalid response' } };
    }
    throw new Error(err?.error?.message ?? 'Failed to upload PCAP');
  }

  return res.json();
}

/**
 * Downloads a processed PCAP file from the backend.
 * @param {string} filename - The name of the file to download.
 */
export function downloadResult(filename: string) {
  const url = `${API}/download/${filename}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
