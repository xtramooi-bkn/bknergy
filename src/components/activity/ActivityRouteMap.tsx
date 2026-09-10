import { normalizeRoutePoints, type RoutePoint, type RoutePointInput } from "@/src/lib/activities/routePoints";
export type { RoutePoint } from "@/src/lib/activities/routePoints";

export interface ActivityRouteMapProps {
  points?: readonly RoutePointInput[];
  startCoordinates?: RoutePointInput;
  endCoordinates?: RoutePointInput;
  isMock?: boolean;
}

/** Provider-independent route preview. Supply decoded GPS points from any provider. */
export default function ActivityRouteMap({ points, startCoordinates, endCoordinates, isMock = false }: ActivityRouteMapProps) {
  const route = normalizeRoutePoints(points);
  if (route.length < 2) return <div className="flex min-h-64 items-center justify-center bg-slate-50 text-sm text-slate-500">No route available</div>;
  const start = normalizeRoutePoints([startCoordinates])[0] ?? route[0];
  const end = normalizeRoutePoints([endCoordinates])[0] ?? route[route.length - 1];
  const bounds = [...route, start, end];
  const latitudes = bounds.map((p) => p.latitude);
  const longitudes = bounds.map((p) => p.longitude);
  const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const centerLon = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const longitudeScale = Math.max(0.01, Math.cos(centerLat * Math.PI / 180));
  const scale = Math.min(600 / Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * longitudeScale, 0.0001), 230 / Math.max(Math.max(...latitudes) - Math.min(...latitudes), 0.0001));
  const project = (point: RoutePoint) => ({ x: 400 + (point.longitude - centerLon) * longitudeScale * scale, y: 175 - (point.latitude - centerLat) * scale });
  const startPoint = project(start);
  const endPoint = project(end);
  return (
    <div className="relative overflow-hidden bg-[#edf2ed]">
      <svg viewBox="0 0 800 350" className="h-[260px] w-full sm:h-[310px]" preserveAspectRatio="xMidYMid slice" role="img" aria-label={isMock ? "Illustrative activity route with start and finish markers, not an actual GPS recording" : "Activity route with start and finish markers on a schematic background"}>
        <rect width="800" height="350" fill="#edf2ed" />
        <g fill="#e1e9e1" stroke="#d7e1d7" strokeWidth="1"><path d="M30 30h140v65H30zM220 0h140v50H220zM630 50h120v80H630zM30 230h140v95H30zM600 260h170v80H600z" /><path d="M275 110q90-80 180-20l110 105-125 93-190-80z" fill="#d7e7cc" /></g>
        <path d="M690-20Q610 90 680 170T650 380" fill="none" stroke="#c8e1e8" strokeWidth="50" />
        <g fill="none" stroke="#fff" strokeWidth="12"><path d="m0 110 800 100M185-20l55 390M480-20l95 400M0 285 800 30M0 30l800 290" /></g>
        <g fill="none" stroke="#d9e2d7" strokeWidth="2" strokeDasharray="5 6"><path d="M260 175q130-120 280 15M310 245l135-150" /></g>
        <g fill="#879a88" fontFamily="sans-serif" fontSize="10" letterSpacing="2"><text x="323" y="190">PARK LOOP</text><text x="46" y="72">GREEN QUARTER</text><text x="605" y="305">RIVERSIDE</text></g>
        <polyline points={route.map((p) => { const pos = project(p); return `${pos.x},${pos.y}`; }).join(" ")} fill="none" stroke="white" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={route.map((p) => { const pos = project(p); return `${pos.x},${pos.y}`; }).join(" ")} fill="none" stroke="#078576" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={startPoint.x} cy={startPoint.y} r="10" fill="#078576" stroke="white" strokeWidth="3" /><text x={startPoint.x} y={startPoint.y + 3} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">S</text>
        <circle cx={endPoint.x} cy={endPoint.y} r="10" fill="#233744" stroke="white" strokeWidth="3" /><text x={endPoint.x} y={endPoint.y + 3} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">F</text>
      </svg>
      <span className="absolute left-4 top-4 rounded-md border border-white bg-white/95 px-3 py-1.5 text-[11px] font-medium text-teal-800 shadow-sm">● Route available</span>
      <span className="absolute bottom-3 right-3 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-500">{isMock ? "Illustrative route · Mock data" : "Route preview · Schematic background"}</span>
    </div>
  );
}

