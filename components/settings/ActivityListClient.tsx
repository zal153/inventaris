"use client";

import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDateTime } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, ShieldAlert, KeyRound, Edit, Plus, Trash2 } from "lucide-react";

interface ActivityLogProps {
  id: string;
  userId: string;
  action: string;
  tableName: string;
  description: string;
  createdAt: Date;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface ActivityListClientProps {
  logs: ActivityLogProps[];
}

export function ActivityListClient({ logs }: ActivityListClientProps) {
  const [selectedAction, setSelectedAction] = useState("all");

  // Client side filtering for optimal performance
  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== "all" && log.action !== selectedAction) return false;
    return true;
  });

  const columns: ColumnDef<ActivityLogProps>[] = [
    {
      accessorKey: "user.name",
      header: "Petugas",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground leading-tight">{row.original.user.name}</p>
          <span className="text-[10px] text-muted-foreground font-mono">{row.original.user.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Aksi",
      cell: ({ row }) => {
        const action = row.original.action;
        let badgeClass = "bg-muted text-muted-foreground border-border";
        let Icon = Activity;

        if (action === "CREATE") {
          badgeClass = "bg-success/10 text-success border-success/20";
          Icon = Plus;
        } else if (action === "UPDATE") {
          badgeClass = "bg-primary/10 text-primary border-primary/20";
          Icon = Edit;
        } else if (action === "DELETE") {
          badgeClass = "bg-destructive/10 text-destructive border-destructive/20";
          Icon = Trash2;
        } else if (action === "LOGIN" || action === "LOGOUT") {
          badgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
          Icon = KeyRound;
        }

        return (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${badgeClass}`}>
            <Icon className="h-3 w-3" />
            {action}
          </span>
        );
      },
    },
    {
      accessorKey: "tableName",
      header: "Tabel Data",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-md capitalize">
          {row.original.tableName}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Deskripsi Aktivitas",
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-xs leading-normal">
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Waktu Pencatatan",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs font-mono">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
  ];

  const filterComponent = (
    <div className="flex items-center gap-2">
      <select
        value={selectedAction}
        onChange={(e) => setSelectedAction(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        <option value="all">Semua Tipe Aksi</option>
        <option value="CREATE">CREATE (Tambah)</option>
        <option value="UPDATE">UPDATE (Ubah)</option>
        <option value="DELETE">DELETE (Hapus)</option>
        <option value="LOGIN">LOGIN</option>
        <option value="LOGOUT">LOGOUT</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log Aktivitas"
        description="Pantau seluruh riwayat aksi penting, pembuatan data, modifikasi stok, dan log masuk petugas."
      />

      <DataTable
        columns={columns}
        data={filteredLogs}
        searchKey="description"
        searchPlaceholder="Cari deskripsi aktivitas..."
        filterComponent={filterComponent}
      />
    </div>
  );
}
