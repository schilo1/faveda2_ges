import { SupplierForm } from "@/components/forms/SupplierForm";

export default function NewSupplierPage() {
  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouveau fournisseur</h1>
          <p className="page-subtitle">Ajoutez les informations du fournisseur.</p>
        </div>
      </div>

      <div className="card p-6">
        <SupplierForm />
      </div>
    </div>
  );
}
