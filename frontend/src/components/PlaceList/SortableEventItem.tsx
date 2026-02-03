import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableEventItemProps {
  event: any;
  index: number;
  onEdit: (eventId: number) => void;
  onDelete: (eventId: number) => void;
}

export const SortableEventItem = ({
  event,
  index,
  onEdit,
  onDelete,
}: SortableEventItemProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg relative">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-move hover:bg-gray-200 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
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

        {/* Order Number */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white font-bold rounded-full">
          {index + 1}
        </div>

        {/* Event Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 mb-1">{event.name}</div>
          {event.time && (
            <div className="text-sm text-gray-600 mb-1">🕐 {event.time}</div>
          )}
          {event.memo && (
            <div className="text-sm text-gray-600 mb-1">📝 {event.memo}</div>
          )}
        </div>

        {/* Menu Button */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(event.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  편집
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(event.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  삭제
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Route Info */}
      {event.nextRoute && (
        <div className="flex items-center gap-2 py-2 pl-12 text-sm text-gray-600">
          <span>↓</span>
          <span className="text-blue-600 font-medium">
            {Math.floor(event.nextRoute.durationMin / 60)}시간{" "}
            {event.nextRoute.durationMin % 60}분
          </span>
          <span className="text-gray-400">•</span>
          <span>{event.nextRoute.distanceKm.toFixed(1)}km</span>
          <span className="text-gray-400">•</span>
          <span>{event.nextRoute.travelMode}</span>
        </div>
      )}
    </div>
  );
};
