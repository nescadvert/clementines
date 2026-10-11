"use client";
import { useState } from "react";
import { createProduct, deleteProduct } from "./actions";

export default function ProductManager({ products }: { products: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    setLoading(true);

    const res = await createProduct({
      name,
      description,
      price: parseFloat(price),
    });

    if (res.success) {
      setName("");
      setDescription("");
      setPrice("");
      setIsOpen(false);
      window.location.reload();
    } else {
      alert("Erreur lors de l'ajout : " + res.error);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (confirm(`Voulez-vous supprimer le produit "${prodName}" ?`)) {
      await deleteProduct(id);
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Vos Produits & Tarifs</h2>
          <p className="text-xs text-slate-500 mt-0.5">Gérez vos cagettes, sacs et prix</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          {isOpen ? "Fermer le formulaire" : "+ Ajouter un produit"}
        </button>
      </div>

      {/* Formulaire ajout produit */}
      {isOpen && (
        <form onSubmit={handleAdd} className="bg-orange-50/60 p-5 rounded-2xl border border-orange-100 mb-6 space-y-4 animate-in fade-in duration-200">
          <h3 className="font-bold text-sm text-slate-800">Nouveau produit à la vente</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nom du produit</label>
              <input
                type="text"
                required
                placeholder="Ex: Clémentines de Corse"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Conditionnement / Unité</label>
              <input
                type="text"
                placeholder="Ex: caisse de 6kg ou / kg"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Prix (€)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="Ex: 15.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-orange-200 disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Ajouter le produit"}
          </button>
        </form>
      )}

      {/* Liste des produits existants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {products.map((p) => (
          <div key={p.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-black text-slate-800 text-sm">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.description || "Sans description"}</p>
              </div>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
            <p className="text-orange-600 font-black mt-3 text-lg">{p.price.toFixed(2)} €</p>
          </div>
        ))}
      </div>
    </div>
  );
}
