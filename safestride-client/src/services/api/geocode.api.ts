import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export interface AddressSuggestion {
  label: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export async function searchAddress(query: string) {
  const response = await axios.get(`${BASE_URL}/geocode`, {
    params: {
      q: query,
    },
  });

  return response.data.suggestions as AddressSuggestion[];
}