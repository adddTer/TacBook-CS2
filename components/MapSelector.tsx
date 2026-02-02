
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
    <div className="w-full h-full flex items-center">
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar px-4 gap-2 snap-x w-full items-center"
      >
        {MAPS.map((map) => {
          const isActive = currentMap === map.id;
          return (
            <button
              key={map.id}
              ref={isActive ? selectedRef : null}
              onClick={(e) => { e.stopPropagation(); onChange(map.id); }}
              className={`
                snap-center shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border whitespace-nowrap
                ${isActive 
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black border-transparent' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'}
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
