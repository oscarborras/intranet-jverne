"use client";

import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import type { PeticionTIC, PeticionMantenimiento, PeticionTICEstado, PeticionMantenimientoEstado } from "@/lib/types";

export type KanbanItem = (PeticionTIC | PeticionMantenimiento) & { tipo: "TIC" | "MNT" };

export interface ColumnConfig<TStatus extends string> {
  key: TStatus;
  label: string;
  color: string;
  headerColor: string;
}

interface KanbanBoardProps<TStatus extends string> {
  columns: ColumnConfig<TStatus>[];
  items: KanbanItem[];
  onStatusChange: (id: number, newStatus: TStatus) => Promise<void>;
  onItemClick?: (item: KanbanItem) => void;
  showStatusChange?: boolean;
}

export function KanbanBoard<TStatus extends string>({
  columns,
  items,
  onStatusChange,
  onItemClick,
  showStatusChange = true,
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
        const colItems = items.filter((i) => i.estado === col.key);
        return (
          <KanbanColumn
            key={col.key}
            config={col}
            items={colItems}
            allStatuses={columns.map((c) => ({ key: c.key, label: c.label }))}
            onStatusChange={(id, status) => handleStatusChange(id, status as TStatus)}
            onItemClick={onItemClick}
            updating={updating}
            showStatusChange={showStatusChange}
          />
        );
      })}
    </div>
  );
}
