"use client";
import { logoutAdmin } from "./actions";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await logoutAdmin();
        window.location.reload();
      }}
      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
    >
      Se déconnecter
    </button>
  );
}
