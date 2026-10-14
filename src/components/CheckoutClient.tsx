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
  dayOfWeek?: number;
  timeSlot?: string;
  tournee?: string;
}


interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

function parseTimeSlot(slot: string = "16h00 - 18h00") {
  const match = slot.match(/(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/i);
  if (match) {
    return {
      startH: parseInt(match[1]),
      startM: match[2] ? parseInt(match[2]) : 0,
      endH: parseInt(match[3]),
      endM: match[4] ? parseInt(match[4]) : 0,
    };
  }
  return { startH: 16, startM: 0, endH: 18, endM: 0 };
}

interface DeliveryOption {
  label: string;
  startDate: Date;
  endDate: Date;
}

function getNextDeliveryDates(dayOfWeek: number = 2, timeSlot: string = "16h00 - 18h00", count: number = 3): DeliveryOption[] {
  const dates: DeliveryOption[] = [];
  const now = new Date();
  const check = new Date(now);
  const times = parseTimeSlot(timeSlot);

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  while (dates.length < count) {
    if (check.getDay() === dayOfWeek) {
      const rawDate = formatter.format(check);
      const formatted = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
      
      const startDate = new Date(check);
      startDate.setHours(times.startH, times.startM, 0, 0);
      
      const endDate = new Date(check);
      endDate.setHours(times.endH, times.endM, 0, 0);

      dates.push({
        label: formatted,
        startDate,
        endDate
      });

    }
    check.setDate(check.getDate() + 1);
  }

  return dates;
}

function formatIcsDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    "00"
  );
}

