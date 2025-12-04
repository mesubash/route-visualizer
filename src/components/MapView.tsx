import { useEffect, useRef, useCallback } from "react";
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
  isDrawing?: boolean;
  drawnPoints?: Coordinates[];
  onMapClick?: (coords: Coordinates) => void;
  isEditing?: boolean;
  editPoints?: Coordinates[];
  onEditPointDrag?: (index: number, coords: Coordinates) => void;
}

export default function MapView({
  routes,
  selectedRoute,
  origin,
  destination,
  isDrawing = false,
  drawnPoints = [],
  onMapClick,
  isEditing = false,
  editPoints = [],
  onEditPointDrag,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const markerLayersRef = useRef<L.Marker[]>([]);
  const drawnLayerRef = useRef<L.Polyline | null>(null);
  const drawnMarkersRef = useRef<L.CircleMarker[]>([]);
  const editLayerRef = useRef<L.Polyline | null>(null);
  const editMarkersRef = useRef<L.Marker[]>([]);

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

  // Handle map clicks for drawing or editing
  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if ((isDrawing || isEditing) && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
    [isDrawing, isEditing, onMapClick]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.3949, 84.124], // Nepal default center (for trekking routes)
      zoom: 7,
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

  // Add/remove click handler based on drawing/editing mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on("click", handleMapClick);

    // Update cursor style
    const container = map.getContainer();
    container.style.cursor = isDrawing || isEditing ? "crosshair" : "";

    return () => {
      map.off("click", handleMapClick);
      container.style.cursor = "";
    };
  }, [handleMapClick, isDrawing, isEditing]);

  // Update edit route layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing edit elements
    editLayerRef.current?.remove();
    editMarkersRef.current.forEach((m) => m.remove());
    editMarkersRef.current = [];

    if (isEditing && editPoints.length > 0) {
      // Add draggable markers for each point
      editPoints.forEach((point, index) => {
        const marker = L.marker([point.lat, point.lng], {
          draggable: true,
          icon: L.divIcon({
            className: "edit-marker",
            html: `<div style="background-color: ${index === 0 ? '#22c55e' : index === editPoints.length - 1 ? '#ef4444' : '#8b5cf6'}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: grab;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).addTo(map);

        marker.on("dragend", () => {
          const latlng = marker.getLatLng();
          onEditPointDrag?.(index, { lat: latlng.lat, lng: latlng.lng });
        });

        editMarkersRef.current.push(marker);
      });

      // Draw polyline
      if (editPoints.length > 1) {
        const coords: L.LatLngExpression[] = editPoints.map((p) => [p.lat, p.lng]);
        editLayerRef.current = L.polyline(coords, {
          color: "#8b5cf6",
          weight: 4,
          opacity: 0.9,
        }).addTo(map);
      }
    }
  }, [isEditing, editPoints, onEditPointDrag]);

  // Update drawn route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing drawn elements
    drawnLayerRef.current?.remove();
    drawnMarkersRef.current.forEach((m) => m.remove());
    drawnMarkersRef.current = [];

    if (drawnPoints.length > 0) {
      // Add markers for each point
      drawnPoints.forEach((point, index) => {
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: 8,
          fillColor: index === 0 ? "#22c55e" : index === drawnPoints.length - 1 ? "#ef4444" : "#3b82f6",
          color: "#fff",
          weight: 2,
          fillOpacity: 1,
        })
          .bindPopup(`Point ${index + 1}`)
          .addTo(map);
        drawnMarkersRef.current.push(marker);
      });

      // Draw polyline if more than one point
      if (drawnPoints.length > 1) {
        const coords: L.LatLngExpression[] = drawnPoints.map((p) => [p.lat, p.lng]);
        drawnLayerRef.current = L.polyline(coords, {
          color: "#8b5cf6",
          weight: 4,
          opacity: 0.8,
          dashArray: "10, 10",
        }).addTo(map);
      }
    }
  }, [drawnPoints]);

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

      // Draw outline first for selected route
      if (isSelected) {
        const outline = L.polyline(coordinates, {
          color: "#1e40af",
          weight: 8,
          opacity: 0.3,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        routeLayersRef.current.push(outline);
      }

      const polyline = L.polyline(coordinates, {
        color: isSelected ? "#3b82f6" : "#64748b",
        weight: isSelected ? 5 : 2,
        opacity: isSelected ? 1 : 0.5,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Add hover effect for non-selected routes
      if (!isSelected) {
        polyline.on("mouseover", () => {
          polyline.setStyle({ color: "#3b82f6", weight: 3, opacity: 0.8 });
        });
        polyline.on("mouseout", () => {
          polyline.setStyle({ color: "#64748b", weight: 2, opacity: 0.5 });
        });
      }

      routeLayersRef.current.push(polyline);
    });

    // Fit bounds to selected route or all routes
    if (selectedRoute && selectedRoute.geometry.coordinates.length > 0) {
      // Zoom to the selected route
      const bounds = L.latLngBounds([]);
      selectedRoute.geometry.coordinates.forEach(([lng, lat]) => {
        bounds.extend([lat, lng]);
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      }
    } else if (routes.length > 0) {
      // Fit bounds to all routes if no route is selected
      const bounds = L.latLngBounds([]);
      routes.forEach((route) => {
        route.geometry.coordinates.forEach(([lng, lat]) => {
          bounds.extend([lat, lng]);
        });
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
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
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
      {(isDrawing || isEditing) && (
        <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-card/95 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-sm border">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            {isEditing ? "Drag markers or click to add points" : "Click on the map to add points"}
          </div>
        </div>
      )}
    </div>
  );
}
