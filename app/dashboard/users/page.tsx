// app/dashboard/master-users/page.tsx

'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNotification } from "@/lib/notification-context" // Asumsi context ini ada
import { PencilIcon, Trash2, Loader2 } from 'lucide-react'
import useSWR, { mutate } from 'swr' // Import SWR dan mutate
import { fetcher } from '@/lib/fetcher' // Import fetcher
import { DashboardLayout } from "@/components/dashboard-layout"

// --- Interfaces dan Types ---

interface MasterUserData {
  id: string
  name: string
  email: string
  role: string
  status: string
}

// Data yang dibutuhkan saat membuat user baru
interface NewUserPayload extends Omit<MasterUserData, 'id' | 'status'> {
  password: string; // Password wajib saat CREATE
}

export default function MasterUsersPage() {
  const { addNotification } = useNotification()

  // 1. READ: Fetch Data dari API menggunakan SWR
  const { data: users, error, isLoading } = useSWR<MasterUserData[]>('/api/users', fetcher)

  // State untuk Dialog dan Loading
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State untuk Add User
  const [newUser, setNewUser] = useState<NewUserPayload & { status: string }>({
    name: "",
    email: "",
    role: "",
    status: "Active", // Default status di frontend saat create
    password: ""
  })

  // State untuk Edit User
  const [editingUser, setEditingUser] = useState<MasterUserData | null>(null)

  // --- Fungsi CRUD ---

  // CREATE (POST)
  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.role || !newUser.password) {
      addNotification("Validasi Error", "Nama, Email, Peran, dan Password wajib diisi.", "error")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal membuat pengguna')
      }

      // Reset state & tutup dialog
      setNewUser({ name: "", email: "", role: "", status: "Active", password: "" })
      setCreateDialogOpen(false)

      // Update UI: Revalidate SWR cache
      mutate('/api/users')
      addNotification("User Created", `Pengguna ${newUser.name} berhasil ditambahkan.`, "success")

    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // DELETE
  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna ${name}? Tindakan ini tidak dapat dibatalkan.`)) return

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Gagal menghapus pengguna')
      }

      // Update UI: Revalidate SWR cache
      mutate('/api/users')
      addNotification("User Deleted", `Pengguna ${name} berhasil dihapus.`, "info")

    } catch (err: any) {
      addNotification("Error", err.message, "error")
    }
  }

  // Fungsi untuk membuka dialog edit
  const handleEdit = (user: MasterUserData) => {
    setEditingUser(user)
    setEditDialogOpen(true)
  }

  // UPDATE (PATCH)
  const saveEditedUser = async () => {
    if (!editingUser) return

    setIsSubmitting(true)
    try {
      const { id, name, email, role, status } = editingUser;

      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, status }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengupdate pengguna')
      }

      // Tutup dialog
      setEditDialogOpen(false)
      setEditingUser(null)

      // Update UI: Revalidate SWR cache
      mutate('/api/users')
      addNotification("User Updated", `Detail ${name} berhasil diperbarui.`, "success")

    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Render Status ---

  if (error) return <DashboardLayout>
    <div className="text-red-500">Gagal memuat pengguna: {error.message}</div>
  </DashboardLayout>

  if (isLoading) return <DashboardLayout>
    <div className="flex items-center justify-center h-40">
      <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading Users...
    </div>
  </DashboardLayout>

  const userList = users || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Master Users</h1>
            <p className="text-muted-foreground mt-1">Manage platform administrators and key accounts.</p>
          </div>

          {/* 1. Dialog for Creating User */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Add New Master User</Button>
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
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Petani">Petani</SelectItem>
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

        {/* Users Table */}
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
                        className={`font-semibold ${user.status === 'Active' ? 'text-green-500' :
                          user.status === 'Pending' ? 'text-yellow-500' : 'text-red-500'
                          }`}
                      >
                        {user.status}
                      </TableCell>
                      <TableCell className="flex space-x-2">
                        {/* Tombol Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                          className="text-primary hover:bg-primary/10"
                          disabled={isSubmitting}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {/* Tombol Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteUser(user.id, user.name)}
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

      {/* 2. Dialog for Editing User */}
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
                onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Peran Pengguna (Role)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                  <SelectItem value="Petani">Petani</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Input untuk Edit User */}
              <Select
                value={editingUser.status}
                onValueChange={(value) => setEditingUser({ ...editingUser, status: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status Pengguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={saveEditedUser}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  )
}