/**
 * Decodes Valhalla's polyline format into GeoJSON coordinates
 */
export function decodeValhallaPolyline(str: string, precision = 6): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: [number, number][] = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, precision);

  while (index < str.length) {
    byte = null;
    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude_change = (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude_change = (result & 1) ? ~(result >> 1) : (result >> 1);

    lat += latitude_change;
    lng += longitude_change;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

/**
 * Service to interface with Valhalla Routing Engine
 */
export async function getValhallaRoute(locations: { lat: number; lng: number }[]) {
  if (locations.length < 2) return null;

  const req = {
    locations: locations.map(l => ({ lat: l.lat, lon: l.lng })),
    costing: 'auto'
  };

  try {
    const res = await fetch(`https://valhalla1.openstreetmap.de/route?json=${JSON.stringify(req)}`);
    if (!res.ok) throw new Error('Valhalla routing failed');
    const data = await res.json();

    if (data.trip && data.trip.legs) {
      const coordinates: [number, number][] = [];
      data.trip.legs.forEach((leg: any) => {
        coordinates.push(...decodeValhallaPolyline(leg.shape, 6));
      });

      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      };
    }
  } catch (err) {
    console.error("Valhalla Route Error:", err);
    // Fallback to OSRM if Valhalla fails due to CORS or downtime
    try {
      const coordinatesString = locations.map(l => `${l.lng},${l.lat}`).join(';');
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`);
      const osrmData = await osrmRes.json();
      if (osrmData.routes && osrmData.routes.length > 0) {
        return {
          type: 'Feature',
          properties: {},
          geometry: osrmData.routes[0].geometry
        };
      }
    } catch (osrmErr) {
      console.error("OSRM Fallback Error:", osrmErr);
    }
  }
  
  return null;
}
