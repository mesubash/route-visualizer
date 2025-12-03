import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { RouteFeature, Coordinates, LatLngTuple } from "@/types/route";

// Fix for default marker icons in Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

const originIcon = createCustomIcon("#22c55e"); // Green
const destinationIcon = createCustomIcon("#ef4444"); // Red

interface MapViewProps {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  origin: Coordinates | null;
  destination: Coordinates | null;
  onMapClick?: (coords: Coordinates) => void;
}

// Component to handle map bounds fitting
function FitBounds({
  routes,
  origin,
  destination,
}: {
  routes: RouteFeature[];
  origin: Coordinates | null;
  destination: Coordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0 || (origin && destination)) {
      const bounds = L.latLngBounds([]);

      // Add route coordinates to bounds
      routes.forEach((route) => {
        route.geometry.coordinates.forEach(([lng, lat]) => {
          bounds.extend([lat, lng]);
        });
      });

      // Add origin/destination if no routes
      if (routes.length === 0) {
        if (origin) bounds.extend([origin.lat, origin.lng]);
        if (destination) bounds.extend([destination.lat, destination.lng]);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [routes, origin, destination, map]);

  return null;
}

export default function MapView({
  routes,
  selectedRoute,
  origin,
  destination,
  onMapClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Convert GeoJSON coordinates to Leaflet format
  const getPolylinePositions = useMemo(() => {
    return (coordinates: [number, number][]): LatLngTuple[] => {
      return coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple);
    };
  }, []);

  // Default center (New York City)
  const defaultCenter: LatLngTuple = [40.7128, -74.006];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds routes={routes} origin={origin} destination={destination} />

        {/* Render all routes */}
        {routes.map((route) => {
          const isSelected = selectedRoute?.properties.id === route.properties.id;
          return (
            <Polyline
              key={route.properties.id}
              positions={getPolylinePositions(route.geometry.coordinates)}
              pathOptions={{
                color: isSelected ? "#3b82f6" : "#94a3b8",
                weight: isSelected ? 5 : 3,
                opacity: isSelected ? 1 : 0.6,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          );
        })}

        {/* Origin Marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
            <Popup>
              <div className="text-sm font-medium">Origin</div>
              <div className="text-xs text-muted-foreground">
                {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destinationIcon}
          >
            <Popup>
              <div className="text-sm font-medium">Destination</div>
              <div className="text-xs text-muted-foreground">
                {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map overlay with gradient */}
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-border/50" />
    </div>
  );
}
