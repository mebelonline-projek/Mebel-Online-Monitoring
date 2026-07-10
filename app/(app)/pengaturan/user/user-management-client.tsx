"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser, deleteUser, type UserRow } from "@/lib/users";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ShieldCheck, UserRound, ArrowLeft } from "lucide-react";

interface Props {
  users: UserRow[];
  currentUserId: string;
}

export function UserManagementClient({ users: initialUsers, currentUserId }: Props) {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "KARYAWAN" as const });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setForm({ email: "", password: "", name: "", role: "KARYAWAN" });
    setEditingUser(null);
  };

  const openAddModal = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditModal = (user: UserRow) => {
    setEditingUser(user);
    setForm({ email: user.email, password: "", name: user.name, role: "KARYAWAN" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const result = await updateUser(editingUser.id, {
          name: form.name,
          role: editingUser.role,
        });
        if (!result.success) {
          toast.error(result.message);
        } else {
          toast.success(result.message);
          setDialogOpen(false);
          resetForm();
          router.refresh();
        }
      } else {
        const result = await createUser({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
        });
        if (!result.success) {
          toast.error(result.message);
        } else {
          toast.success(result.message);
          setDialogOpen(false);
          resetForm();
          router.refresh();
        }
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const result = await deleteUser(deletingUser.id);
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
        setDeleteDialogOpen(false);
        setDeletingUser(null);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan saat menghapus user");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Kembali */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/pengaturan")} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kelola User</h1>
          <p className="text-muted-foreground text-sm mt-1">Tambah, ubah, atau hapus user karyawan</p>
        </div>
        <Button onClick={openAddModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Karyawan
        </Button>
      </div>

      {/* Content */}
      {initialUsers.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Belum ada user</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {initialUsers.map((user) => (
              <Card key={user.id} className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{user.name}</p>
                    {user.id === currentUserId && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Anda</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                  <p className="text-sm">{user.role === "OWNER" ? "Owner" : "Karyawan"}</p>
                  {user.id !== currentUserId && user.role !== "OWNER" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => { setDeletingUser(user); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Anda</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {user.role === "OWNER" ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="text-sm">{user.role === "OWNER" ? "Owner" : "Karyawan"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      {user.id !== currentUserId && user.role !== "OWNER" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModal(user)}
                            aria-label="Edit user"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            aria-label="Hapus user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Karyawan" : "Tambah Karyawan Baru"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Ubah nama atau role karyawan."
                : "Buat akun baru untuk karyawan. Karyawan akan menerima email dan password untuk login."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama <span className="text-destructive">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama karyawan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                disabled={!!editingUser}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Password {editingUser ? "(kosongkan jika tidak diubah)" : ""}
                {!editingUser && <span className="text-destructive">*</span>}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingUser ? "Biarkan kosong" : "Minimal 6 karakter"}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingUser ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong className="text-foreground">{deletingUser?.name}</strong>?
              User tidak akan bisa login lagi. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}