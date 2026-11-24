import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigation, Route as RouteIcon, ShieldCheck, Wind, CloudRain, Snowflake, MapPin, ArrowDownUp, Clock3, Weight, Layers, Play, Pause, Info, LoaderCircle, TriangleAlert, Check } from 'lucide-react';
import TripMap from './TripMap';
import sample from './sample.json';
import { colors, levels, duration, time, type Plan } from './types';
import './styles.css';
const initialDate = () => { const d = new Date(Date.now() + 3600000); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
function App() {
    const [plan, setPlan] = useState<Plan>(sample as Plan);
    const [selected, setSelected] = useState('0');
    const [origin, setOrigin] = useState('Chicago');
    const [destination, setDestination] = useState('Columbus');
    const [departure, setDeparture] = useState(initialDate);
    const [load, setLoad] = useState(32000);
    const [spacing, setSpacing] = useState(25);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hour, setHour] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [heat, setHeat] = useState(true);
    const [points, setPoints] = useState(true);
    const [method, setMethod] = useState(false);
    const [submitted, setSubmitted] = useState<{
        load: number;
        spacing: number;
        origin: string;
        destination: string;
        departure: string;
    } | null>(null);
    useEffect(() => {
        if (!method)
            return;
        const previous = document.activeElement as HTMLElement;
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape')
                setMethod(false);
            if (event.key === 'Tab') {
                const buttons = document.querySelectorAll<HTMLButtonElement>('.modal button');
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
                else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', handler);
        return () => { document.removeEventListener('keydown', handler); previous?.focus(); };
    }, [method]);
    useEffect(() => { if (!playing)
        return; const id = window.setInterval(() => setHour(h => (h + 1) % 49), 600); return () => clearInterval(id); }, [playing]);
    const route = plan.routes.find(r => r.id === selected) || plan.routes[0];
    const isSample = plan.source === 'sample';
    const dirty = submitted && (submitted.load !== load || submitted.spacing !== spacing || submitted.origin !== origin || submitted.destination !== destination || submitted.departure !== departure);
    async function calculate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setPlaying(false);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/plan/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin, destination, departure: new Date(departure).toISOString(), load, spacing }), signal: AbortSignal.timeout(180000) });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error || 'Could not plan this trip.');
            setPlan(data);
            setSelected(data.recommended_id || data.routes[0].id);
            setHour(0);
            setSubmitted({ load, spacing, origin, destination, departure });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed. Please retry.');
        }
        finally {
            setLoading(false);
        }
    }
    function showSample() { setPlan(sample as Plan); setSelected('0'); setHour(0); setSubmitted(null); setError(''); setPlaying(false); }
    return <><header className="topbar"><a href="/" className="brand"><span className="brand-icon"><Navigation size={23} fill="currentColor"/></span>waypoint<span className="brand-divider"/> <span className="brand-caption">A clearer road ahead.</span></a><div className="header-right"><span className="assessment">SPOTTER ASSESSMENT</span><button className="text-button" onClick={() => setMethod(true)}><Info size={16}/> How it works</button><div className="avatar">MB</div></div></header>
    <main><div className="page-heading"><div><div className="eyebrow">WEATHER-AWARE DISPATCH</div><h1>Every mile. A little more informed.</h1><p>Compare your routes. Understand the weather. Choose a better way forward.</p></div><div className="mode-badge"><span className={isSample ? 'sample-dot' : 'live-dot'}/>{isSample ? 'Sample trip' : 'Live forecast'}</div></div>
    <div className="workspace"><aside className="sidebar"><section className="panel trip-form"><div className="section-heading"><h2><RouteIcon size={19}/> Plan your trip</h2><span className="small-label">01 / TRIP DETAILS</span></div><form onSubmit={calculate}>
      <div className="locations"><label htmlFor="origin">Origin</label><div className="input-icon"><MapPin size={17}/><input id="origin" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Departure city" required minLength={2} maxLength={120}/></div><button type="button" className="swap" aria-label="Swap origin and destination" onClick={() => { setOrigin(destination); setDestination(origin); }}><ArrowDownUp size={15}/></button><label htmlFor="destination">Destination</label><div className="input-icon"><MapPin size={17}/><input id="destination" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Arrival city" required minLength={2} maxLength={120}/></div></div>
      <label htmlFor="departure">Departure <span>your local time</span></label><input type="datetime-local" id="departure" value={departure} onChange={e => setDeparture(e.target.value)} required/>
      <label htmlFor="load">Load weight</label><div className="input-icon"><Weight size={17}/><input id="load" type="number" min="0" max="80000" step="100" value={load} onChange={e => setLoad(Number(e.target.value))} required/><span className="unit">lb</span></div>
      <label>Weather checkpoints <span>every</span></label><div className="segmented" role="group" aria-label="Weather checkpoint spacing">{[10, 25, 50].map(n => <button type="button" key={n} aria-pressed={spacing === n} className={spacing === n ? 'active' : ''} onClick={() => setSpacing(n)}>{n} miles</button>)}</div>
      <button className="primary-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18}/> : <Navigation size={18}/>}{loading ? 'Checking routes & weather…' : 'Find the best route'}</button><p className="form-note"><ShieldCheck size={14}/> Load-aware risk at your estimated arrival.</p>
    </form>{error && <div className="error" role="alert"><TriangleAlert size={18}/><div>{error}<button onClick={showSample}>Explore the sample trip</button></div></div>}</section>
    <section className="route-list" aria-label="Route options"><div className="section-heading"><h2>Route options <span className="count">3</span></h2><span className="small-label">{isSample ? 'SAMPLE RESULTS' : 'LIVE RESULTS'}</span></div>{plan.routes.map((r, i) => <button key={r.id} className={`route-card ${selected === r.id ? 'selected' : ''}`} onClick={() => setSelected(r.id)} aria-pressed={selected === r.id}><div className="route-top"><span className="route-number">{String(i + 1).padStart(2, '0')}</span><strong>{r.name}</strong>{selected === r.id && <span className="selected-check"><Check size={13}/></span>}</div><p className="route-via">{r.via}</p><div className="route-meta"><span><Clock3 size={14}/>{duration(r.summary.duration_seconds)}</span><span>{Math.round(r.summary.distance_miles)} mi</span><span>{r.checkpoints.length} checkpoints</span></div><div className="risk-bar" role="img" aria-label={r.summary.risk_miles.map((m, j) => `${levels[j]}: ${m.toFixed(1)} miles`).join(", ")}>{r.summary.risk_miles.map((m, j) => m > 0 && <span key={j} title={`${levels[j]}: ${m.toFixed(1)} miles`} style={{ width: `${m / r.summary.distance_miles * 100}%`, background: colors[j] }}/>)}</div><div className="route-bottom">{plan.recommended_id === r.id ? <span className="recommended"><ShieldCheck size={14}/> Recommended</span> : <span style={{ color: colors[r.summary.max_risk] }}>{r.summary.blocked ? 'No Travel exposure' : `${levels[r.summary.max_risk]} peak risk`}</span>}<span>{Math.round(r.summary.risk_miles[2] + r.summary.risk_miles[3] + r.summary.risk_miles[4])} elevated-risk mi</span></div></button>)}<p className="footnote">ETAs exclude driving breaks and live traffic.</p></section></aside>
    <div className="main-column"><section className="map-panel panel"><div className="map-heading"><div><h2>{plan.origin.name.split(',')[0]} <span className="route-dash">/</span> {plan.destination.name.split(',')[0]}</h2><p>{isSample ? 'Illustrative weather · 32,000 lb load · 25-mile sampling' : `Calculated for ${submitted?.load.toLocaleString()} lb · ${submitted?.spacing}-mile sampling`}</p></div><div className="map-controls"><button className={heat ? 'enabled' : ''} aria-pressed={heat} onClick={() => setHeat(!heat)}><Layers size={15}/> Weather</button><button className={points ? 'enabled' : ''} aria-pressed={points} onClick={() => setPoints(!points)}>Checkpoints</button></div></div><div className="map-wrap"><TripMap plan={plan} selected={selected} onSelect={setSelected} hour={hour} heat={heat} points={points}/>{isSample && <div className="map-label"><span className="sample-dot"/> SAMPLE TRIP · NOT A LIVE FORECAST</div>}{loading && <div className="map-loading"><LoaderCircle size={24} className="spin"/><strong>Looking down the road…</strong><span>Finding alternatives and sampling arrival-time weather.</span></div>}</div><div className="forecast"><div className="forecast-heading"><h3><CloudRain size={17}/> Corridor forecast</h3><span>{time(new Date(new Date(plan.forecast_start).getTime() + hour * 3600000).toISOString())} <strong>+{hour}h</strong></span></div><div className="slider-row"><button aria-label={playing ? 'Pause forecast' : 'Play forecast'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button><div className="slider-track"><input aria-label="Forecast hour" type="range" min="0" max="48" value={hour} onChange={e => { setHour(Number(e.target.value)); setPlaying(false); }}/><div className="slider-labels"><span>Now</span><span>12h</span><span>24h</span><span>36h</span><span>48h</span></div></div></div><div className="map-legend">{levels.map((l, i) => <span key={l}><i style={{ background: colors[i] }}/>{l}</span>)}<span className="legend-note">Route risks use arrival-time weather</span></div></div></section>
    <section className={`recommendation ${plan.recommended_id === null ? 'blocked' : ''}`}><div className="recommendation-icon">{plan.recommended_id === null ? <TriangleAlert size={23}/> : <ShieldCheck size={23}/>}</div><div><h3>{plan.recommended_id === null ? 'No recommended route for this departure' : `${plan.routes.find(r => r.id === plan.recommended_id)?.name} is your best option`}</h3><p>{plan.recommended_id === null ? 'Every route has No Travel exposure. Try a different departure time.' : 'Prioritized by severe miles, high miles, average weather risk, then travel time.'}{dirty && ' Inputs changed — recalculate to update these results.'}</p></div><button className="text-button" onClick={() => setMethod(true)}>Why this route? <Info size={15}/></button></section>
    <section className="panel checkpoints"><div className="section-heading"><div><h2>Weather along the way</h2><p>{route.name} · Forecast at each checkpoint’s ETA</p></div><span className="small-label">{route.checkpoints.length} CHECKPOINTS</span></div><div className="table-scroll"><table><thead><tr><th>Checkpoint</th><th>Arrival · local</th><th><Wind size={14}/> Wind</th><th><CloudRain size={14}/> Rain</th><th><Snowflake size={14}/> Snow</th><th>Risk level</th></tr></thead><tbody>{route.checkpoints.map((p, i) => <tr key={i}><td><span className="checkpoint-number">{String(i + 1).padStart(2, '0')}</span>{i === 0 ? 'Origin' : i === route.checkpoints.length - 1 ? 'Destination' : `Mile ${Math.round(p.mile)}`}</td><td>{time(p.eta)}</td><td>{p.weather.wind.toFixed(0)} <small>mph</small></td><td>{p.weather.rain.toFixed(2)} <small>in/hr</small></td><td>{p.weather.snow.toFixed(2)} <small>in/hr</small></td><td><span className="risk-pill" style={{ color: colors[p.risk.score], background: `${colors[p.risk.score]}12` }}>{p.risk.level}</span></td></tr>)}</tbody></table></div></section></div></div>
    <footer><span><Navigation size={14}/> WAYPOINT <span className="footer-divider">/</span> Built for the road ahead.</span><span>OSRM road routes · Open-Meteo weather · Assessment prototype</span></footer></main>
    {method && <div className="modal-backdrop" onClick={() => setMethod(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="method-title" onClick={e => e.stopPropagation()}><button className="modal-close" autoFocus onClick={() => setMethod(false)}>Close</button><div className="eyebrow">THE RECOMMENDATION, EXPLAINED</div><h2 id="method-title">Weather first. Then travel time.</h2><p>Routes with No Travel exposure are excluded. Remaining routes are ordered by fewest Severe miles, then fewest High miles, lowest distance-weighted average risk, and shortest driving time.</p><h3>Load changes the decision</h3><p>Wind ≥55 mph means No Travel. Wind ≥45 mph with more than 30,000 lb also means No Travel. Wind ≥35 mph with more than 40,000 lb raises risk to at least Severe.</p><h3>What the map shows</h3><p>Checkpoints use weather at their estimated arrival time. The 0–48h layer shows sampled corridor conditions from the current forecast hour; moving it does not change trip recommendations.</p><h3>Understand the limits</h3><p>This assessment uses a general driving profile, not truck-certified roads. ETAs exclude breaks, traffic, and hours-of-service rules. Weather cells are a coarse forecast overlay, not live radar. Always verify road restrictions and official advisories.</p><p>Ambiguous threshold boundaries use the higher risk band. Segment exposure uses the worse of its two checkpoints.</p><button className="primary-button" onClick={() => setMethod(false)}>Got it</button></section></div>}
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
