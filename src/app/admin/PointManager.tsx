"use client";
import { useState } from "react";
import { createDeliveryPoint, deleteDeliveryPoint } from "./actions";

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

export default function PointManager({ points }: { points: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(2); // Mardi par défaut
  const [timeSlot, setTimeSlot] = useState("16h30 - 18h00");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !lat || !lng) return;
    setLoading(true);

    const res = await createDeliveryPoint({
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      dayOfWeek: Number(dayOfWeek),
      timeSlot,
    });

    if (res.success) {
      setName("");
      setLat("");
      setLng("");
      setIsOpen(false);
      window.location.reload();
    } else {
      alert("Erreur lors de l'ajout : " + res.error);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, pointName: string) => {
    if (confirm(`Voulez-vous vraiment supprimer le point "${pointName}" ?`)) {
      await deleteDeliveryPoint(id);
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Points de livraison & Tournées</h2>
          <p className="text-xs text-slate-500 mt-0.5">Définissez vos villages, jours de passage et horaires</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          {isOpen ? "Fermer le formulaire" : "+ Ajouter un village"}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {isOpen && (
        <form onSubmit={handleAdd} className="bg-orange-50/60 p-5 rounded-2xl border border-orange-100 mb-6 space-y-4 animate-in fade-in duration-200">
          <h3 className="font-bold text-sm text-slate-800">Nouveau point de passage du camion</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nom du village / lieu</label>
              <input
                type="text"
                required
                placeholder="Ex: Corte (Place Paoli)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jour de passage</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    Tous les {d.label}s
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Horaires de présence</label>
              <input
                type="text"
                required
                placeholder="Ex: 16h30 - 18h00"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Latitude (GPS)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ex: 42.3094"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Longitude (GPS)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ex: 9.1490"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic bg-white/70 p-2.5 rounded-lg border border-orange-100">
            💡 <strong>Astuce GPS :</strong> Sur Google Maps (téléphone ou ordinateur), faites un clic droit ou un appui long sur votre emplacement : les 2 coordonnées s'affichent (ex: 42.3094, 9.1490).
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-orange-200 disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer ce point de tournée"}
          </button>
        </form>
      )}

      {/* Liste des points existants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {points.map((p) => {
          const day = DAYS.find((d) => d.value === p.dayOfWeek)?.label || "Mardi";
          return (
            <div key={p.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-black text-slate-800 text-sm leading-tight">{p.name}</h4>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-bold text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-md inline-block">
                    🚚 {day} ({p.timeSlot || "Créneau"})
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    GPS: {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
