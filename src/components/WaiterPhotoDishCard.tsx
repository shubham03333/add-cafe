'use client';

import { useEffect, useState } from 'react';
import { MenuItem } from '@/types';
import { loadDishPhoto } from '@/lib/dish-photo-cache';

type WaiterPhotoDishCardProps = {
  item: MenuItem;
  photoSrc?: string;
  inCartQty: number;
  isPopular: boolean;
  isFavorite: boolean;
  canOrder: boolean;
  onAdd: () => void;
  onToggleFavorite: () => void;
};

export default function WaiterPhotoDishCard({
  item,
  photoSrc,
  inCartQty,
  isPopular,
  isFavorite,
  canOrder,
  onAdd,
  onToggleFavorite,
}: WaiterPhotoDishCardProps) {
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!photoSrc) {
      setCachedSrc(null);
      return;
    }
    let cancelled = false;
    void loadDishPhoto(item.id, photoSrc).then((url) => {
      if (!cancelled) setCachedSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id, photoSrc]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onAdd}
        disabled={!canOrder}
        className={`w-full overflow-hidden rounded-lg text-left shadow-md min-h-[96px] ${
          canOrder ? 'bg-zinc-900' : 'bg-gray-400 opacity-50 cursor-not-allowed'
        }`}
      >
        <div className="relative aspect-[4/3] w-full bg-zinc-800">
          {cachedSrc || photoSrc ? (
            <img
              src={cachedSrc || photoSrc}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-end bg-gradient-to-br from-red-600 to-red-800 p-2">
              <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">{item.name}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1.5">
            <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">{item.name}</p>
            <p className="mt-0.5 text-[10px] font-bold text-white">{`₹${Number(item.price || 0).toLocaleString('en-IN')}`}</p>
          </div>
        </div>
      </button>

      {isPopular ? (
        <span className="absolute bottom-1 left-1 rounded bg-amber-400 px-1 py-0.5 text-[8px] font-bold text-amber-950 pointer-events-none">
          Popular
        </span>
      ) : null}

      {inCartQty > 0 ? (
        <span className="absolute bottom-1 right-6 min-w-[18px] rounded-full bg-green-600 px-1 text-center text-[10px] font-bold text-white pointer-events-none">
          {inCartQty}
        </span>
      ) : null}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="absolute top-1 right-1 p-1 rounded-full bg-white/80 hover:bg-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={isFavorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
      >
        <svg
          className={`w-3 h-3 ${isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>
    </div>
  );
}
