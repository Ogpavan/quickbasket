"use client";

import { Building2, Check, Home, Pencil, Trash2 } from "lucide-react";

export interface AddressCardData {
  id?: number;
  label?: string;
  name?: string;
  house_no?: string;
  building_name?: string;
  floor?: string;
  area?: string;
  landmark?: string;
  address_line?: string;
  city?: string;
  phone?: string;
}

interface AddressCardProps {
  data: AddressCardData;
  selected?: boolean;
  isDefault?: boolean;
  onSelect?: (address: AddressCardData) => void;
  onSetDefault?: (address: AddressCardData) => void;
  onEdit?: (address: AddressCardData) => void;
  onDelete?: (address: AddressCardData) => void;
  iconOnlyDelete?: boolean;
  className?: string;
}

export function AddressCard({
  data,
  selected,
  isDefault,
  onSelect,
  onSetDefault,
  onEdit,
  onDelete,
  iconOnlyDelete,
  className
}: AddressCardProps) {
  const label = data.label || "Address";
  const addressText = [
    data.name,
    data.house_no,
    data.building_name,
    data.floor ? `Floor ${data.floor}` : null,
    data.area,
    data.landmark,
    data.address_line,
    data.city
  ]
    .filter(Boolean)
    .join(", ");

  const isOffice = label.toLowerCase().includes("office");
  const Icon = isOffice ? Building2 : Home;

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : -1}
      onClick={() => onSelect?.(data)}
      onKeyDown={(event) => {
        if (!onSelect) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(data);
        }
      }}
      className={`flex w-full items-start gap-3 rounded-md border bg-white p-3 text-left transition ${
        selected || isDefault ? "border-brand-yellow shadow-sm" : "border-brand-line/70 hover:border-brand-yellow/60"
      } ${className ?? ""}`}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 text-brand-ink">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSetDefault?.(data);
            }}
            aria-pressed={Boolean(isDefault)}
            className="inline-flex items-center"
          >
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                isDefault ? "border-brand-green bg-brand-green" : "border-brand-line"
              }`}
            >
              {isDefault ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </span>
          </button>
          <p className="text-sm font-semibold text-brand-ink">{label}</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">{addressText}</p>
      </div>
      <div className="flex items-center gap-1">
        {onEdit ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(data);
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-ink transition hover:bg-brand-cream"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(data);
            }}
            aria-label="Delete address"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 ${
              iconOnlyDelete ? "h-8 w-8 justify-center" : ""
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {iconOnlyDelete ? null : "Delete"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
