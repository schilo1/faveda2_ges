import prisma from "@/lib/prisma";
import { SupplierForm } from "@/components/forms/SupplierForm";
import { notFound } from "next/navigation";

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
  });

  if (!supplier) notFound();

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Modifier le fournisseur</h1>
          <p className="page-subtitle">{supplier.name}</p>
        </div>
      </div>

      <div className="card p-6">
        <SupplierForm supplier={supplier} />
      </div>
    </div>
  );
}
