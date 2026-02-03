import type { GlobalParams, TransportEdge, TransportNode, TransportRoute, TransportTotals, TransportLeg } from "@/types";

export type PathCriteria = "cost" | "time" | "weighted";

interface EdgeMetrics {
  cost: number;
  time_days: number;
}

const computeEdgeMetrics = (edge: TransportEdge, globalParams: GlobalParams): EdgeMetrics => {
  const defaults = edge.mode === "road" ? globalParams.road : globalParams.sea;
  const costPerKm = edge.overrides?.cost_per_km ?? defaults.cost_per_km ?? 0;
  const speed = edge.overrides?.avg_speed_kmph ?? defaults.avg_speed_kmph ?? 1;
  const fixed = edge.overrides?.fixed_fee ?? defaults.fixed_fee ?? 0;
  const dwell = edge.overrides?.dwell_hours ?? defaults.dwell_hours ?? 0;
  const cost = fixed + edge.distance_km * costPerKm;
  const time_days = dwell / 24 + edge.distance_km / speed / 24;
  return { cost, time_days };
};

export const findBestPath = (
  nodes: TransportNode[],
  edges: TransportEdge[],
  startId: string,
  endId: string,
  criteria: PathCriteria,
  globalParams: GlobalParams,
  alpha = 0.6
): TransportRoute | null => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  if (!nodeMap.has(startId) || !nodeMap.has(endId)) {
    return null;
  }

  const edgeMetrics = new Map(edges.map((edge) => [edge.id, computeEdgeMetrics(edge, globalParams)]));
  const maxCost = Math.max(...edges.map((edge) => edgeMetrics.get(edge.id)?.cost ?? 0), 1);
  const maxTime = Math.max(...edges.map((edge) => edgeMetrics.get(edge.id)?.time_days ?? 0), 1);

  const adjacency = new Map<string, TransportEdge[]>();
  edges.forEach((edge) => {
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge);
    adjacency.set(edge.from, list);
  });

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const previousEdge = new Map<string, TransportEdge | null>();
  nodes.forEach((node) => {
    distances.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
    previousEdge.set(node.id, null);
  });
  distances.set(startId, 0);

  const unvisited = new Set(nodes.map((node) => node.id));

  const costForEdge = (edge: TransportEdge): number => {
    const metrics = edgeMetrics.get(edge.id);
    if (!metrics) return 0;
    if (criteria === "cost") return metrics.cost;
    if (criteria === "time") return metrics.time_days;
    const costNorm = metrics.cost / maxCost;
    const timeNorm = metrics.time_days / maxTime;
    return alpha * costNorm + (1 - alpha) * timeNorm;
  };

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Number.POSITIVE_INFINITY;
    unvisited.forEach((nodeId) => {
      const dist = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (dist < minDistance) {
        minDistance = dist;
        current = nodeId;
      }
    });

    if (!current || current === endId) break;
    unvisited.delete(current);

    const currentId = current;
    const neighbors = adjacency.get(currentId) ?? [];
    neighbors.forEach((edge) => {
      const alt = (distances.get(currentId) ?? 0) + costForEdge(edge);
      if (alt < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
        previousEdge.set(edge.to, edge);
      }
    });
  }

  if (!previous.get(endId)) {
    return null;
  }

  const pathNodes: TransportNode[] = [];
  const pathEdges: TransportLeg[] = [];

  let current: string | null = endId;
  while (current) {
    const node = nodeMap.get(current);
    if (node) pathNodes.unshift(node);
    const edge = previousEdge.get(current);
    if (edge) {
      const metrics = edgeMetrics.get(edge.id);
      pathEdges.unshift({
        edgeId: edge.id,
        from: edge.from,
        to: edge.to,
        mode: edge.mode,
        distance_km: edge.distance_km,
        cost: metrics?.cost ?? 0,
        time_days: metrics?.time_days ?? 0
      });
    }
    current = previous.get(current) ?? null;
  }

  const totals: TransportTotals = {
    total_cost: pathEdges.reduce((sum, edge) => sum + edge.cost, 0),
    total_time_days: pathEdges.reduce((sum, edge) => sum + edge.time_days, 0)
  };

  return {
    nodes: pathNodes,
    edges: pathEdges,
    totals
  };
};
