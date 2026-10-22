'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Brand } from '@/src/features/listings/domain/brand-repository';
import { useBrands } from '../hooks/use-brands';

const FIELD_CLASS =
  'w-full rounded-2xl border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none';

interface BrandSelectFieldProps {
  value: number | null;
  onSelect: (brand: Brand) => void;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function BrandSelectField({ value, onSelect }: BrandSelectFieldProps) {
  const { data: brands, isPending, isError } = useBrands();

  const [query, setQuery] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = brands?.find((brand) => brand.id === value);
  const inputValue = query ?? selected?.name ?? '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    if (!brands) return [];
    const normalizedQuery = normalize(inputValue.trim());
    if (!normalizedQuery) return brands;
    return brands.filter((brand) =>
      normalize(brand.name)
        .split(/\s+/)
        .some((word) => word.startsWith(normalizedQuery)),
    );
  }, [brands, inputValue]);

  const showSuggestions = isOpen && inputValue.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        value={inputValue}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        aria-label="Marca"
        placeholder="Marca *"
        autoComplete="off"
        className={FIELD_CLASS}
      />

      {showSuggestions ? (
        <ul className="scrollbar-hide absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-neutral-200 bg-white shadow-lg">
          {isPending ? (
            <li className="px-4 py-3 text-base text-neutral-400">Cargando marcas…</li>
          ) : null}
          {isError ? (
            <li className="px-4 py-3 text-base text-neutral-500">
              No se pudieron cargar las marcas.
            </li>
          ) : null}
          {!isPending && !isError && matches.length === 0 ? (
            <li className="px-4 py-3 text-base text-neutral-500">Sin coincidencias.</li>
          ) : null}
          {matches.map((brand) => (
            <li key={brand.id} className="border-b border-neutral-100 last:border-b-0">
              <button
                type="button"
                disabled={!brand.available}
                aria-disabled={!brand.available}
                onClick={() => {
                  if (!brand.available) return;
                  onSelect(brand);
                  setQuery(brand.name);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm ${
                  !brand.available
                    ? 'cursor-not-allowed text-neutral-400'
                    : brand.id === value
                      ? 'text-brand font-medium'
                      : 'text-neutral-900'
                }`}
              >
                {!brand.available && brand.unavailableReason ? (
                  /* Solo las suspendidas llevan el par centrado. Las
                     disponibles conservan su alineacion a la izquierda: son
                     mas de cien y centrarlas cambiaria la lista entera.
                     En desktop la fila es ancha, asi que separar nombre y
                     motivo a los extremos los deja tan lejos que no se leen
                     como una sola cosa.
                     Los 2px del nombre son ajuste optico —16px contra 14px—
                     por eso `relative` y no margen: no cambia la altura. */
                  <span className="flex justify-between items-center gap-2">
                    <span className="relative truncate text-sm">{brand.name}</span>
                    <span className="shrink-0 text-[10px] text-neutral-400">
                      {brand.unavailableReason}
                    </span>
                  </span>
                ) : (
                  brand.name
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
