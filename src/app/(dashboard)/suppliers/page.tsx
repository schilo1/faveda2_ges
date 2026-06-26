import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Truck, Mail, Phone } from "lucide-react";
import { DeleteSupplierButton } from "@/components/suppliers/DeleteSupplierButton";

export default async function SuppliersPage() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fournisseurs</h1>
          <p className="page-subtitle">{suppliers.length} fournisseur(s) et partenaires</p>
        </div>
        <Link href="/suppliers/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau fournisseur
        </Link>
      </div>

      {suppliers.length === 0 && (
        <div className="card p-12 text-center">
          <Truck size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucun fournisseur enregistré</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className="card group p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#4F5C3D]/10">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#F3F3F3] border border-[#D9D7D2] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
                <Truck size={18} className="text-[#596744]" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link href={`/suppliers/${s.id}/edit`} className="text-xs text-[#596744] hover:underline font-medium">Modifier</Link>
                {isAdmin && <DeleteSupplierButton supplierId={s.id} supplierName={s.name} />}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{s.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{s._count.products} produit(s) associé(s)</p>
            </div>
            <div className="space-y-1.5">
              {s.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone size={12} className="text-gray-400" />{s.phone}
                </div>
              )}
              {s.email && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail size={12} className="text-gray-400" />{s.email}
                </div>
              )}
            </div>
            {s.comment && <p className="text-xs text-gray-400 border-t border-[#D9D7D2]/60 pt-3">{s.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
