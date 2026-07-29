export interface NewsAlert {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string; url: string };
  location?: { lat: number; lng: number };
}

export async function fetchSafetyNews(): Promise<NewsAlert[]> {
  // Mock data for testing
  return [
    {
      title: "Recent chain snatching reported in Shivajinagar",
      description: "Police have warned residents about a surge in petty crimes near the metro station.",
      url: "https://example.com/news/1",
      publishedAt: new Date( ).toISOString(),
      source: { name: "Local News", url: "https://example.com" },
      location: { lat: 18.5314, lng: 73.8446 }
    },
    {
      title: "Traffic advisory: Protest near University Circle",
      description: "Commuters are advised to avoid the area due to heavy congestion and roadblocks.",
      url: "https://example.com/news/2",
      publishedAt: new Date( ).toISOString(),
      source: { name: "City Pulse", url: "https://example.com" },
      location: { lat: 18.5524, lng: 73.8246 }
    }
  ];
}
