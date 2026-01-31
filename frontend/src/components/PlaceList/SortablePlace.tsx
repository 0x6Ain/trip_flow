import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Place } from "../../types/trip";

interface SortablePlaceProps {
  place: Place;
  index: number;
  dayColor?: string;
  onRemove: (placeId: string) => void;
  onPlaceClick?: (place: Place) => void;
}

export const SortablePlace = ({ place, index, dayColor = "#4285F4", onRemove, onPlaceClick }: SortablePlaceProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Day color indicator */}
      <div 
        className="flex-shrink-0 w-1 h-10 rounded-full"
        style={{ backgroundColor: dayColor }}
      />

      {/* Place info */}
      <div 
        className="flex-1 min-w-0 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
        onClick={() => onPlaceClick?.(place)}
      >
        <div className="font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">
          {place.name}
        </div>
        <div className="text-xs text-gray-400">
          클릭하여 상세정보 보기
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(place.id)}
        className="flex-shrink-0 text-red-500 hover:text-red-700 p-2"
        title="삭제"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};
