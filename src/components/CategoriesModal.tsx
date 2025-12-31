// src/components/categories/CategoriesModal.tsx
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Save, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CategoriesModal({ open, onOpenChange }: Props) {
  const { categories, loading, createCategory, renameCategory, deleteCategory, setCategoryEnabled } = useCategories();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");


  

  const sorted = useMemo(() => {
    const copy = [...categories];
    copy.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return copy;
  }, [categories]);

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditName(current);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await renameCategory(editingId, editName);
      cancelEdit();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo editar la categoría");
    }
  };

  const add = async () => {
    try {
      await createCategory(newName);
      setNewName("");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo crear la categoría");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar categorías</DialogTitle>
        </DialogHeader>

        {/* Crear */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la categoría"
          />
          <Button onClick={add} disabled={!newName.trim() || loading}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        {/* Lista */}
        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay categorías.</p>
          ) : (
            sorted.map((c) => (
              <div key={c.id} className="flex items-center gap-2 border border-border rounded-lg p-2">
                <Switch
                  checked={!!c.enabled}
                  onCheckedChange={(v) => setCategoryEnabled(c.id, v)}
                />

                <div className="flex-1">
                  {editingId === c.id ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    <p className="font-medium">{c.name}</p>
                  )}
                </div>

                {editingId === c.id ? (
                  <>
                    <Button variant="outline" size="icon" onClick={saveEdit}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" onClick={() => startEdit(c.id, c.name)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteCategory(c.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}