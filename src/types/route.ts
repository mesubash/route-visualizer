export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Waypoint extends Coordinates {
  name?: string;
  order?: number;
}

export interface RouteProperties {
  id: string;
  distance: number; // meters
  duration: number; // seconds
  routeName: string;
  roadType?: string;
  waypoints?: Waypoint[];
  createdAt?: string;
  color?: string;
}

export interface RouteFeature {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat] pairs
  };
  properties: RouteProperties;
}

export interface RouteCollection {
  type: "FeatureCollection";
  features: RouteFeature[];
}

export interface RouteApiResponse {
  success: boolean;
  data: RouteCollection;
  error?: string;
}

export interface RouteInputState {
  origin: {
    lat: string;
    lng: string;
    name?: string;
  };
  destination: {
    lat: string;
    lng: string;
    name?: string;
  };
}

export type RouteStatus = "idle" | "loading" | "success" | "error";

export interface MapState {
  center: Coordinates;
  zoom: number;
}

// Utility type for converting GeoJSON coordinates to Leaflet format
export type LatLngTuple = [number, number]; // [lat, lng] for Leaflet
