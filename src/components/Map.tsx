"use client";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useState } from 'react';

// Fix leaflet default icons in nextjs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Point {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dayOfWeek?: number;
  timeSlot?: string;
}

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

// Composant React injecté dans la bulle Leaflet
function PopupContent({ point, products, onValidate }: { point: Point, products: Product[], onValidate: (cart: Record<string, number>) => void }) {
  const [cart, setCart] = useState<Record<string, number>>({});

  const dayName = point.dayOfWeek !== undefined ? DAYS_FR[point.dayOfWeek] : "";

  const updateCart = (productId: string, delta: number) => {
    setCart(prev => {
      const next = Math.max(0, (prev[productId] || 0) + delta);
      return { ...prev, [productId]: next };
    });
  };

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(prod => prod.id === id);
    return sum + (p?.price || 0) * qty;
  }, 0);

  return (
    <div className="font-sans min-w-[210px] p-1">
      <div className="mb-2 pb-2 border-b border-slate-100">
        <strong className="text-base text-slate-800 block leading-tight">{point.name}</strong>
        {dayName && (
          <span className="inline-flex items-center gap-1 mt-1 bg-amber-50 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
            🚚 Tous les {dayName}s ({point.timeSlot || "Créneau à définir"})
          </span>
        )}
      </div>
      
      <div className="space-y-1 mb-3 max-h-[40vh] overflow-y-auto pr-1">
        {products.map(p => {
          const qty = cart[p.id] || 0;
          return (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-sm text-slate-800 leading-tight">{p.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-orange-600 text-xs">{p.price}€</span>
                  {p.description && (
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-tight font-medium truncate">
                      {p.description}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button 
                  onClick={() => updateCart(p.id, -1)} 
                  className="w-7 h-7 flex items-center justify-center bg-slate-100 rounded text-slate-600 font-bold active:bg-slate-200"
                >-</button>
                <span className="w-3 text-center font-black text-slate-800 text-sm">{qty}</span>
                <button 
                  onClick={() => updateCart(p.id, 1)} 
                  className="w-7 h-7 flex items-center justify-center bg-orange-100 text-orange-700 rounded font-bold active:bg-orange-200"
                >+</button>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => onValidate(cart)}
        disabled={total === 0}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm text-sm"
      >
        {total > 0 ? `Valider (${total}€)` : "Choisissez un produit"}
      </button>
    </div>
  );
}

export default function MapComponent({ points, products, onSelect }: { points: Point[], products: Product[], onSelect: (id: string, cart: Record<string, number>) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const rootsRef = useRef<Map<string, Root>>(new Map());

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current).setView([42.0396, 9.0129], 8);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;
    
    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    points.forEach((p) => {
      const marker = L.marker([p.lat, p.lng]).addTo(map);
      
      // Create an empty container for the popup
      const popupContainer = document.createElement('div');
      marker.bindPopup(popupContainer, { minWidth: 220, className: 'custom-popup' });
      
      marker.on('popupopen', () => {
        let root = rootsRef.current.get(p.id);
        if (!root) {
          root = createRoot(popupContainer);
          rootsRef.current.set(p.id, root);
        }
        
        root.render(
          <PopupContent 
            point={p} 
            products={products} 
            onValidate={(cart) => {
              marker.closePopup();
              onSelect(p.id, cart);
            }} 
          />
        );
      });
      
      marker.on('popupclose', () => {
        // Optionnel : on pourrait démonter le root ici, mais le garder permet de conserver l'état (le panier) si on rouvre la bulle.
      });
    });

    return () => {
      // Cleanup asynchrone pour éviter l'erreur React "synchronously unmount a root"
      const rootsToUnmount = Array.from(rootsRef.current.values());
      rootsRef.current.clear();
      
      setTimeout(() => {
        rootsToUnmount.forEach(root => root.unmount());
      }, 0);
      
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [points, products, onSelect]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-popup .leaflet-popup-content-wrapper { border-radius: 1rem; padding: 0.5rem; }
        .custom-popup .leaflet-popup-content { margin: 0; }
      `}} />
      <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }} />
    </>
  );
}
