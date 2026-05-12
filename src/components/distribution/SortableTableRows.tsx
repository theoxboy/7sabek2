"use client";

import type { HTMLAttributes, ReactNode } from "react";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type HandleProps = HTMLAttributes<HTMLElement> & {
  ref: (node: HTMLElement | null) => void;
};

type SortableTableRowsProps<Row extends { id: string }> = {
  rows: Row[];
  onReorder: (rows: Row[]) => void;
  renderRow: (
    row: Row,
    options: {
      handleProps: HandleProps;
      isDragging: boolean;
    }
  ) => ReactNode;
};

function SortableRow<Row extends { id: string }>({
  row,
  renderRow,
}: {
  row: Row;
  renderRow: SortableTableRowsProps<Row>["renderRow"];
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} aria-live="polite">
      {renderRow(row, {
        handleProps: {
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        },
        isDragging,
      })}
    </div>
  );
}

export function SortableTableRows<Row extends { id: string }>({
  rows,
  onReorder,
  renderRow,
}: SortableTableRowsProps<Row>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const oldIndex = rows.findIndex((row) => row.id === activeId);
    const newIndex = rows.findIndex((row) => row.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(rows, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={rows} strategy={verticalListSortingStrategy}>
        <div className="grid gap-2">
          {rows.map((row) => (
            <SortableRow key={row.id} row={row} renderRow={renderRow} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
