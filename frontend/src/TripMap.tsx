import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { colors, time, type Plan } from './types';
import 'leaflet/dist/leaflet.css';
function Fit({ plan }: {
    plan: Plan;
}) {
    const map = useMap();
    useEffect(() => {
        const fit = () => map.fitBounds(L.latLngBounds(plan.routes.flatMap(r => r.geometry.map(([lng, lat]) => L.latLng(lat, lng)))), { padding: [35, 35] });
        fit();
        map.on('resize', fit);
        return () => { map.off('resize', fit); };
    }, [map, plan]);
    return null;
}
function ForecastHeat({ cells, hour }: {
    cells: Plan['corridor'];
    hour: number;
}) {
    const map = useMap();
    useEffect(() => {
        const pane = map.getPane('weather-heat') || map.createPane('weather-heat');
        pane.style.zIndex = '350';
        pane.style.pointerEvents = 'none';
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.pointerEvents = 'none';
        pane.appendChild(canvas);
        function draw() {
            const size = map.getSize();
            const ratio = window.devicePixelRatio || 1;
            canvas.width = size.x * ratio;
            canvas.height = size.y * ratio;
            canvas.style.width = `${size.x}px`;
            canvas.style.height = `${size.y}px`;
            L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
            const ctx = canvas.getContext('2d')!;
            ctx.scale(ratio, ratio);
            for (const p of cells) {
                const center = map.latLngToContainerPoint([p.lat, p.lng]);
                const edge = map.latLngToContainerPoint([p.lat + .32, p.lng]);
                const radius = Math.max(24, center.distanceTo(edge));
                const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
                gradient.addColorStop(0, `${colors[p.hours[hour]]}70`);
                gradient.addColorStop(.45, `${colors[p.hours[hour]]}38`);
                gradient.addColorStop(1, `${colors[p.hours[hour]]}00`);
                ctx.fillStyle = gradient;
                ctx.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
            }
        }
        draw();
        map.on('moveend zoomend resize', draw);
        return () => { map.off('moveend zoomend resize', draw); canvas.remove(); };
    }, [map, cells, hour]);
    return null;
}
export default function TripMap({ plan, selected, onSelect, hour, heat, points }: {
    plan: Plan;
    selected: string;
    onSelect: (id: string) => void;
    hour: number;
    heat: boolean;
    points: boolean;
}) {
    const route = plan.routes.find(r => r.id === selected)!;
    return <MapContainer center={[40, -87]} zoom={6} className="trip-map" scrollWheelZoom={true} preferCanvas>
    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'/>
    <Fit plan={plan}/>
    {heat && <ForecastHeat cells={plan.corridor} hour={hour}/>}
    {[...plan.routes].sort((a, b) => Number(a.id === selected) - Number(b.id === selected)).map(r => <Polyline key={r.id} positions={r.geometry.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: r.id === selected ? '#146e60' : '#7e8e9f', weight: r.id === selected ? 6 : 4, opacity: r.id === selected ? 1 : .65 }} eventHandlers={{ click: () => onSelect(r.id) }}><Popup>{r.name}</Popup></Polyline>)}
    {points && route.checkpoints.map((p, i) => <CircleMarker key={`${selected}-${i}`} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: 'white', weight: 2, fillColor: colors[p.risk.score], fillOpacity: 1 }}><Popup><strong>Checkpoint {i + 1} · {p.risk.level}</strong><br />Mile {Math.round(p.mile)} · {time(p.eta)}<br />Wind {p.weather.wind.toFixed(1)} mph<br />Rain {p.weather.rain.toFixed(2)} in/hr · Snow {p.weather.snow.toFixed(2)} in/hr</Popup></CircleMarker>)}
    {[plan.origin, plan.destination].map((p, i) => <CircleMarker key={i} center={[p.lat, p.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#123c35', fillOpacity: 1 }}><Popup><strong>{i ? 'Destination' : 'Origin'}</strong><br />{p.name}</Popup></CircleMarker>)}
  </MapContainer>;
}
