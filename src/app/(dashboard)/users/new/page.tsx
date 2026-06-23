import { UserCreateForm } from "@/components/users/UserCreateForm";

export default function NewUserPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouvel utilisateur</h1>
          <p className="page-subtitle">Créez un accès administrateur, gestionnaire, surveillant ou commercial.</p>
        </div>
      </div>
      <UserCreateForm />
    </div>
  );
}
