"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { createDeliveryPoint, updateDeliveryPoint, deleteDeliveryPoint } from "./actions";

const PointLocationPicker = dynamic(() => import("./PointLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-56 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400 font-bold">
      Chargement de la carte...
    </div>
  ),
});

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
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tournee, setTournee] = useState("Tournée Bastia");
  const [dayOfWeek, setDayOfWeek] = useState(2); // Mardi par défaut
  const [timeSlot, setTimeSlot] = useState("16h30 - 18h00");
  const [lat, setLat] = useState<number | null>(42.15);
  const [lng, setLng] = useState<number | null>(9.15);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setTournee("Tournée Bastia");
    setDayOfWeek(2);
    setTimeSlot("16h30 - 18h00");
    setLat(null);
    setLng(null);
    setEditingId(null);
    setIsOpen(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setLat(42.15);
    setLng(9.15);
    setIsOpen(true);
  };

  const handleStartEdit = (p: any) => {
    setEditingId(p.id);
    setName(p.name);
    setTournee(p.tournee || "Tournée Bastia");
    setDayOfWeek(p.dayOfWeek ?? 2);
    setTimeSlot(p.timeSlot || "16h30 - 18h00");
    setLat(p.lat);
    setLng(p.lng);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || lat === null || lng === null) {
      alert("Veuillez renseigner le nom et cliquer sur la carte pour positionner le lieu.");
      return;
    }
    setLoading(true);

    let res;
    if (editingId) {
      res = await updateDeliveryPoint(editingId, {
        name,
        tournee,
        lat,
        lng,
        dayOfWeek: Number(dayOfWeek),
        timeSlot,
      });
    } else {
      res = await createDeliveryPoint({
        name,
        tournee,
        lat,
        lng,
        dayOfWeek: Number(dayOfWeek),
        timeSlot,
      });
    }


    if (res.success) {
      resetForm();
      window.location.reload();
    } else {
      alert("Erreur lors de l'enregistrement : " + res.error);
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
          <p className="text-xs text-slate-500 mt-0.5">Ajoutez, modifiez ou repositionnez vos points de passage</p>
        </div>
        <button
          onClick={isOpen ? resetForm : handleStartAdd}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          {isOpen ? "Fermer le formulaire" : "+ Ajouter un village"}
        </button>
      </div>

      {/* Formulaire d'ajout ou de modification */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="bg-orange-50/60 p-5 rounded-2xl border border-orange-200 mb-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-sm text-slate-800">
              {editingId ? "✏️ Modifier le point de livraison" : "➕ Nouveau point de passage du camion"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nom du lieu / village</label>
              <input
                type="text"
                required
                placeholder="Ex: Bastia (Route royale)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tournée (Secteur)</label>
              <select
                value={tournee}
                onChange={(e) => setTournee(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-bold text-slate-800"
              >
                <option value="Tournée Bastia">🔵 Tournée Bastia</option>
                <option value="Tournée Balagne">🟢 Tournée Balagne</option>
              </select>
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
          </div>


          {/* Sélecteur de position sur carte */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Emplacement sur la carte (Cliquez directement pour positionner le camion 🚚)
            </label>
            <PointLocationPicker
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-orange-200 disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : editingId ? "Valider les modifications" : "Enregistrer ce point"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-white border border-slate-200 text-slate-600 font-bold px-5 py-3 rounded-xl text-sm hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des points existants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {points.map((p) => {
          const day = DAYS.find((d) => d.value === p.dayOfWeek)?.label || "Mardi";
          return (
            <div key={p.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-black text-slate-800 text-sm leading-tight">{p.name}</h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="text-slate-400 hover:text-orange-600 transition-colors p-1"
                      title="Modifier ce point"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Supprimer ce point"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      (p.tournee || "").includes("Balagne")
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}>
                      {p.tournee || "Tournée Bastia"}
                    </span>
                    <span className="text-xs font-bold text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-md inline-block">
                      🚚 {day} ({p.timeSlot || "Créneau"})
                    </span>
                  </div>
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
