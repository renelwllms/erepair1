export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  city: string;
  postcode: string;
}

export interface CalloutLocation {
  name: string;
  fee: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        city: extractComponent(result, "locality"),
        postcode: extractComponent(result, "postal_code"),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export function detectCalloutLocation(
  lat: number,
  lng: number,
  locations: CalloutLocation[]
): CalloutLocation | null {
  for (const location of locations) {
    if (
      lat >= location.bounds.south &&
      lat <= location.bounds.north &&
      lng >= location.bounds.west &&
      lng <= location.bounds.east
    ) {
      return location;
    }
  }
  return null;
}

function extractComponent(result: any, type: string): string {
  const component = result.address_components.find((c: any) =>
    c.types.includes(type)
  );
  return component?.long_name || "";
}
