import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Map as MapIcon } from 'lucide-react';
import { getAllVisits } from '../db/database';
import type { HouseholdVisit } from '../types/survey';
import {
  MARKER_COLORS,
  VISIT_STATUS_LABELS,
  HOUSEHOLD_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
} from '../types/survey';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

function FitBounds({ visits }: { visits: HouseholdVisit[] }) {
  const map = useMap();

  useEffect(() => {
    if (visits.length > 0) {
      const bounds = L.latLngBounds(
        visits.map(v => [v.geoLocation.latitude, v.geoLocation.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [visits, map]);

  return null;
}

interface MapViewProps {
  refreshTrigger: number;
}

export function MapView({ refreshTrigger }: MapViewProps) {
  const [visits, setVisits] = useState<HouseholdVisit[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVisits();
  }, [refreshTrigger]);

  const loadVisits = async () => {
    const data = await getAllVisits();
    setVisits(data);
  };

  const filteredVisits = filter === 'all'
    ? visits
    : visits.filter(v => v.visitStatus === filter);

  const defaultCenter: [number, number] = visits.length > 0
    ? [visits[0].geoLocation.latitude, visits[0].geoLocation.longitude]
    : [20.5937, 78.9629];

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="p-2.5 bg-white border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Filter:</span>
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
          }`}
        >
          All ({visits.length})
        </button>
        {Object.entries(VISIT_STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filter === key ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: filter === key ? 'white' : MARKER_COLORS[key as keyof typeof MARKER_COLORS] }}
            />
            {label} ({visits.filter(v => v.visitStatus === key).length})
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 relative" ref={mapRef} id="map-container">
        {visits.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapIcon size={24} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-700">No visits recorded yet</p>
              <p className="text-sm text-gray-500 mt-1">Complete a survey to see markers here</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds visits={filteredVisits} />
            {filteredVisits.map(visit => (
              <Marker
                key={visit.id}
                position={[visit.geoLocation.latitude, visit.geoLocation.longitude]}
                icon={createColoredIcon(visit.markerColor)}
              >
                <Popup>
                  <div className="text-xs min-w-48 leading-relaxed">
                    <h3 className="font-bold text-sm mb-1 text-gray-800">{visit.headName}</h3>
                    <p className="text-gray-500">{visit.address}</p>
                    <hr className="my-1.5 border-gray-200" />
                    <p><span className="text-gray-500">ID:</span> {visit.householdId}</p>
                    <p><span className="text-gray-500">Members:</span> {visit.totalMembers}</p>
                    <p><span className="text-gray-500">Type:</span> {HOUSEHOLD_TYPE_LABELS[visit.householdType]}</p>
                    <p><span className="text-gray-500">Structure:</span> {STRUCTURE_TYPE_LABELS[visit.structureType]}</p>
                    <p><span className="text-gray-500">Status:</span> {VISIT_STATUS_LABELS[visit.visitStatus]}</p>
                    <p><span className="text-gray-500">Surveyor:</span> {visit.surveyorName}</p>
                    <p className="text-gray-400 mt-1.5 text-[10px]">{new Date(visit.createdAt).toLocaleString()}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="py-2 px-4 bg-white border-t border-gray-200 flex items-center justify-center gap-5">
        {Object.entries(MARKER_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-600">{VISIT_STATUS_LABELS[status as keyof typeof VISIT_STATUS_LABELS]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export ref for PDF generation
export function getMapElement(): HTMLElement | null {
  return document.getElementById('map-container');
}
