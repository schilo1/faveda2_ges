"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FilePlus2,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  ScrollText,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type Option = { id: string; name: string };
type UnitOption = Option & { symbol: string };
type MaterialOption = Option & {
  unit: string;
  currentStock: number;
  minimumStock: number;
  estimatedUnitCost: number;
  expiryDate?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  notes?: string | null;
};
type BudgetRow = {
  id: string;
  month: string;
  amount: number;
  notes?: string | null;
  userName: string;
};
type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  materialId?: string | null;
  materialName?: string | null;
  productId?: string | null;
  productName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  quantity?: number | null;
  unitCost?: number | null;
  amount: number;
  spentAt: string;
  notes?: string | null;
  userName: string;
};
type RecipeRow = {
  id: string;
  productId: string;
  productName: string;
  materialId: string;
  materialName: string;
  materialUnit: string;
  quantityPerUnit: number;
  notes?: string | null;
};

type Props = {
  month: string;
  materials: MaterialOption[];
  budgets: BudgetRow[];
  expenses: ExpenseRow[];
  recipes: RecipeRow[];
  products: Option[];
  suppliers: Option[];
  units: UnitOption[];
  canEdit: boolean;
};

const expenseCategories = [
  { value: "MATIERE_PREMIERE", label: "Matière première" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "EMBALLAGE", label: "Emballage" },
  { value: "MAIN_OEUVRE", label: "Main d'oeuvre" },
  { value: "AUTRE", label: "Autre" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-CI", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function matchesSearch(values: unknown[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: currentPage,
    pageCount,
  };
}

function parsePositiveNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

async function requestJson(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Action impossible.");
  return data;
}

const postJson = (url: string, body: unknown) => requestJson(url, "POST", body);

type FinanceTab = "budgets" | "materials" | "expenses" | "recipes";

