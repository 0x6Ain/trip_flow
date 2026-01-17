import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Place } from "../../types/trip";
import { SortablePlace } from "./SortablePlace";

interface PlaceListProps {
  places: Place[];
  onReorder: (places: Place[]) => void;
  onRemove: (placeId: string) => void;
}

export const PlaceList = ({ places, onReorder, onRemove }: PlaceListProps) => {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = places.findIndex((p) => p.id === active.id);
      const newIndex = places.findIndex((p) => p.id === over.id);

      const reorderedPlaces = arrayMove(places, oldIndex, newIndex);

      // Update order values
      const updatedPlaces = reorderedPlaces.map((place, index) => ({
        ...place,
        order: index + 1.0,
      }));

      onReorder(updatedPlaces);
    }
  };

  if (places.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">아직 추가된 장소가 없습니다</p>
        <p className="text-sm">위에서 장소를 검색하여 추가해보세요</p>
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {places.map((place, index) => (
            <SortablePlace
              key={place.id}
              place={place}
              index={index}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
