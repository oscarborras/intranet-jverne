import { KanbanCard } from "./KanbanCard";
import type { KanbanItem, ColumnConfig } from "./KanbanBoard";

interface Props {
  config: ColumnConfig<string>;
  items: KanbanItem[];
  allStatuses: { key: string; label: string }[];
  onStatusChange: (id: number, newStatus: string) => void;
  onItemClick?: (item: KanbanItem) => void;
  updating: number | null;
  showStatusChange?: boolean;
}

export function KanbanColumn({ config, items, allStatuses, onStatusChange, onItemClick, updating, showStatusChange = true }: Props) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col rounded-xl overflow-hidden bg-gray-100">
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${config.headerColor}`}
      >
        <h3 className="font-semibold text-white text-sm">{config.label}</h3>
        <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-6">No hay peticiones en esta categoría</p>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              allStatuses={allStatuses}
              currentStatus={config.key}
              onStatusChange={(newStatus) => onStatusChange(item.id, newStatus)}
              onClick={() => onItemClick?.(item)}
              isUpdating={updating === item.id}
              showStatusChange={showStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
