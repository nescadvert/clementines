"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icône Leaflet
const customPin = L.divIcon({
  html: `<div style="background-color: #ea580c; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);"><span style="transform: rotate(45deg); font-size: 16px;">🚚</span></div>`,
  className: "custom-delivery-pin",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function PointLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialisation carte centrée sur la Corse
    const initialLat = lat || 42.15;
    const initialLng = lng || 9.15;
    const initialZoom = lat && lng ? 13 : 8;

    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // Si des coordonnées existent déjà, poser le marqueur
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: customPin, draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        onChange(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
      });
    }

    // Clic sur la carte pour placer/déplacer le marqueur
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      const roundedLat = Number(clickLat.toFixed(5));
      const roundedLng = Number(clickLng.toFixed(5));

      if (markerRef.current) {
        markerRef.current.setLatLng([roundedLat, roundedLng]);
      } else {
        markerRef.current = L.marker([roundedLat, roundedLng], {
          icon: customPin,
          draggable: true,
        }).addTo(map);

        markerRef.current.on("dragend", (ev: any) => {
          const pos = ev.target.getLatLng();
          onChange(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
        });
      }

      onChange(roundedLat, roundedLng);
    });

    // Invalider taille après affichage
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Recherche automatique d'adresse ou village
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;
    setSearching(true);

    try {
      // 1. Détection si l'utilisateur a collé des coordonnées "42.123, 9.456"
      const coordsMatch = searchQuery.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
      if (coordsMatch) {
        const foundLat = parseFloat(coordsMatch[1]);
        const foundLng = parseFloat(coordsMatch[2]);
        updatePosition(foundLat, foundLng, 14);
        setSearching(false);
        return;
      }

      // 2. Recherche par nom (commune, rue en Corse)
      const queryWithCorse = searchQuery.toLowerCase().includes("corse")
        ? searchQuery
        : `${searchQuery}, Corse, France`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          queryWithCorse
        )}&limit=1`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        updatePosition(foundLat, foundLng, 14);
      } else {
        alert("Lieu introuvable. Cliquez directement sur la carte pour placer le point !");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la recherche. Cliquez directement sur la carte.");
    } finally {
      setSearching(false);
    }
  };

  const updatePosition = (newLat: number, newLng: number, zoom: number) => {
    if (!mapRef.current) return;
    const roundedLat = Number(newLat.toFixed(5));
    const roundedLng = Number(newLng.toFixed(5));

    mapRef.current.setView([roundedLat, roundedLng], zoom);

    if (markerRef.current) {
      markerRef.current.setLatLng([roundedLat, roundedLng]);
    } else {
      markerRef.current = L.marker([roundedLat, roundedLng], {
        icon: customPin,
        draggable: true,
      }).addTo(mapRef.current);

      markerRef.current.on("dragend", (ev: any) => {
        const pos = ev.target.getLatLng();
        onChange(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
      });
    }

    onChange(roundedLat, roundedLng);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tapez un village ou collez un lien/coordonnées..."
          className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-orange-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          {searching ? "..." : "🔍 Trouver"}
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-56 rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0"
      />

      <p className="text-[11px] text-slate-500 flex justify-between items-center">
        <span>👉 <strong>Cliquez n'importe où sur la carte</strong> pour déplacer le camion.</span>
        {lat && lng && (
          <span className="font-mono text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded">
            GPS: {lat}, {lng}
          </span>
        )}
      </p>
    </div>
  );
}
