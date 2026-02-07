import { useState, useRef, useEffect } from "react";
import type { TravelMode } from "../../types/trip";

interface TransportSelectorProps {
  fromEventId: number;
  toEventId: number;
  currentMode: TravelMode;
  distance?: number;
  durations: Partial<Record<TravelMode, number>>;
  onModeChange: (mode: TravelMode) => void;
  isLoading?: boolean;
}

const TRANSPORT_OPTIONS = [
  {
    mode: "WALKING" as TravelMode,
    icon: "👣",
    label: "도보",
  },
  {
    mode: "DRIVING" as TravelMode,
    icon: "🚗",
    label: "차량",
  },
  {
    mode: "TRANSIT" as TravelMode,
    icon: "🚌",
    label: "대중교통",
  },
] as const;

export const TransportSelector = ({ currentMode, distance, durations, onModeChange, isLoading = false }: TransportSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = TRANSPORT_OPTIONS.find((opt) => opt.mode === currentMode);
  const currentDuration = durations[currentMode] ?? 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleModeClick = async (mode: TravelMode) => {
    if (mode === currentMode || isChanging) return;

    setIsChanging(true);
    setIsOpen(false);
    try {
      await onModeChange(mode);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="relative flex justify-center py-2">
      {/* Connector Line */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -z-10" />

      {/* Compact Button */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isChanging || isLoading}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg
            bg-white border border-gray-200 hover:border-gray-300
            transition-all shadow-sm hover:shadow-md
            ${isChanging || isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <span className="text-sm">{currentOption?.icon}</span>
          <span className="text-xs font-medium text-gray-700">{currentOption?.label}</span>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-600">{currentDuration}분</span>
          {distance !== undefined && (
            <>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-600">{distance.toFixed(1)}km</span>
            </>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>

          {/* Loading Spinner */}
          {(isChanging || isLoading) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
            </div>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[200px]">
            {TRANSPORT_OPTIONS.map((option) => {
              const isActive = currentMode === option.mode;
              const duration = durations[option.mode] ?? 0;

              return (
                <button
                  key={option.mode}
                  onClick={() => handleModeClick(option.mode)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2
                    transition-colors
                    ${isActive ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{option.icon}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{duration}분</span>
                    {isActive && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
