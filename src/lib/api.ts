import { RouteApiResponse, RouteCollection, RouteFeature } from "@/types/route";

// Mock data for demonstration - simulates PostGIS API response
const mockRouteData: RouteCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9857, 40.7484], // Empire State Building
          [-73.9814, 40.7505],
          [-73.9776, 40.7527],
          [-73.9739, 40.7549],
          [-73.9712, 40.7580],
          [-73.9697, 40.7614],
          [-73.9680, 40.7645],
          [-73.9654, 40.7681],
          [-73.9632, 40.7712],
          [-73.9614, 40.7749],
          [-73.9851, 40.7589], // Times Square
        ],
      },
      properties: {
        id: "route-1",
        distance: 2450,
        duration: 1800,
        routeName: "Midtown Express",
        roadType: "Urban",
        waypoints: [
          { lat: 40.7484, lng: -73.9857, name: "Empire State Building" },
          { lat: 40.7589, lng: -73.9851, name: "Times Square" },
        ],
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.9857, 40.7484],
          [-73.9890, 40.7510],
          [-73.9920, 40.7535],
          [-73.9880, 40.7560],
          [-73.9851, 40.7589],
        ],
      },
      properties: {
        id: "route-2",
        distance: 1850,
        duration: 1500,
        routeName: "Scenic Route",
        roadType: "Mixed",
        waypoints: [
          { lat: 40.7484, lng: -73.9857, name: "Empire State Building" },
          { lat: 40.7589, lng: -73.9851, name: "Times Square" },
        ],
      },
    },
  ],
};

// Simulated API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchRoutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteApiResponse> {
  // Simulate API call delay
  await delay(1500);

  // In production, replace with actual API call:
  // const response = await fetch(
  //   `/api/routes?origin=${originLat},${originLng}&destination=${destLat},${destLng}`
  // );
  // return response.json();

  // Generate mock routes based on input coordinates
  const generatedRoutes = generateMockRoutes(
    originLat,
    originLng,
    destLat,
    destLng
  );

  return {
    success: true,
    data: generatedRoutes,
  };
}

function generateMockRoutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): RouteCollection {
  // Generate intermediate points for a realistic route
  const numPoints = 8;
  const coordinates: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Add some randomness to simulate real road paths
    const jitter = i > 0 && i < numPoints ? (Math.random() - 0.5) * 0.005 : 0;
    const lng = originLng + (destLng - originLng) * t + jitter;
    const lat = originLat + (destLat - originLat) * t + jitter;
    coordinates.push([lng, lat]);
  }

  // Calculate approximate distance (Haversine formula)
  const distance = calculateDistance(originLat, originLng, destLat, destLng);
  const duration = Math.round(distance / 10); // ~36 km/h average speed

  const primaryRoute: RouteFeature = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates,
    },
    properties: {
      id: "route-primary",
      distance: Math.round(distance),
      duration,
      routeName: "Fastest Route",
      roadType: "Highway",
      waypoints: [
        { lat: originLat, lng: originLng, name: "Origin" },
        { lat: destLat, lng: destLng, name: "Destination" },
      ],
    },
  };

  // Generate alternative route with slight variation
  const altCoordinates: [number, number][] = coordinates.map(([lng, lat], i) => {
    if (i === 0 || i === coordinates.length - 1) return [lng, lat];
    const offset = (Math.random() - 0.5) * 0.008;
    return [lng + offset, lat + offset];
  });

  const altRoute: RouteFeature = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: altCoordinates,
    },
    properties: {
      id: "route-alt",
      distance: Math.round(distance * 1.15),
      duration: Math.round(duration * 1.1),
      routeName: "Alternative Route",
      roadType: "Local Roads",
      waypoints: [
        { lat: originLat, lng: originLng, name: "Origin" },
        { lat: destLat, lng: destLng, name: "Destination" },
      ],
    },
  };

  return {
    type: "FeatureCollection",
    features: [primaryRoute, altRoute],
  };
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}
