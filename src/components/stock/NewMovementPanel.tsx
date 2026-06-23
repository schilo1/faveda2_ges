"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { MovementForm } from "@/components/forms/MovementForm";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
};

export function NewMovementPanel({ products }: { products: ProductOption[] }) {
  const [typeLabel, setTypeLabel] = useState("Entrée de stock");

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">Nouveau mouvement</h1>
            <span className="rounded-full border border-[#596744]/20 bg-[#596744]/10 px-3 py-1 text-sm font-bold text-[#596744]">
              {typeLabel}
            </span>
          </div>
          <p className="page-subtitle">Enregistrer une entrée, sortie, perte, retour ou ajustement</p>
        </div>
        <Link href="/stock/movements/sale" className="btn-primary gap-2">
          <ShoppingCart size={16} />
          Faire une vente
        </Link>
      </div>
      <div className="card p-6">
        <MovementForm products={products} onTypeLabelChange={setTypeLabel} />
      </div>
    </div>
  );
}
