"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
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
import { useNotification } from "@/lib/notification-context"
import { PencilIcon } from 'lucide-react' // Import icon untuk tombol edit

interface MasterUserData {
  id: string
  name: string
  email: string
  role: string
  status: string
}

export default function MasterUsersPage() {
  const [users, setUsers] = useState<MasterUserData[]>([
    {
      id: "u001",
      name: "Alice Johnson",
      email: "alice@company.com",
      role: "Administrator",
      status: "Active",
    },
    {
      id: "u002",
      name: "Bob Smith",
      email: "bob@company.com",
      role: "Petani",
      status: "Pending",
    },
  ])

  // State untuk Add User
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "", status: "Active" })
  const [createDialogOpen, setCreateDialogOpen] = useState(false) // Dialog untuk Create

  // State untuk Edit User
  const [editingUser, setEditingUser] = useState<MasterUserData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false) // Dialog untuk Edit

  const { addNotification } = useNotification()

  // Fungsi untuk membuka dialog edit
  const handleEdit = (user: MasterUserData) => {
    setEditingUser(user)
    setEditDialogOpen(true)
  }

  // Fungsi untuk menyimpan perubahan User
  const saveEditedUser = () => {
    if (!editingUser) return

    setUsers(
      users.map((u) => (u.id === editingUser.id ? editingUser : u))
    )
    setEditDialogOpen(false)
    setEditingUser(null)
    addNotification("User Updated", `${editingUser.name} details updated successfully`, "success")
  }

  const addUser = () => {
    if (newUser.name && newUser.email && newUser.role) {
      const user = { id: Date.now().toString(), ...newUser }
      setUsers([...users, user])
      // Reset state, status tetap di 'Active' sebagai default saat membuat user baru
      setNewUser({ name: "", email: "", role: "", status: "Active" })
      setCreateDialogOpen(false)
      addNotification(
        "User Created",
        `${user.name} (${user.role}) added successfully`,
        "success",
      )
    }
  }

  const deleteUser = (id: string) => {
    const user = users.find((u) => u.id === id)
    setUsers(users.filter((c) => c.id !== id))
    addNotification("User Deleted", `${user?.name} deleted successfully`, "info")
  }

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
                />
                <Input
                  placeholder="Email Address"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />

                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Peran Pengguna (Role)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Petani">Petani</SelectItem>
                  </SelectContent>
                </Select>

                {/* 🛑 Status Input DIHILANGKAN untuk Create User */}

                <Button onClick={addUser} className="w-full bg-primary hover:bg-primary/90">
                  Add User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Master User List</CardTitle>
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
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell className="text-foreground font-medium">{user.name}</TableCell>
                      <TableCell className="text-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.role}</TableCell>
                      <TableCell className={`font-semibold ${user.status === 'Active' ? 'text-green-500' : 'text-yellow-500'}`}>{user.status}</TableCell>
                      <TableCell className="flex space-x-2">
                        {/* 2. Tombol Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                          className="text-primary hover:bg-primary/10"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          Delete
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

      {/* 3. Dialog for Editing User */}
      {editingUser && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Input Name - Read-only atau bisa diubah, di sini dibuat bisa diubah */}
              <Input
                placeholder="Full Name"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              />
              {/* Input Email */}
              <Input
                placeholder="Email Address"
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              />

              {/* Select Role */}
              <Select
                value={editingUser.role}
                onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Peran Pengguna (Role)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                  <SelectItem value="Petani">Petani</SelectItem>
                </SelectContent>
              </Select>

              {/* 🟢 Status Input DITAMPILKAN untuk Edit User */}
              <Select
                value={editingUser.status}
                onValueChange={(value) => setEditingUser({ ...editingUser, status: value })}
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

              <Button onClick={saveEditedUser} className="w-full bg-primary hover:bg-primary/90">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  )
}