function getGoogleCalendarUrl(pointName: string, option: DeliveryOption | undefined, total: number): string {
  if (!option) return "#";
  const formatUtcIso = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const start = formatUtcIso(option.startDate);
  const end = formatUtcIso(option.endDate);
  const title = encodeURIComponent("🍊 Retrait Clémentines (EARL Mangani)");
  const details = encodeURIComponent(
    `Retrait de votre commande de clémentines au camion à ${pointName}.\nMontant à régler sur place : ${total}€.\nPréparez l'appoint si possible ! 🍊`
  );
  const location = encodeURIComponent(pointName);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

function openAppleIcsReminder(pointName: string, option: DeliveryOption | undefined, total: number) {
  const nowStr = formatIcsDate(new Date());
  const startStr = option ? formatIcsDate(option.startDate) : nowStr;
  const endStr = option ? formatIcsDate(option.endDate) : nowStr;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EARL Mangani//Clementines//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `SUMMARY:🍊 Retrait Clémentines (EARL Mangani)`,
    `DESCRIPTION:Retrait de votre commande au camion à ${pointName}.\\nMontant à régler sur place : ${total}€.\\nPréparez l'appoint si possible !`,
    `LOCATION:${pointName}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `DTSTAMP:${nowStr}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel : retrait de vos clémentines dans 2h !",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rappel-clementines.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


export default function CheckoutClient({ points, products }: { points: Point[], products: Product[] }) {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [chosenDate, setChosenDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  
  const point = points.find(p => p.id === selectedPoint);
  const availableDates = point ? getNextDeliveryDates(point.dayOfWeek ?? 2, point.timeSlot ?? "16h00 - 18h00", 3) : [];
  const activeDeliveryDate = chosenDate || (availableDates.length > 0 ? availableDates[0].label : "");

  const total = Object.entries(cart).reduce((sum, [productId, qty]) => {
    const p = products.find(p => p.id === productId);
    return sum + (p?.price || 0) * qty;
  }, 0);

  const handleMapValidation = (pointId: string, finalCart: Record<string, number>) => {
    setSelectedPoint(pointId);
    setCart(finalCart);
    const targetPoint = points.find(p => p.id === pointId);
    if (targetPoint) {
      const dates = getNextDeliveryDates(targetPoint.dayOfWeek ?? 2, targetPoint.timeSlot ?? "16h00 - 18h00", 3);
      if (dates.length > 0) {
        setChosenDate(dates[0].label);
      }
    }
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
        deliveryPointId: selectedPoint,
        deliveryDate: activeDeliveryDate
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
    const selectedOption = availableDates.find(d => d.label === activeDeliveryDate);

    return (
      <div className="flex flex-col h-screen w-screen bg-gradient-to-b from-green-50 to-white p-6 items-center justify-center text-center">
        <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-2xl shadow-green-100/50 border border-green-100 max-w-md w-full transform transition-all animate-in zoom-in-95 duration-500 max-h-[92vh] overflow-y-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl sm:text-4xl">
            ✅
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-green-800 mb-2 tracking-tight">Merci {name.split(' ')[0]} !</h2>
          <p className="text-slate-600 mb-4 text-sm sm:text-base">Votre commande a bien été enregistrée pour une remise à <strong className="text-slate-800">{point?.name}</strong>.</p>
          
          <div className="bg-emerald-50 rounded-2xl p-3.5 mb-3.5 border border-emerald-200 text-left flex items-start gap-2.5">
            <span className="text-xl">📩</span>
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Confirmation enregistrée</p>
              <p className="text-xs text-emerald-700 mt-0.5">Un SMS récapitulatif va vous être envoyé au <strong>{phone}</strong>.</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-3.5 mb-3.5 border border-amber-200 text-left">
            <p className="text-[10px] font-bold text-amber-800/70 uppercase tracking-wider mb-0.5">📅 Date de votre passage</p>
            <p className="font-black text-slate-800 text-sm sm:text-base">{activeDeliveryDate}</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100 text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Montant à prévoir</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-800">{total} €</p>
            <p className="text-[11px] text-slate-500 mt-1">Paiement sur place le jour J. Préparez l'appoint si possible ! 🍊</p>
          </div>


          {/* Boutons Rappel Calendrier */}
          <div className="mb-5 space-y-2.5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
              🔔 Ajouter un rappel dans votre agenda
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Google Agenda (Android & Ordinateur) */}
              <a
                href={getGoogleCalendarUrl(point?.name || "Point de retrait", selectedOption, total)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-3 rounded-xl font-bold transition-transform active:scale-95 text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <span>📅</span>
                <span>Google Agenda (Android)</span>
              </a>

              {/* Apple Calendar / iPhone */}
              <button
                type="button"
                onClick={() => openAppleIcsReminder(point?.name || "Point de retrait", selectedOption, total)}
                className="bg-slate-900 hover:bg-black text-white px-3 py-3 rounded-xl font-bold transition-transform active:scale-95 text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <span>🍏</span>
                <span>Apple Calendrier (iPhone)</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight text-center">
              💡 <em>Sur iPhone, touchez le fichier téléchargé pour l'ajouter en 1 clic dans votre application Calendrier.</em>
            </p>
          </div>


          <button onClick={() => window.location.reload()} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-bold transition-colors text-xs sm:text-sm">
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
              <span>Choisissez votre <strong>date de passage</strong> et validez !</span>
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
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setSelectedPoint(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-slate-800 mb-5 pr-8">Finalisez votre commande</h2>
            
            {/* Lieu */}
            <div className="bg-green-50 rounded-2xl p-3.5 flex flex-col gap-1 text-green-800 mb-4 border border-green-100">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-600/80">Lieu de livraison</p>
                {point?.tournee && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    point.tournee.includes("Balagne") ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}>
                    {point.tournee}
                  </span>
                )}
              </div>
              <p className="font-bold flex items-center gap-2 text-sm sm:text-base">📍 {point?.name}</p>
            </div>


            {/* Sélecteur des 3 prochaines dates de livraison */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                📅 Choisissez votre date de passage ({availableDates.length} options)
              </label>
              <div className="space-y-2">
                {availableDates.map((opt, idx) => {
                  const isSelected = activeDeliveryDate === opt.label;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setChosenDate(opt.label)}
                      className={`w-full p-3 rounded-xl border-2 text-left font-bold text-xs sm:text-sm flex items-center justify-between transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/80 text-orange-950 shadow-sm"
                          : "border-slate-100 bg-slate-50 text-slate-600 hover:border-orange-200"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected ? (
                        <span className="w-5 h-5 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                      ) : (
                        <span className="w-5 h-5 border-2 border-slate-200 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Récapitulatif produits */}
            <div className="mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vos produits</p>
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
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800">Total à payer sur place</span>
                <span className="font-black text-orange-600 text-xl">{total} €</span>
              </div>
            </div>

            {/* Coordonnées */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full p-3.5 bg-slate-50 text-slate-800 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium placeholder:font-normal placeholder:text-slate-400 text-sm" 
                  placeholder="Votre Prénom & Nom" 
                />
              </div>
              <div>
                <input 
                  type="tel" 
                  required 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="w-full p-3.5 bg-slate-50 text-slate-800 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium placeholder:font-normal placeholder:text-slate-400 text-sm" 
                  placeholder="Numéro de téléphone" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-base py-4 rounded-xl transition-transform active:scale-95 shadow-lg shadow-orange-200/50 mt-2 disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? "Validation..." : "Confirmer ma commande"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
