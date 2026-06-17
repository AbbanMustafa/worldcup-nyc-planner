import L, { type LatLngExpression, type Map as LeafletMapInstance } from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';

import 'leaflet/dist/leaflet.css';

import type { Spot } from '../data';

type RealMapProps = {
  spots: Spot[];
  selectedId: string;
  onSelect: (spotId: string) => void;
};

const nycCenter: LatLngExpression = [40.7282, -73.9942];

export default function RealMap({ spots, selectedId, onSelect }: RealMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const visibleSpotKey = useMemo(() => spots.map((spot) => spot.id).join('|'), [spots]);

  useEffect(() => {
    ensureMapStyles();

    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current, {
      center: nycCenter,
      zoom: 11,
      maxZoom: 19,
      minZoom: 9,
      zoomControl: false,
      scrollWheelZoom: true,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markerLayerRef.current;
    const map = mapRef.current;

    if (!layer || !map) {
      return;
    }

    layer.clearLayers();

    spots.forEach((spot) => {
      const selected = spot.id === selectedId;
      const marker = L.marker([spot.coordinates.latitude, spot.coordinates.longitude], {
        icon: createMarkerIcon(spot, selected),
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0
      });

      marker.bindPopup(
        `<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.neighborhood)} - ${escapeHtml(
          spot.borough
        )}<br><span>${escapeHtml(spot.nextWindow)}</span>`,
        { closeButton: false, offset: [0, -18] }
      );
      marker.on('click', () => onSelect(spot.id));
      marker.addTo(layer);

      if (selected) {
        marker.openPopup();
      }
    });
  }, [onSelect, selectedId, spots]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || spots.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(
      spots.map((spot) => [spot.coordinates.latitude, spot.coordinates.longitude])
    );
    map.fitBounds(bounds.pad(0.18), {
      animate: true,
      duration: 0.35,
      maxZoom: spots.length === 1 ? 14 : 12
    });
  }, [visibleSpotKey, spots]);

  useEffect(() => {
    const map = mapRef.current;
    const selectedSpot = spots.find((spot) => spot.id === selectedId);

    if (!map || !selectedSpot) {
      return;
    }

    map.panTo([selectedSpot.coordinates.latitude, selectedSpot.coordinates.longitude], {
      animate: true,
      duration: 0.28
    });
  }, [selectedId, spots]);

  return <div ref={mapElementRef} className="wc-real-map" role="application" aria-label="NYC World Cup map" />;
}

function createMarkerIcon(spot: Spot, selected: boolean) {
  const label = escapeHtml(spot.neighborhood);
  const kind = spot.kind === 'culture' ? 'Explore' : spot.kind === 'final' ? 'Final' : 'Watch';

  return L.divIcon({
    className: 'wc-leaflet-marker-shell',
    html: `
      <div class="wc-leaflet-marker ${selected ? 'is-selected' : ''}" style="--pin-color: ${spot.accent}">
        <div class="wc-leaflet-label">
          <span>${label}</span>
          <em>${kind}</em>
        </div>
        <div class="wc-leaflet-pin"><span></span></div>
      </div>
    `,
    iconAnchor: [70, 52],
    iconSize: [140, 58],
    popupAnchor: [0, -46]
  });
}

function ensureMapStyles() {
  if (document.getElementById('worldcup-leaflet-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'worldcup-leaflet-styles';
  style.textContent = `
    .wc-real-map {
      width: 100%;
      height: 100%;
      min-height: 430px;
      background: #d8edf0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .wc-real-map .leaflet-container,
    .wc-real-map.leaflet-container {
      width: 100%;
      height: 100%;
      min-height: 430px;
      font: inherit;
    }
    .wc-real-map .leaflet-control-zoom {
      border: 0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
    }
    .wc-real-map .leaflet-control-zoom a {
      color: #1f1f1f;
      border: 0;
      width: 34px;
      height: 34px;
      line-height: 34px;
    }
    .wc-real-map .leaflet-control-attribution {
      border-radius: 999px;
      padding: 3px 8px;
      color: #555;
      background: rgba(255, 255, 255, 0.86);
      font-size: 10px;
    }
    .wc-leaflet-marker-shell {
      background: transparent;
      border: 0;
    }
    .wc-leaflet-marker {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
      pointer-events: auto;
      transform: translateY(2px);
      transition: transform 140ms ease;
    }
    .wc-leaflet-marker.is-selected {
      transform: translateY(-5px);
    }
    .wc-leaflet-label {
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 999px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      color: #1f1f1f;
      display: flex;
      gap: 6px;
      max-width: 138px;
      padding: 6px 9px;
      white-space: nowrap;
    }
    .wc-leaflet-marker.is-selected .wc-leaflet-label {
      border-color: var(--pin-color);
      color: var(--pin-color);
      transform: scale(1.04);
    }
    .wc-leaflet-label span {
      display: block;
      font-size: 11px;
      font-weight: 900;
      max-width: 82px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wc-leaflet-label em {
      background: #f7f7f7;
      border-radius: 999px;
      color: #717171;
      display: block;
      font-size: 8px;
      font-style: normal;
      font-weight: 900;
      padding: 3px 5px;
      text-transform: uppercase;
    }
    .wc-leaflet-pin {
      align-items: center;
      background: var(--pin-color);
      border: 3px solid #ffffff;
      border-radius: 50% 50% 50% 8px;
      box-shadow: 0 9px 22px rgba(0, 0, 0, 0.28);
      display: flex;
      height: 28px;
      justify-content: center;
      transform: rotate(-45deg);
      width: 28px;
    }
    .wc-leaflet-marker.is-selected .wc-leaflet-pin {
      height: 34px;
      width: 34px;
    }
    .wc-leaflet-pin span {
      background: #ffffff;
      border-radius: 999px;
      display: block;
      height: 8px;
      transform: rotate(45deg);
      width: 8px;
    }
    .wc-real-map .leaflet-popup-content-wrapper {
      border-radius: 14px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
    }
    .wc-real-map .leaflet-popup-content {
      color: #1f1f1f;
      font-size: 12px;
      line-height: 17px;
      margin: 10px 12px;
    }
    .wc-real-map .leaflet-popup-content strong {
      font-size: 13px;
    }
    .wc-real-map .leaflet-popup-content span {
      color: #717171;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
