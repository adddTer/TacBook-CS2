
import React, { useRef, useEffect } from 'react';
import { MapId } from '../types';
import { MAPS } from '../constants';

interface MapSelectorProps {
  currentMap: MapId;
  onChange: (mapId: MapId) => void;
}

export const MapSelector: React.FC<MapSelectorProps> = ({ currentMap, onChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = selectedRef.current;
      const left = element.offsetLeft - container.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);
      container.scrollTo({ left: left, behavior: 'smooth' });
    }
  }, [currentMap]);

  return (
    <div className="w-full max-w-[200px] sm:max-w-xs relative group">
        {/* Fading Edges to indicate scroll */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white dark:from-neutral-950 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white dark:from-neutral-950 to-transparent z-10 pointer-events-none"></div>

        <div 
            ref={scrollRef}
            className="flex overflow-x-auto no-scrollbar gap-1 snap-x w-full items-center py-1"
        >
            {MAPS.map((map) => {
            const isActive = currentMap === map.id;
            return (
                <button
                key={map.id}
                ref={isActive ? selectedRef : null}
                onClick={(e) => { e.stopPropagation(); onChange(map.id); }}
                className={`
                    snap-center shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border whitespace-nowrap
                    ${isActive 
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black border-transparent shadow-sm' 
                    : 'bg-transparent text-neutral-500 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                `}
                >
                {map.name}
                </button>
            );
            })}
        </div>
    </div>
  );
};