export function FinanceForms({
  month,
  materials,
  budgets,
  expenses,
  recipes,
  products,
  suppliers,
  units,
  canEdit,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState("");
  const [modal, setModal] = useState<
    "" | "budget" | "material" | "expense" | "recipe"
  >("");
  const [activeTab, setActiveTab] = useState<FinanceTab>("budgets");
  const [editingBudget, setEditingBudget] = useState<BudgetRow | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialOption | null>(
    null,
  );
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<RecipeRow | null>(null);
  const [recipeLines, setRecipeLines] = useState([0]);
  const [expenseMaterialId, setExpenseMaterialId] = useState("");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<Record<FinanceTab, number>>({
    budgets: 1,
    materials: 1,
    expenses: 1,
    recipes: 1,
  });
  const selectedMaterial = materials.find(
    (material) => material.id === expenseMaterialId,
  );
  const pageSize = 10;
  const setPage = (tab: FinanceTab, nextPage: number) =>
    setPages((current) => ({ ...current, [tab]: nextPage }));
  const filteredBudgets = budgets.filter((row) =>
    matchesSearch([row.month, row.amount, row.notes, row.userName], search),
  );
  const filteredMaterials = materials.filter((material) =>
    matchesSearch(
      [
        material.name,
        material.unit,
        material.currentStock,
        material.minimumStock,
        material.estimatedUnitCost,
        material.expiryDate,
        material.supplierName,
        material.notes,
      ],
      search,
    ),
  );
  const filteredExpenses = expenses.filter((row) =>
    matchesSearch(
      [
        row.spentAt,
        row.description,
        row.category.replaceAll("_", " "),
        row.materialName,
        row.productName,
        row.supplierName,
        row.quantity,
        row.unitCost,
        row.amount,
        row.notes,
        row.userName,
      ],
      search,
    ),
  );
  const filteredRecipes = recipes.filter((row) =>
    matchesSearch(
      [
        row.productName,
        row.materialName,
        row.materialUnit,
        row.quantityPerUnit,
        row.notes,
      ],
      search,
    ),
  );
  const budgetPage = paginate(filteredBudgets, pages.budgets, pageSize);
  const materialPage = paginate(filteredMaterials, pages.materials, pageSize);
  const expensePage = paginate(filteredExpenses, pages.expenses, pageSize);
  const recipePage = paginate(filteredRecipes, pages.recipes, pageSize);

  if (!canEdit) {
    return (
      <div className="card p-5">
        <p className="text-sm font-medium text-gray-600">
          Votre rôle permet de consulter les finances, mais pas de les modifier.
        </p>
      </div>
    );
  }

  async function submitBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setLoading("budget");
    try {
      const payload = {
        month: fd.get("month") || month,
        amount: fd.get("amount"),
        notes: fd.get("notes") || null,
      };
      await (editingBudget
        ? requestJson(
            `/api/finance/budgets/${editingBudget.id}`,
            "PUT",
            payload,
          )
        : postJson("/api/finance/budgets", payload));
      toast.success(
        editingBudget ? "Budget modifié" : "Budget enregistré",
        "Le budget a été mis à jour.",
      );
      setEditingBudget(null);
      setModal("");
      router.refresh();
    } catch (error) {
      toast.error(
        "Budget non enregistré",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  async function deleteBudget(row: BudgetRow) {
    if (!window.confirm(`Supprimer le budget ${row.month} ?`)) return;
    setLoading(`delete-budget-${row.id}`);
    try {
      await requestJson(`/api/finance/budgets/${row.id}`, "DELETE");
      toast.success("Budget supprimé");
      router.refresh();
    } catch (error) {
      toast.error(
        "Suppression impossible",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  async function submitMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setLoading("material");
    try {
      const payload = {
        name: fd.get("name"),
        unit: fd.get("unit"),
        currentStock: fd.get("currentStock"),
        minimumStock: fd.get("minimumStock"),
        estimatedUnitCost: fd.get("estimatedUnitCost"),
        expiryDate: fd.get("expiryDate") || null,
        supplierId: fd.get("supplierId") || null,
        notes: fd.get("notes") || null,
      };
      const result = editingMaterial
        ? await requestJson(
            `/api/finance/materials/${editingMaterial.id}`,
            "PUT",
            payload,
          )
        : await postJson("/api/finance/materials", payload);
      form.reset();
      toast.success(
        editingMaterial || result?.updated
          ? "Matière mise à jour"
          : "Matière ajoutée",
        "Elle est disponible pour les dépenses et projections.",
      );
      setEditingMaterial(null);
      setModal("");
      router.refresh();
    } catch (error) {
      toast.error(
        "Matière non ajoutée",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  async function deleteMaterial(material: MaterialOption) {
    if (!window.confirm(`Supprimer la matière "${material.name}" ?`)) return;
    setLoading(`delete-${material.id}`);
    try {
      await requestJson(`/api/finance/materials/${material.id}`, "DELETE");
      toast.success(
        "Matière supprimée",
        "Elle n'apparaîtra plus dans les nouvelles saisies.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        "Suppression impossible",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  function openNewMaterial() {
    setEditingMaterial(null);
    setModal("material");
  }

  function openEditMaterial(material: MaterialOption) {
    setEditingMaterial(material);
    setModal("material");
  }

  function openNewBudget() {
    setEditingBudget(null);
    setModal("budget");
  }

  function openEditBudget(row: BudgetRow) {
    setEditingBudget(row);
    setModal("budget");
  }

  function openNewExpense() {
    setEditingExpense(null);
    setExpenseMaterialId("");
    setModal("expense");
  }

  function openEditExpense(row: ExpenseRow) {
    setEditingExpense(row);
    setExpenseMaterialId(row.materialId ?? "");
    setModal("expense");
  }

  function openNewRecipe() {
    setEditingRecipe(null);
    setRecipeLines([Date.now()]);
    setModal("recipe");
  }

  function openEditRecipe(row: RecipeRow) {
    setEditingRecipe(row);
    setRecipeLines([Date.now()]);
    setModal("recipe");
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setLoading("expense");
    try {
      const payload = {
        description: fd.get("description"),
        category: fd.get("category"),
        materialId: fd.get("materialId") || null,
        productId: fd.get("productId") || null,
        supplierId: fd.get("supplierId") || null,
        quantity: fd.get("quantity") || null,
        unitCost: fd.get("unitCost") || null,
        amount: fd.get("amount") || null,
        spentAt: fd.get("spentAt") || null,
        notes: fd.get("notes") || null,
      };
      await (editingExpense
        ? requestJson(
            `/api/finance/expenses/${editingExpense.id}`,
            "PUT",
            payload,
          )
        : postJson("/api/finance/expenses", payload));
      form.reset();
      setExpenseMaterialId("");
      toast.success(
        editingExpense ? "Dépense modifiée" : "Dépense enregistrée",
        "Le suivi du mois a été actualisé.",
      );
      setEditingExpense(null);
      setModal("");
      router.refresh();
    } catch (error) {
      toast.error(
        "Dépense non enregistrée",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  async function deleteExpense(row: ExpenseRow) {
    if (!window.confirm(`Supprimer la dépense "${row.description}" ?`)) return;
    setLoading(`delete-expense-${row.id}`);
    try {
      await requestJson(`/api/finance/expenses/${row.id}`, "DELETE");
      toast.success("Dépense supprimée");
      router.refresh();
    } catch (error) {
      toast.error(
        "Suppression impossible",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  async function submitRecipe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setLoading("recipe");
    try {
      const productId = fd.get("productId");
      if (editingRecipe) {
        const batchProducts = parsePositiveNumber(fd.get("batchProductQuantity"));
        const batchMaterial = parsePositiveNumber(fd.get("batchMaterialQuantity"));
        if (!batchProducts || !batchMaterial) {
          throw new Error(
            "Indiquez le nombre de produits du lot et la quantité totale de matière utilisée.",
          );
        }
        await requestJson(`/api/finance/recipes/${editingRecipe.id}`, "PUT", {
          productId,
          materialId: fd.get("materialId"),
          quantityPerUnit: batchMaterial / batchProducts,
          notes: fd.get("notes") || null,
        });
      } else {
        const materialIds = fd.getAll("materialId").map(String);
        const batchProducts = fd.getAll("batchProductQuantity");
        const batchMaterials = fd.getAll("batchMaterialQuantity");
        const notes = fd.getAll("notes").map(String);
        const rows = materialIds
          .map((materialId, index) => {
            const productsInBatch = parsePositiveNumber(batchProducts[index]);
            const materialInBatch = parsePositiveNumber(batchMaterials[index]);
            return {
              materialId,
              quantityPerUnit:
                productsInBatch && materialInBatch
                  ? materialInBatch / productsInBatch
                  : null,
              notes: notes[index] || null,
            };
          })
          .filter((row) => row.materialId);
        const duplicates = rows
          .map((row) => row.materialId)
          .filter((id, index, ids) => ids.indexOf(id) !== index);

        if (!productId || rows.length === 0) {
          throw new Error(
            "Choisissez un produit et au moins une matière première.",
          );
        }
        if (rows.some((row) => !row.quantityPerUnit)) {
          throw new Error(
            "Pour chaque matière, indiquez le nombre de produits du lot et la quantité totale utilisée.",
          );
        }
        if (duplicates.length > 0) {
          throw new Error(
            "Une même matière ne doit pas être répétée pour le même produit.",
          );
        }

        for (const row of rows) {
          await postJson("/api/finance/recipes", {
            productId,
            materialId: row.materialId,
            quantityPerUnit: row.quantityPerUnit,
            notes: row.notes,
          });
        }
      }
      form.reset();
      toast.success(
        editingRecipe
          ? "Recette matière modifiée"
          : "Recettes matières enregistrées",
        "Le produit peut maintenant utiliser plusieurs matières.",
      );
      setEditingRecipe(null);
      setRecipeLines([Date.now()]);
      setModal("");
      router.refresh();
    } catch (error) {
      toast.error(
        "Recette non enregistrée",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  async function deleteRecipe(row: RecipeRow) {
    if (
      !window.confirm(
        `Supprimer le lien ${row.productName} / ${row.materialName} ?`,
      )
    )
      return;
    setLoading(`delete-recipe-${row.id}`);
    try {
      await requestJson(`/api/finance/recipes/${row.id}`, "DELETE");
      toast.success("Recette supprimée");
      router.refresh();
    } catch (error) {
      toast.error(
        "Suppression impossible",
        error instanceof Error ? error.message : "Action impossible.",
      );
    } finally {
      setLoading("");
    }
  }

  return (
    <div>
      <section className="overflow-hidden rounded-2xl border border-[#D9D7D2]/70 bg-white/85 shadow-sm shadow-[#4F5C3D]/5">
        <div className="border-b border-[#D9D7D2]/60 p-3">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <TabButton
              active={activeTab === "budgets"}
              icon={WalletCards}
              label="Budgets"
              count={budgets.length}
              onClick={() => setActiveTab("budgets")}
            />
            <TabButton
              active={activeTab === "materials"}
              icon={PackagePlus}
              label="Matières"
              count={materials.length}
              onClick={() => setActiveTab("materials")}
            />
            <TabButton
              active={activeTab === "expenses"}
              icon={FilePlus2}
              label="Dépenses"
              count={expenses.length}
              onClick={() => setActiveTab("expenses")}
            />
            <TabButton
              active={activeTab === "recipes"}
              icon={ScrollText}
              label="Recettes"
              count={recipes.length}
              onClick={() => setActiveTab("recipes")}
            />
          </div>
          <div className="relative mt-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(activeTab, 1);
              }}
              className="input pl-9"
              placeholder="Rechercher dans l'onglet sélectionné..."
            />
          </div>
        </div>

        {activeTab === "budgets" && (
          <DataPanel
            title="Budgets mensuels"
            subtitle="Définissez et corrigez les budgets de dépenses matières."
            actionLabel="Nouveau budget"
            onAdd={openNewBudget}
          >
            <DataTable
              headers={["Mois", "Montant", "Note", "Saisi par", "Actions"]}
              empty="Aucun budget enregistré"
              colSpan={5}
            >
              {budgetPage.items.map((row) => (
                <tr key={row.id} className="hover:bg-[#F3F3F3]/70">
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {row.month}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#596744]">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.notes ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.userName}</td>
                  <td className="px-4 py-3">
                    <RowActions
                      onEdit={() => openEditBudget(row)}
                      onDelete={() => deleteBudget(row)}
                      loading={loading === `delete-budget-${row.id}`}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pagination
              page={budgetPage.page}
              pageCount={budgetPage.pageCount}
              total={filteredBudgets.length}
              pageSize={pageSize}
              onPageChange={(next) => setPage("budgets", next)}
            />
          </DataPanel>
        )}

        {activeTab === "materials" && (
          <DataPanel
            title="Matières premières"
            subtitle="Modifiez ou supprimez les matières enregistrées."
            actionLabel="Nouvelle matière"
            onAdd={openNewMaterial}
          >
            <DataTable
              headers={[
                "Nom",
                "Unité",
                "Stock",
                "Seuil",
                "Coût estimé",
                "Péremption",
                "Fournisseur",
                "Actions",
              ]}
              empty="Aucune matière première enregistrée"
              colSpan={8}
            >
              {materialPage.items.map((material) => (
                <tr key={material.id} className="hover:bg-[#F3F3F3]/70">
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {material.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{material.unit}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(material.currentStock)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(material.minimumStock)}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#596744]">
                    {formatMoney(material.estimatedUnitCost)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {material.expiryDate ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {material.supplierName ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      onEdit={() => openEditMaterial(material)}
                      onDelete={() => deleteMaterial(material)}
                      loading={loading === `delete-${material.id}`}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pagination
              page={materialPage.page}
              pageCount={materialPage.pageCount}
              total={filteredMaterials.length}
              pageSize={pageSize}
              onPageChange={(next) => setPage("materials", next)}
            />
          </DataPanel>
        )}

        {activeTab === "expenses" && (
          <DataPanel
            title="Dépenses"
            subtitle="Suivez les achats et sorties d'argent du mois affiché."
            actionLabel="Nouvelle dépense"
            onAdd={openNewExpense}
          >
            <DataTable
              headers={[
                "Date",
                "Description",
                "Catégorie",
                "Matière",
                "Montant",
                "Saisi par",
                "Actions",
              ]}
              empty="Aucune dépense enregistrée"
              colSpan={7}
            >
              {expensePage.items.map((row) => (
                <tr key={row.id} className="hover:bg-[#F3F3F3]/70">
                  <td className="px-4 py-3 text-gray-600">{row.spentAt}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {row.description}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.category.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.materialName ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#596744]">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.userName}</td>
                  <td className="px-4 py-3">
                    <RowActions
                      onEdit={() => openEditExpense(row)}
                      onDelete={() => deleteExpense(row)}
                      loading={loading === `delete-expense-${row.id}`}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pagination
              page={expensePage.page}
              pageCount={expensePage.pageCount}
              total={filteredExpenses.length}
              pageSize={pageSize}
              onPageChange={(next) => setPage("expenses", next)}
            />
          </DataPanel>
        )}

        {activeTab === "recipes" && (
          <DataPanel
            title="Recettes produit"
            subtitle="Définissez les matières nécessaires pour confectionner chaque produit."
            actionLabel="Nouvelle recette"
            onAdd={openNewRecipe}
          >
            <DataTable
              headers={[
                "Produit",
                "Matière (du Produit)",
                "Qté pour 1 produit",
                "Note",
                "Actions",
              ]}
              empty="Aucune recette matière enregistrée"
              colSpan={5}
            >
              {recipePage.items.map((row) => (
                <tr key={row.id} className="hover:bg-[#F3F3F3]/70">
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {row.productName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.materialName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(row.quantityPerUnit)} {row.materialUnit}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.notes ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      onEdit={() => openEditRecipe(row)}
                      onDelete={() => deleteRecipe(row)}
                      loading={loading === `delete-recipe-${row.id}`}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pagination
              page={recipePage.page}
              pageCount={recipePage.pageCount}
              total={filteredRecipes.length}
              pageSize={pageSize}
              onPageChange={(next) => setPage("recipes", next)}
            />
          </DataPanel>
        )}
      </section>

      <FinanceModal
        title={editingBudget ? "Modifier le budget" : "Budget mensuel matières"}
        open={modal === "budget"}
        onClose={() => {
          setModal("");
          setEditingBudget(null);
        }}
      >
        <form onSubmit={submitBudget}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1fr_1.2fr]">
            <div>
              <label className="label">Mois</label>
              <input
                name="month"
                type="month"
                className="input"
                defaultValue={editingBudget?.month ?? month}
                required
              />
            </div>
            <div>
              <label className="label">Budget du mois</label>
              <input
                name="amount"
                type="number"
                min={0}
                step={1}
                className="input"
                placeholder="Ex: 500000"
                defaultValue={editingBudget?.amount ?? ""}
                required
              />
            </div>
            <div>
              <label className="label">Note</label>
              <input
                name="notes"
                className="input"
                placeholder="Objectif ou contexte"
                defaultValue={editingBudget?.notes ?? ""}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading === "budget"}
            className="btn-primary mt-4 gap-2"
          >
            <Save size={16} />
            {loading === "budget"
              ? "Enregistrement..."
              : editingBudget
                ? "Enregistrer les modifications"
                : "Définir le budget"}
          </button>
        </form>
      </FinanceModal>

      <FinanceModal
        title={
          editingMaterial
            ? "Modifier la matière première"
            : "Nouvelle matière première"
        }
        open={modal === "material"}
        onClose={() => {
          setModal("");
          setEditingMaterial(null);
        }}
      >
        <form onSubmit={submitMaterial}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nom matière</label>
              <input
                name="name"
                className="input"
                placeholder="Ex: Beurre de karité"
                defaultValue={editingMaterial?.name ?? ""}
                required
              />
            </div>
            <div>
              <label className="label">Unité</label>
              <select
                name="unit"
                className="input"
                defaultValue={editingMaterial?.unit ?? ""}
                required
              >
                <option value="">Choisir une unité</option>
                {editingMaterial?.unit &&
                  !units.some(
                    (unit) => unit.symbol === editingMaterial.unit,
                  ) && (
                    <option value={editingMaterial.unit}>
                      {editingMaterial.unit}
                    </option>
                  )}
                {units.map((unit) => (
                  <option key={unit.id} value={unit.symbol}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Stock actuel</label>
              <input
                name="currentStock"
                type="number"
                min={0}
                step="0.01"
                className="input"
                placeholder="0"
                defaultValue={editingMaterial?.currentStock ?? ""}
              />
            </div>
            <div>
              <label className="label">Seuil minimum</label>
              <input
                name="minimumStock"
                type="number"
                min={0}
                step="0.01"
                className="input"
                placeholder="0"
                defaultValue={editingMaterial?.minimumStock ?? ""}
              />
            </div>
            <div>
              <label className="label">Coût unité estimé</label>
              <input
                name="estimatedUnitCost"
                type="number"
                min={0}
                step={1}
                className="input"
                placeholder="0"
                defaultValue={editingMaterial?.estimatedUnitCost ?? ""}
              />
            </div>
            <div>
              <label className="label">Date de péremption</label>
              <input
                name="expiryDate"
                type="date"
                className="input"
                defaultValue={editingMaterial?.expiryDate ?? ""}
              />
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <select
                name="supplierId"
                className="input"
                defaultValue={editingMaterial?.supplierId ?? ""}
              >
                <option value="">Aucun fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="label mt-3">Notes</label>
          <input
            name="notes"
            className="input"
            placeholder="Notes"
            defaultValue={editingMaterial?.notes ?? ""}
          />
          <button
            type="submit"
            disabled={loading === "material"}
            className="btn-primary mt-4 gap-2"
          >
            {editingMaterial ? <Save size={16} /> : <Plus size={16} />}
            {loading === "material"
              ? "Enregistrement..."
              : editingMaterial
                ? "Enregistrer les modifications"
                : "Ajouter la matière"}
          </button>
        </form>
      </FinanceModal>

      <FinanceModal
        title={
          editingExpense ? "Modifier la dépense" : "Enregistrer une dépense"
        }
        open={modal === "expense"}
        onClose={() => {
          setModal("");
          setEditingExpense(null);
          setExpenseMaterialId("");
        }}
        wide
      >
        <form onSubmit={submitExpense}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Description">
              <input
                name="description"
                className="input"
                placeholder="Description"
                defaultValue={editingExpense?.description ?? ""}
                required
              />
            </Field>
            <Field label="Catégorie">
              <select
                name="category"
                className="input"
                defaultValue={editingExpense?.category ?? "MATIERE_PREMIERE"}
              >
                {expenseCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                name="spentAt"
                type="date"
                className="input"
                defaultValue={
                  editingExpense?.spentAt ??
                  new Date().toISOString().slice(0, 10)
                }
              />
            </Field>
            <Field label="Matière concernée">
              <select
                name="materialId"
                className="input"
                value={expenseMaterialId}
                onChange={(e) => setExpenseMaterialId(e.target.value)}
              >
                <option value="">Aucune matière</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Produit lié">
              <select
                name="productId"
                className="input"
                defaultValue={editingExpense?.productId ?? ""}
              >
                <option value="">Aucun produit</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fournisseur">
              <select
                name="supplierId"
                className="input"
                defaultValue={editingExpense?.supplierId ?? ""}
              >
                <option value="">Aucun fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={`Quantité${selectedMaterial ? ` (${selectedMaterial.unit})` : ""}`}
            >
              <input
                name="quantity"
                type="number"
                min={0}
                step="0.01"
                className="input"
                placeholder="0"
                defaultValue={editingExpense?.quantity ?? ""}
              />
            </Field>
            <Field label="Prix unitaire">
              <input
                name="unitCost"
                type="number"
                min={0}
                step={1}
                className="input"
                placeholder={
                  selectedMaterial
                    ? `${selectedMaterial.estimatedUnitCost}`
                    : "0"
                }
                defaultValue={editingExpense?.unitCost ?? ""}
              />
            </Field>
            <Field label="Montant total">
              <input
                name="amount"
                type="number"
                min={0}
                step={1}
                className="input"
                placeholder="Si différent"
                defaultValue={editingExpense?.amount ?? ""}
              />
            </Field>
          </div>
          <textarea
            name="notes"
            rows={2}
            className="input mt-3 resize-none"
            placeholder="Notes, justification, facture..."
            defaultValue={editingExpense?.notes ?? ""}
          />
          <button
            type="submit"
            disabled={loading === "expense"}
            className="btn-primary mt-4 gap-2"
          >
            {editingExpense ? <Save size={16} /> : <Plus size={16} />}
            {loading === "expense"
              ? "Enregistrement..."
              : editingExpense
                ? "Enregistrer les modifications"
                : "Ajouter la dépense"}
          </button>
        </form>
      </FinanceModal>

      <FinanceModal
        title={
          editingRecipe
            ? "Modifier la recette matière"
            : "Recette matière par produit"
        }
        open={modal === "recipe"}
        onClose={() => {
          setModal("");
          setEditingRecipe(null);
        }}
        wide
      >
        <form onSubmit={submitRecipe}>
          <div className="mb-4 rounded-2xl border border-[#C9A227]/30 bg-[#FFF3C4]/35 p-4 text-sm leading-6 text-[#6F560D]">
            Saisissez la recette en lot si c'est plus simple. Exemple : pour
            50 bouteilles, 10 sacs de feuilles. L'application calcule
            automatiquement la quantité estimée pour 1 produit.
          </div>
          <div className="mb-4">
            <Field label="Produit fabriqué">
              <select
                name="productId"
                className="input"
                defaultValue={editingRecipe?.productId ?? ""}
                required
              >
                <option value="">Produit</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="space-y-3">
            {(editingRecipe ? [0] : recipeLines).map((line, index) => (
              <div
                key={line}
                className="rounded-2xl border border-[#D9D7D2]/70 bg-[#F8F8F6] p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-gray-800">
                    Matière {index + 1}
                  </p>
                  {!editingRecipe && recipeLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRecipeLines((current) =>
                          current.filter((item) => item !== line),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Retirer
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.75fr_0.75fr_1fr]">
                  <Field label="Matière utilisée">
                    <select
                      name="materialId"
                      className="input"
                      defaultValue={editingRecipe?.materialId ?? ""}
                      required
                    >
                      <option value="">Matière</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.unit})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nombre de produits du lot">
                    <input
                      name="batchProductQuantity"
                      type="number"
                      min={0.0001}
                      step="0.0001"
                      className="input"
                      placeholder="Ex: 50"
                      defaultValue={editingRecipe ? 1 : ""}
                      required
                    />
                  </Field>
                  <Field label="Quantité matière du lot">
                    <input
                      name="batchMaterialQuantity"
                      type="number"
                      min={0.0001}
                      step="0.0001"
                      className="input"
                      placeholder="Ex: 10"
                      defaultValue={editingRecipe?.quantityPerUnit ?? ""}
                      required
                    />
                  </Field>
                  <Field label="Note">
                    <input
                      name="notes"
                      className="input"
                      placeholder="Note"
                      defaultValue={editingRecipe?.notes ?? ""}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          {!editingRecipe && (
            <button
              type="button"
              onClick={() =>
                setRecipeLines((current) => [
                  ...current,
                  Date.now() + current.length,
                ])
              }
              className="btn-secondary mt-4 gap-2"
            >
              <Plus size={16} />
              Ajouter une matière
            </button>
          )}
          <button
            type="submit"
            disabled={loading === "recipe"}
            className="btn-primary mt-4 gap-2"
          >
            <Save size={16} />
            {loading === "recipe"
              ? "..."
              : editingRecipe
                ? "Enregistrer les modifications"
                : "Lier les matières"}
          </button>
        </form>
      </FinanceModal>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
        active
          ? "border-[#596744] bg-[#596744] text-white shadow-md shadow-[#596744]/20"
          : "border-[#D9D7D2]/80 bg-[#F8F8F6] text-gray-700 hover:border-[#C9A227]/60 hover:bg-[#FFF3C4]/30"
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="min-w-0 flex-1 font-bold">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}
      >
        {count}
      </span>
    </button>
  );
}

function DataPanel({
  title,
  subtitle,
  actionLabel,
  onAdd,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D7D2]/60 px-4 py-3">
        <div>
          <h2 className="font-bold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="btn-secondary gap-2 text-sm"
        >
          <Plus size={15} />
          {actionLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function DataTable({
  headers,
  empty,
  colSpan,
  children,
}: {
  headers: string[];
  empty: string;
  colSpan: number;
  children: React.ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D9D7D2]/40">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-8 text-center text-gray-400"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
  loading,
}: {
  onEdit: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-lg border border-[#D9D7D2] px-2.5 py-1.5 text-xs font-semibold text-[#596744] transition hover:bg-[#F3F3F3]"
      >
        <Pencil size={13} />
        Modifier
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        <Trash2 size={13} />
        {loading ? "..." : "Supprimer"}
      </button>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D9D7D2]/60 px-4 py-3">
      <p className="text-xs font-medium text-gray-500">
        {start}-{end} sur {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-[#D9D7D2] px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Précédent
        </button>
        <span className="rounded-lg bg-[#F3F3F3] px-3 py-1.5 text-xs font-bold text-gray-700">
          {page}/{pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="rounded-lg border border-[#D9D7D2] px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

function FinanceModal({
  title,
  open,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl shadow-black/20 ${wide ? "max-w-4xl" : "max-w-2xl"}`}
      >
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#D9D7D2]/60 pb-4">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-[#F3F3F3] hover:text-gray-900"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
