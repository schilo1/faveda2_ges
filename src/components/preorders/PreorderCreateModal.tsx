"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { PreorderForm } from "@/components/preorders/PreorderForm";

type Product = { id: string; name: string; sku: string; currentStock: number; sellPrice: number };

export function PreorderCreateModal({ products }: { products: Product[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary gap-2">
        <Plus size={16} />
        Nouvelle commande
      </button>

      {mounted && open ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/45 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
          <div
            className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-order-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#D9D7D2]/70 bg-white px-5 py-4">
              <div>
                <h2 id="new-order-title" className="font-bold text-gray-900">Nouvelle commande</h2>
                <p className="text-xs text-gray-500">Déclarez une commande et suivez sa livraison.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#D9D7D2] p-2 text-gray-500 transition hover:bg-[#F3F3F3]"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[calc(100vh-96px)] overflow-y-auto bg-[#F8F8F6] p-4 sm:p-5">
              <PreorderForm
                products={products}
                onCreated={() => {
                  router.refresh();
                }}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
