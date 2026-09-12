// The manifest has at most three starter maps. Share their fetches with thumbnails.
const downloads = new Map<string, Promise<Uint8Array>>();

export function starterBytes(url: string): Promise<Uint8Array> {
  let download = downloads.get(url);
  if (!download) {
    download = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not download map (${response.status})`);
        return new Uint8Array(await response.arrayBuffer());
      })
      .catch((error) => {
        downloads.delete(url);
        throw error;
      });
    downloads.set(url, download);
  }
  return download;
}
