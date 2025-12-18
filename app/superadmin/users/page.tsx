// app/dashboard/master-users/page.tsx

'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNotification } from "@/lib/notification-context"
import { PencilIcon, Trash2, Loader2, Save, AlertTriangle } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { fetcher } from '@/lib/fetcher'
import { SuperadminLayout } from "@/components/superadmin/superadmin-layout"

// ... (Interfaces dan roles tidak berubah)
interface MasterUserData {
  id: string
  name: string
  email: string
  role: string
  status: 'ACTIVE' | 'INACTIVE'  // Menambahkan PENDING_VERIFICATION
}

interface NewUserPayload extends Omit<MasterUserData, 'id' | 'status'> {
  password: string;
}

interface EditUserPayload extends Omit<MasterUserData, 'id'> {
  // Properti yang diizinkan untuk di-update
}


const roles = [
  {
    name: 'Petani (Farmer)',
    value: 'FARMER'
  },
  {
    name: 'Gudang Pusat',
    value: 'WAREHOUSE_CENTER'
  },
  {
    name: 'Gudang Retail',
    value: 'WAREHOUSE_RETAIL'
  },
  {
    name: 'Admin Umum',
    value: 'ADMIN'
  },
  {
    name: 'Super Admin',
    value: 'SUPERADMIN'
  },
] as const;


export default function MasterUsersPage() {
  const { addNotification } = useNotification()

  const { data: users, error, isLoading } = useSWR<MasterUserData[]>('/api/v1/users', fetcher)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  // State baru untuk dialog hapus
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [newUser, setNewUser] = useState<NewUserPayload & { status: string }>({
    name: "",
    email: "",
    role: "",
    status: "ACTIVE",
    password: ""
  })

  const [editingUser, setEditingUser] = useState<MasterUserData | null>(null)
  // State baru untuk pengguna yang akan dihapus
  const [userToDelete, setUserToDelete] = useState<MasterUserData | null>(null)

  // --- Fungsi Create User (Tidak Berubah) ---
  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.role || !newUser.password) {
      addNotification("Validasi Error", "Nama, Email, Peran, dan Password wajib diisi.", "error")
      return
    }

    setIsSubmitting(true)
    try {
      const { status, ...payload } = newUser;

      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal membuat pengguna')
      }

      setNewUser({ name: "", email: "", role: "", status: "ACTIVE", password: "" })
      setCreateDialogOpen(false)

      mutate('/api/v1/users')
      addNotification("User Created", `Pengguna ${newUser.name} berhasil ditambahkan.`, "success")

    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Handler untuk membuka dialog Delete ---
  const handleDeleteClick = (user: MasterUserData) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  }

  // --- Fungsi Delete User yang sebenarnya ---
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    const { id, name } = userToDelete;

    try {
      const response = await fetch(`/api/v1/users/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menghapus pengguna')
      }

      // Tutup dialog dan reset state
      setDeleteDialogOpen(false);
      setUserToDelete(null);

      mutate('/api/v1/users')
      addNotification("User Deleted", `Pengguna ${name} berhasil dihapus.`, "info")

    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Handler Edit Dialog (Tidak Berubah) ---
  const handleEdit = (user: MasterUserData) => {
    // Pastikan data disalin dengan benar
    setEditingUser({ ...user })
    setEditDialogOpen(true)
  }

  // --- Fungsi Save Edited User (Tidak Berubah) ---
  const saveEditedUser = async () => {
    if (!editingUser) return

    setIsSubmitting(true)
    try {
      const { id, name, email, role, status } = editingUser;

      const payload: EditUserPayload = { name, email, role, status }

      const response = await fetch(`/api/v1/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengupdate pengguna')
      }

      setEditDialogOpen(false)
      setEditingUser(null)

      mutate('/api/v1/users')
      addNotification("User Updated", `Detail ${name} berhasil diperbarui.`, "success")

    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ... (Error dan Loading states)
  if (error) return <SuperadminLayout>
    <div className="text-red-500">Gagal memuat pengguna: {error.message}</div>
  </SuperadminLayout>

  if (isLoading) return <SuperadminLayout>
    <div className="flex items-center justify-center h-40">
      <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading Users...
    </div>
  </SuperadminLayout>

  const userList = users || [];

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        {/* === HEADER DAN TOMBOL CREATE === */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Master Users</h1>
            <p className="text-muted-foreground mt-1">Manage platform administrators and key accounts.</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Add New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Master User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Full Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  disabled={isSubmitting}
                />
                <Input
                  placeholder="Email Address"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={isSubmitting}
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  disabled={isSubmitting}
                />

                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Peran Pengguna (Role)" />
                  </SelectTrigger>
                  <SelectContent>
                    {
                      roles.map((val) => (
                        <SelectItem key={val.value} value={val.value}>{val.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>

                <Button
                  onClick={addUser}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Add User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* === USERS TABLE === */}
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Master User List ({userList.length} total)</CardTitle>
            <CardDescription>View, edit, and manage all users with elevated permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userList.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell className="text-foreground font-medium">{user.name}</TableCell>
                      <TableCell className="text-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.role}</TableCell>
                      <TableCell
                        className={`font-semibold ${user.status === 'ACTIVE' ? 'text-green-500' :
                          'text-red-500'
                          }`}
                      >
                        {user.status}
                      </TableCell>
                      <TableCell className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                          className="text-primary hover:bg-primary/10"
                          disabled={isSubmitting}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(user)} // Menggunakan handler baru
                          className="text-destructive hover:bg-destructive/10"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === EDIT DIALOG (Tidak Berubah) === */}
      {editingUser && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Full Name"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                disabled={isSubmitting}
              />
              <Input
                placeholder="Email Address"
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                disabled={isSubmitting}
              />
              <Select
                value={editingUser.role}
                onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, role: value } : null)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Peran Pengguna (Role)" />
                </SelectTrigger>
                <SelectContent>
                  {
                    roles.map((val) => (
                      <SelectItem key={val.value} value={val.value}>{val.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>

              <Select
                value={editingUser.status}
                onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, status: value as MasterUserData['status'] } : null)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status Pengguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  {/* Memperbaiki nilai UNKNOW menjadi PENDING_VERIFICATION agar konsisten */}
                  <SelectItem value="PENDING_VERIFICATION">PENDING_VERIFICATION</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={saveEditedUser}
                className="bg-primary hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* === DELETE CONFIRMATION DIALOG (BARU) === */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" /> Konfirmasi Penghapusan
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pengguna **{userToDelete?.name}** secara permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Apakah Anda benar-benar yakin ingin melanjutkan?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null); // Penting: reset userToDelete saat dibatalkan
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Hapus Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperadminLayout>
  )
}