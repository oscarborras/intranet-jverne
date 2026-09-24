"use client";

import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import type { PeticionTIC, PeticionMantenimiento, PeticionTICEstado, PeticionMantenimientoEstado } from "@/lib/types";

export type KanbanItem = (PeticionTIC | PeticionMantenimiento) & { tipo: "TIC" | "MNT" };

// Optional extras shown on a column: a subtitle under the header and a footer link
export interface ColumnInfo {
  subtitle?: string;
  footerHref?: string;
  footerLabel?: string;
}

export interface ColumnConfig<TStatus extends string> {
  key: TStatus;
  label: string;
  color: string;
  headerColor: string;
  // "prioridad": most urgent first, oldest first within the same priority (default)
  // "finalizada_at": most recently finished first
  sortBy?: "prioridad" | "finalizada_at";
}

const PRIORITY_RANK: Record<KanbanItem["prioridad"], number> = { urgente: 0, alta: 1, normal: 2, baja: 3 };

// Parsed as Date: DB values carry "+02:00" while locally set ones end in "Z"
function toTime(value: string | null, fallback: string) {
  return new Date(value ?? fallback).getTime();
}

function compareItems(a: KanbanItem, b: KanbanItem, sortBy: "prioridad" | "finalizada_at") {
  if (sortBy === "finalizada_at") {
    return toTime(b.finalizada_at, b.created_at) - toTime(a.finalizada_at, a.created_at);
  }
  return (
    PRIORITY_RANK[a.prioridad] - PRIORITY_RANK[b.prioridad] ||
    toTime(a.created_at, a.created_at) - toTime(b.created_at, b.created_at)
  );
}

interface KanbanBoardProps<TStatus extends string> {
  columns: ColumnConfig<TStatus>[];
  items: KanbanItem[];
  onStatusChange: (id: number, newStatus: TStatus) => Promise<void>;
  onItemClick?: (item: KanbanItem) => void;
  showStatusChange?: boolean;
  canDeleteItem?: (item: KanbanItem) => boolean;
  onDeleteItem?: (item: KanbanItem) => void;
  columnInfo?: Partial<Record<TStatus, ColumnInfo>>;
}

export function KanbanBoard<TStatus extends string>({
  columns,
  items,
  onStatusChange,
  onItemClick,
  showStatusChange = true,
  canDeleteItem,
  onDeleteItem,
  columnInfo,
}: KanbanBoardProps<TStatus>) {
  const [updating, setUpdating] = useState<number | null>(null);

  async function handleStatusChange(id: number, newStatus: TStatus) {
    setUpdating(id);
    await onStatusChange(id, newStatus);
    setUpdating(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]">
      {columns.map((col) => {
        const sortBy = col.sortBy ?? "prioridad";
        const colItems = items
          .filter((i) => i.estado === col.key)
          .sort((a, b) => compareItems(a, b, sortBy));
        return (
          <KanbanColumn
            key={col.key}
            config={col}
            info={columnInfo?.[col.key]}
            items={colItems}
            allStatuses={columns.map((c) => ({ key: c.key, label: c.label }))}
            onStatusChange={(id, status) => handleStatusChange(id, status as TStatus)}
            onItemClick={onItemClick}
            updating={updating}
            showStatusChange={showStatusChange}
            canDeleteItem={canDeleteItem}
            onDeleteItem={onDeleteItem}
          />
        );
      })}
    </div>
  );
}
