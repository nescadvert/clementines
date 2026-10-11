"use client";
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { createOrder } from '@/app/actions';
import Link from 'next/link';

const Map = dynamic(() => import('./Map'), { 
  ssr: false, 
  loading: () => (
    <div className="h-screen w-screen bg-orange-50 animate-pulse flex flex-col items-center justify-center text-orange-400">
      <span className="text-6xl mb-4 animate-bounce">🍊</span>
      <span className="font-bold text-lg">Chargement de la carte...</span>
    </div>
  ) 
});

interface Point {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export default function CheckoutClient({ points, products }: { points: Point[], products: Product[] }) {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  
  const point = points.find(p => p.id === selectedPoint);

  const total = Object.entries(cart).reduce((sum, [productId, qty]) => {
    const p = products.find(p => p.id === productId);
    return sum + (p?.price || 0) * qty;
  }, 0);

  const handleMapValidation = (pointId: string, finalCart: Record<string, number>) => {
    setSelectedPoint(pointId);
    setCart(finalCart);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint || Object.keys(cart).length === 0) return;
    setLoading(true);
    
    try {
      await createOrder({
        name,
        phone,
        items: cart,
        deliveryPointId: selectedPoint
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la commande.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col h-screen w-screen bg-gradient-to-b from-green-50 to-white p-6 items-center justify-center text-center">
        <div className="bg-white p-10 rounded-[2rem] shadow-2xl shadow-green-100/50 border border-green-100 max-w-md w-full transform transition-all animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">✅</span>
          </div>
          <h2 className="text-3xl font-black text-green-800 mb-4 tracking-tight">C'est noté, {name.split(' ')[0]} !</h2>
          <p className="text-slate-600 mb-6 text-lg leading-relaxed">Votre commande a bien été enregistrée pour une remise à <strong className="text-slate-800">{point?.name}</strong>.</p>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 text-left">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Montant à prévoir</p>
            <p className="text-4xl font-black text-slate-800">{total} €</p>
            <p className="text-sm text-slate-500 mt-2">Paiement sur place. Préparez l'appoint si possible ! 🍊</p>
          </div>

          <button onClick={() => window.location.reload()} className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-green-200">
            Retour à la carte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100">
      
      {/* Bouton Admin flottant */}
      <Link 
        href="/admin" 
        prefetch={false}
        className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-slate-200 text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors"
      >
        ⚙️ Admin
      </Link>
      
      {/* Panneau d'introduction flottant */}
      <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 max-w-[280px] sm:max-w-sm transition-all duration-300">
        <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setIsTutorialOpen(!isTutorialOpen)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center text-xl shadow-sm border border-orange-300 flex-shrink-0">🍊</div>
            <h1 className="text-base sm:text-lg font-black text-slate-800 leading-none">
              EARL Mangani
              <span className="block text-[9px] sm:text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">Producteur Corse</span>
            </h1>
          </div>
          <button className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
            {isTutorialOpen ? '✕' : '❓'}
          </button>
        </div>
        
        {isTutorialOpen && (
          <div className="space-y-2.5 text-xs sm:text-sm font-medium text-slate-600 mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
            <p className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">1</span>
              <span>Choisissez votre <strong>point de livraison</strong> sur la carte</span>
            </p>
            <p className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">2</span>
              <span>Choisissez vos <strong>produits</strong></span>
            </p>
            <p className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">3</span>
              <span>Rentrez votre nom, prénom et téléphone et <strong>faites-vous livrer !</strong></span>
            </p>
          </div>
        )}
      </div>

      {/* Carte Plein Écran */}
      <div className="w-full h-full absolute inset-0 z-0">
        <Map points={points} products={products} onSelect={handleMapValidation} />
      </div>

      {/* Modale Formulaire */}
      {selectedPoint && total > 0 && (
        <div className="absolute inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-full duration-300">
            
            <button 
              onClick={() => setSelectedPoint(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-slate-800 mb-6 pr-8">Finalisez votre commande</h2>
            
            <div className="bg-green-50 rounded-2xl p-4 flex flex-col gap-1 text-green-800 mb-4 border border-green-100">
              <p className="text-xs font-bold uppercase tracking-wider text-green-600/80">Lieu de livraison</p>
              <p className="font-bold flex items-center gap-2">📍 {point?.name}</p>
            </div>

            <div className="mb-6">
              {Object.entries(cart).filter(([_, q]) => q > 0).map(([id, q]) => {
                const p = products.find(prod => prod.id === id);
                return (
                  <div key={id} className="flex justify-between items-center text-sm mb-1.5">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">{q}x {p?.name}</span>
                      {p?.description && (
                        <span className="text-xs text-slate-400 font-normal">{p.description}</span>
                      )}
                    </div>
                    <span className="font-bold text-slate-800">{(p?.price || 0) * q} €</span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-800">Total à payer sur place</span>
                <span className="font-black text-orange-600 text-xl">{total} €</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full p-4 bg-slate-50 text-slate-800 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium placeholder:font-normal placeholder:text-slate-400" 
                  placeholder="Votre Prénom & Nom" 
                />
              </div>
              <div>
                <input 
                  type="tel" 
                  required 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="w-full p-4 bg-slate-50 text-slate-800 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium placeholder:font-normal placeholder:text-slate-400" 
                  placeholder="Numéro de téléphone" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-lg py-4 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-orange-200/50 mt-4 disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? "Validation..." : "Confirmer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
