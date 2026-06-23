"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Leaf, Lock, Mail, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    setLoading(false);
    if (res?.error) {
      const message = "Email ou mot de passe incorrect.";
      setError(message);
      toast.error("Connexion refusée", message);
    } else {
      toast.success("Connexion réussie", "Bienvenue dans FAVEDA Stock.");
      router.push("/dashboard");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef0e8] text-[#2d3a1e]">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <div className="login-grid" />

      <section className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden lg:flex flex-col justify-between px-12 py-10 xl:px-16">
          <div className="login-fade-up flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#596744] text-white shadow-lg shadow-[#596744]/25">
              <Leaf size={24} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">FAVEDA</p>
              <p className="text-sm text-[#697555]">Gestion intelligente du stock</p>
            </div>
          </div>

          <div className="login-fade-up max-w-xl" style={{ animationDelay: "120ms" }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#596744]/15 bg-white/55 px-4 py-2 text-sm font-medium text-[#596744] shadow-sm backdrop-blur">
              <Sparkles size={16} />
              Tableau de bord sécurisé
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-[#2d3a1e] xl:text-6xl">
              Gérez vos stocks avec plus de clarté.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[#596744]">
              Suivi des mouvements, alertes de seuil, inventaire et rapports dans une interface simple pour l'équipe FAVEDA.
            </p>
          </div>

          <div className="login-fade-up grid max-w-2xl grid-cols-3 gap-4" style={{ animationDelay: "220ms" }}>
            {[
              { icon: PackageCheck, label: "Stock suivi", value: "Temps réel" },
              { icon: ShieldCheck, label: "Accès protégé", value: "Par rôle" },
              { icon: Leaf, label: "Flux clair", value: "FAVEDA" },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur">
                <item.icon className="mb-4 text-[#596744]" size={22} />
                <p className="text-sm font-semibold text-[#2d3a1e]">{item.value}</p>
                <p className="mt-1 text-xs text-[#697555]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="login-fade-up w-full max-w-md" style={{ animationDelay: "80ms" }}>
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#596744] text-white shadow-lg shadow-[#596744]/25">
                <Leaf size={24} />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight">FAVEDA</p>
                <p className="text-sm text-[#697555]">Gestion de stock</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-[#4F5C3D]/15 backdrop-blur-xl sm:p-8">
              <div className="mb-7">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F3F3] text-[#596744]">
                  <Lock size={22} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Connexion</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Entrez vos identifiants pour accéder au tableau de bord.
                </p>
              </div>

              {error && (
                <div className="login-shake mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">Adresse email</label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#596744]" size={18} />
                    <input
                      type="email"
                      className="h-12 w-full rounded-2xl border border-[#D9D7D2] bg-white/90 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-[#596744] focus:ring-4 focus:ring-[#596744]/15"
                      placeholder="admin@faveda.ci"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Mot de passe</label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#596744]" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="h-12 w-full rounded-2xl border border-[#D9D7D2] bg-white/90 pl-12 pr-12 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-[#596744] focus:ring-4 focus:ring-[#596744]/15"
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-[#F3F3F3] hover:text-[#596744]"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#596744] px-4 font-semibold text-white shadow-lg shadow-[#596744]/25 transition-all hover:-translate-y-0.5 hover:bg-[#4F5C3D] hover:shadow-xl hover:shadow-[#596744]/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white login-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-2xl bg-[#F3F3F3] px-4 py-3 text-center text-xs text-[#697555]">
                Compte par défaut : <span className="font-mono font-semibold text-[#4F5C3D]">admin@faveda.ci</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
