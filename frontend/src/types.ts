export type Risk = {
    score: number;
    level: string;
    reasons: string[];
};
export type Checkpoint = {
    lat: number;
    lng: number;
    mile: number;
    eta: string;
    weather: {
        wind: number;
        rain: number;
        snow: number;
    };
    risk: Risk;
};
export type Route = {
    id: string;
    name: string;
    via: string;
    geometry: [
        number,
        number
    ][];
    checkpoints: Checkpoint[];
    summary: {
        risk_miles: number[];
        average_risk: number;
        duration_seconds: number;
        distance_miles: number;
        blocked: boolean;
        max_risk: number;
    };
};
export type Plan = {
    routes: Route[];
    recommended_id: string | null;
    origin: {
        name: string;
        lat: number;
        lng: number;
    };
    destination: {
        name: string;
        lat: number;
        lng: number;
    };
    corridor: {
        lat: number;
        lng: number;
        hours: number[];
    }[];
    forecast_start: string;
    source: string;
    generated_at: string;
};
export const levels = ['Low', 'Moderate', 'High', 'Severe', 'No Travel'];
export const colors = ['#22866b', '#c5a32a', '#e88938', '#d54c47', '#8b365e'];
export const duration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.round(seconds % 3600 / 60)}m`;
export const time = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
