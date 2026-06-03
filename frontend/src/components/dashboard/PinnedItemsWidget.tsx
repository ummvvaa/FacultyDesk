import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, FileText, BookOpen, ClipboardList, Link, X, GripVertical,
  Pencil, Check,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePinnedItems, useUnpinMutation, useReorderPinsMutation } from '../../hooks/usePinnedItems';
import { PinnedItem } from '../../types';
import { toast } from '../../hooks/useToast';

const ITEM_ICONS: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  ClipboardList: <ClipboardList className="h-4 w-4" />,
  Link: <Link className="h-4 w-4" />,
  Bookmark: <Bookmark className="h-4 w-4" />,
};

function SortablePinItem({
  pin,
  editMode,
  onUnpin,
}: {
  pin: PinnedItem;
  editMode: boolean;
  onUnpin: (id: number) => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pin.id,
    disabled: !editMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 transition-all cursor-pointer ${isDragging ? 'shadow-lg' : ''}`}
    >
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <button
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        onClick={() => !editMode && navigate(pin.navigateTo)}
        tabIndex={editMode ? -1 : 0}
      >
        <span className="text-primary/70 shrink-0">
          {ITEM_ICONS[pin.icon] ?? <Bookmark className="h-4 w-4" />}
        </span>
        <span className="text-sm truncate">{pin.title}</span>
      </button>

      {editMode && (
        <button
          onClick={() => onUnpin(pin.id)}
          className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
          title="Unpin"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function PinnedItemsWidget() {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const { data: pins = [], isLoading } = usePinnedItems();
  const unpinMutation = useUnpinMutation();
  const reorderMutation = useReorderPinsMutation();
  const [localPins, setLocalPins] = useState<PinnedItem[] | null>(null);

  const displayPins = localPins ?? pins;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = displayPins.findIndex(p => p.id === active.id);
      const newIndex = displayPins.findIndex(p => p.id === over.id);
      const reordered = arrayMove(displayPins, oldIndex, newIndex);
      setLocalPins(reordered);
      reorderMutation.mutate(reordered.map(p => p.id));
    }
  }

  function handleUnpin(id: number) {
    unpinMutation.mutate(id, {
      onSuccess: () => {
        setLocalPins(null);
        toast({ description: t('pinned.unpinned') });
      },
    });
  }

  function handleToggleEdit() {
    if (editMode) {
      setLocalPins(null);
    }
    setEditMode(e => !e);
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-2">
        <div className="h-5 w-24 bg-muted rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-9 w-full bg-muted rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Bookmark className="h-4 w-4 text-primary" />
          {t('pinned.title')}
          {displayPins.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({displayPins.length})</span>
          )}
        </div>
        {displayPins.length > 0 && (
          <button
            onClick={handleToggleEdit}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {editMode
              ? <><Check className="h-3.5 w-3.5" /> {t('pinned.done')}</>
              : <><Pencil className="h-3.5 w-3.5" /> {t('pinned.edit')}</>
            }
          </button>
        )}
      </div>

      {displayPins.length === 0 ? (
        <p className="text-xs text-muted-foreground leading-relaxed py-2">{t('pinned.empty')}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={displayPins.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence initial={false}>
              {displayPins.slice(0, 10).map(pin => (
                <motion.div
                  key={pin.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <SortablePinItem
                    pin={pin}
                    editMode={editMode}
                    onUnpin={handleUnpin}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
