import { useEffect, useRef } from "react";
import L from "leaflet";
import { RouteFeature, Coordinates } from "@/types/route";

// Fix for default marker icons
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

interface MapViewProps {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  origin: Coordinates | null;
  destination: Coordinates | null;
}

export default function MapView({
  routes,
  selectedRoute,
  origin,
  destination,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const markerLayersRef = useRef<L.Marker[]>([]);

  // Create custom icons
  const originIcon = L.divIcon({
    className: "custom-marker-origin",
    html: `<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  const destinationIcon = L.divIcon({
    className: "custom-marker-destination",
    html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.7128, -74.006], // NYC default
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing route layers
    routeLayersRef.current.forEach((layer) => layer.remove());
    routeLayersRef.current = [];

    // Add new routes
    routes.forEach((route) => {
      const isSelected = selectedRoute?.properties.id === route.properties.id;
      const coordinates: L.LatLngExpression[] = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as L.LatLngExpression
      );

      const polyline = L.polyline(coordinates, {
        color: isSelected ? "#3b82f6" : "#94a3b8",
        weight: isSelected ? 5 : 3,
        opacity: isSelected ? 1 : 0.6,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routeLayersRef.current.push(polyline);
    });

    // Fit bounds if routes exist
    if (routes.length > 0) {
      const bounds = L.latLngBounds([]);
      routes.forEach((route) => {
        route.geometry.coordinates.forEach(([lng, lat]) => {
          bounds.extend([lat, lng]);
        });
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [routes, selectedRoute]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markerLayersRef.current.forEach((marker) => marker.remove());
    markerLayersRef.current = [];

    // Add origin marker
    if (origin) {
      const marker = L.marker([origin.lat, origin.lng], { icon: originIcon })
        .bindPopup(`<div class="text-sm font-medium">Origin</div><div class="text-xs">${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}</div>`)
        .addTo(map);
      markerLayersRef.current.push(marker);
    }

    // Add destination marker
    if (destination) {
      const marker = L.marker([destination.lat, destination.lng], { icon: destinationIcon })
        .bindPopup(`<div class="text-sm font-medium">Destination</div><div class="text-xs">${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}</div>`)
        .addTo(map);
      markerLayersRef.current.push(marker);
    }
  }, [origin, destination]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-border/50" />
    </div>
  );
}
