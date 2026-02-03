"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const MapView = () => {
  const {
    nodes,
    edges,
    selectionMode,
    setStartNodeId,
    setEndNodeId,
    simulationResult
  } = useAppStore();

  const routeEdges = simulationResult.route?.edges ?? [];
  const routeEdgeIds = new Set(routeEdges.map((edge) => edge.edgeId));

  const polylines = useMemo(() => {
    return edges.map((edge) => {
      const from = nodes.find((node) => node.id === edge.from);
      const to = nodes.find((node) => node.id === edge.to);
      if (!from || !to) return null;
      return {
        id: edge.id,
        positions: [
          [from.lat, from.lng],
          [to.lat, to.lng]
        ] as [number, number][],
        isRoute: routeEdgeIds.has(edge.id),
        mode: edge.mode
      };
    });
  }, [edges, nodes, routeEdgeIds]);

  return (
    <div className="h-full w-full">
      <MapContainer center={[24.5, 52.5]} zoom={5} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polylines.map((line) =>
          line ? (
            <Polyline
              key={line.id}
              positions={line.positions}
              pathOptions={{ color: line.isRoute ? "#2563eb" : line.mode === "sea" ? "#0ea5e9" : "#16a34a", weight: line.isRoute ? 4 : 2 }}
            />
          ) : null
        )}
        {nodes.map((node) => (
          <Marker
            key={node.id}
            position={[node.lat, node.lng]}
            icon={defaultIcon}
            eventHandlers={{
              click: () => {
                if (selectionMode === "start") {
                  setStartNodeId(node.id);
                } else {
                  setEndNodeId(node.id);
                }
              }
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{node.label}</div>
                <div className="text-slate-600">{node.type}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
