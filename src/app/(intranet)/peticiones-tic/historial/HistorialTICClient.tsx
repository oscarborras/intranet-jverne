"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HistorialCard } from "@/components/peticiones/HistorialCard";
import { PeticionTICModal } from "../PeticionTICModal";
import type { PeticionTIC } from "@/lib/types";

interface Props {
  peticiones: PeticionTIC[];
  canManage: boolean;
  canDelete: boolean;
  userId: string;
}

export function HistorialTICClient({ peticiones, canManage, canDelete, userId }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<PeticionTIC | null>(null);

  return (
    <>
      <div className="space-y-2">
        {peticiones.map((p) => (
          <HistorialCard
            key={p.id}
            codigo={p.codigo}
            titulo={p.titulo}
            prioridad={p.prioridad}
            autorName={p.autor?.full_name ?? "—"}
            asignadoName={p.asignado?.full_name}
            descripcion={p.descripcion}
            fotoPath={p.foto_path}
            fotoNombre={p.foto_nombre}
            createdAt={p.created_at}
            finalizadaAt={p.finalizada_at}
            onClick={() => setSelected(p)}
          />
        ))}
      </div>

      {selected && (
        <PeticionTICModal
          peticion={selected}
          canManage={canManage}
          canDelete={canDelete}
          userId={userId}
          onClose={() => setSelected(null)}
          // A reopened or deleted request leaves the history: reload the list from the server
          onUpdate={() => router.refresh()}
        />
      )}
    </>
  );
}
