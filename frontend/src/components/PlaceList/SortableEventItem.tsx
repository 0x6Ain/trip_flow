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
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors group">
        {/* Order Number */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white text-sm font-bold rounded-full cursor-move"
        >
          {index + 1}
        </div>

        {/* Event Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">{event.name}</div>
          <div className="flex items-center gap-2 mt-1">
            {event.time && (
              <div className="text-xs text-gray-600">{event.time}</div>
            )}
            {event.time && event.memo && (
              <span className="text-gray-300">•</span>
            )}
            {event.memo && (
              <div className="text-xs text-gray-600 truncate">{event.memo}</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(event.id)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="편집"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-600"
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
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="p-1.5 hover:bg-red-100 rounded transition-colors"
            title="삭제"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-red-600"
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
          </button>
        </div>
      </div>
    </div>
  );
};
