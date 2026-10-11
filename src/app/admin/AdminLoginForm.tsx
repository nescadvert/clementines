"use client";
import { useState } from "react";
import Link from "next/link";
import { loginAdmin } from "./actions";

export default function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await loginAdmin(password);
    if (!res.success) {
      setError(true);
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-orange-200">
          🔒
        </div>
        <h1 className="text-xl font-black text-slate-800 mb-1">Espace EARL Mangani</h1>
        <p className="text-xs text-slate-500 mb-6">Accès réservé au producteur</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-medium text-slate-800 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-bold bg-red-50 p-2.5 rounded-lg text-center">
              Mot de passe incorrect
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-orange-200 disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Déverrouiller"}
          </button>
        </form>

        <Link
          href="/"
          className="inline-block mt-6 text-xs text-slate-400 hover:text-orange-600 transition-colors font-medium"
        >
          &larr; Retour à la boutique
        </Link>
      </div>
    </div>
  );
}
