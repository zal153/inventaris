"use client";

import { useState, useEffect, useActionState } from "react";
import { getUsers, createUser, toggleUserStatus, resetUserPassword } from "@/actions/settings.actions";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, ShieldAlert, KeyRound, Loader2, UserMinus, UserCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UserProps {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

interface UserListClientProps {
  users: UserProps[];
}

export function UserListClient({ users }: UserListClientProps) {
  const router = useRouter();

  // Dialog and Actions States
  const [resettingUser, setResettingUser] = useState<UserProps | null>(null);
  const [statusUserId, setStatusUserId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Form states for Create User
  const [createState, createFormAction, isCreatePending] = useActionState(createUser, null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PETUGAS");

  // Form states for Reset Password
  const resetFormAction = resettingUser
    ? resetUserPassword.bind(null, resettingUser.id)
    : async () => ({ success: false, message: "" });
  const [resetState, resetAction, isResetPending] = useActionState(resetFormAction, null);
  const [newPassword, setNewPassword] = useState("");

  // Create User response triggers
  useEffect(() => {
    if (createState) {
      if (createState.success) {
        toast.success(createState.message);
        setName("");
        setEmail("");
        setPassword("");
        setRole("PETUGAS");
        router.refresh();
      } else {
        toast.error(createState.message);
      }
    }
  }, [createState, router]);

  // Reset password response triggers
  useEffect(() => {
    if (resetState) {
      if (resetState.success) {
        toast.success(resetState.message);
        setNewPassword("");
        setResettingUser(null);
      } else {
        toast.error(resetState.message);
      }
    }
  }, [resetState]);

  // Toggle user status trigger
  const handleToggleStatus = async () => {
    if (!statusUserId) return;
    setIsToggling(true);
    try {
      const res = await toggleUserStatus(statusUserId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Gagal mengubah status user");
    } finally {
      setIsToggling(false);
      setStatusUserId(null);
    }
  };

  const columns: ColumnDef<UserProps>[] = [
    {
      accessorKey: "name",
      header: "Nama Pengguna",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground leading-tight">{row.original.name}</p>
          <span className="text-[10px] text-muted-foreground font-mono">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Wewenang (Role)",
      cell: ({ row }) => {
        const isAdmin = row.original.role === "ADMIN";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
              isAdmin
                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                : "bg-blue-500/10 text-primary border-blue-500/20"
            }`}
          >
            {row.original.role}
          </span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${
              isActive
                ? "bg-success/10 text-success border-success/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {isActive ? "Aktif" : "Nonaktif"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1.5">
            {/* Toggle Status */}
            <button
              onClick={() => setStatusUserId(item.id)}
              className={`p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition`}
              title={item.isActive ? "Nonaktifkan User" : "Aktifkan User"}
            >
              {item.isActive ? <UserMinus className="h-4 w-4 text-warning" /> : <UserCheck className="h-4 w-4 text-success" />}
            </button>

            {/* Reset Password */}
            <button
              onClick={() => setResettingUser(item)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition"
              title="Reset Password"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola hak wewenang akses login administrator atau petugas gudang di sistem."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Form: Add User */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-bold text-foreground text-sm tracking-wide uppercase pb-2 border-b border-border">
              Tambah Pengguna Baru
            </h3>

            <form action={createFormAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                  Nama Lengkap <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="E.g., Budi Utomo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isCreatePending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                  Email Akun <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="E.g., budi@stocksync.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isCreatePending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                  Password Login <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isCreatePending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                  Role Wewenang <span className="text-destructive">*</span>
                </label>
                <select
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  disabled={isCreatePending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option value="PETUGAS">PETUGAS GUDANG</option>
                  <option value="ADMIN">ADMINISTRATOR</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatePending}
                  className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition disabled:opacity-50"
                >
                  {isCreatePending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Tambah Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side DataTable */}
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={users}
            searchKey="name"
            searchPlaceholder="Cari nama pengguna..."
          />
        </div>
      </div>

      {/* Toggle User Status Warning dialog */}
      <ConfirmDialog
        isOpen={!!statusUserId}
        onClose={() => setStatusUserId(null)}
        onConfirm={handleToggleStatus}
        title="Ubah Status Pengguna?"
        description="Apakah Anda yakin ingin mengubah wewenang aktif/nonaktif akun pengguna ini? Pengguna yang dinonaktifkan tidak akan bisa masuk/login ke dalam sistem lagi."
        confirmLabel="Ya, Ubah"
        cancelLabel="Batal"
        isDestructive={false}
        isLoading={isToggling}
      />

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setResettingUser(null)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-lg animate-scale-in z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Reset Password</h3>
              <button
                onClick={() => setResettingUser(null)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Masukkan password baru untuk pengguna <span className="font-semibold text-foreground">{resettingUser.name}</span>.
            </p>
            <form action={resetAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Password Baru</label>
                <input
                  type="password"
                  name="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 Karakter"
                  required
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted/30"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResetPending}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  {isResetPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Simpan Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
