"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNotification } from "@/lib/notification-context"

// 1. Updated Interface for User Data
interface MasterUserData {
  id: string
  name: string
  email: string
  role: string
  status: string
}

export default function MasterUsersPage() { // 2. Renamed Component
  // 3. Updated State to hold User Data
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
      role: "Editor",
      status: "Pending",
    },
  ])
  // 4. Updated New User State fields
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "", status: "Active" })
  const { addNotification } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  // 5. Updated Function to add a new User
  const addUser = () => {
    if (newUser.name && newUser.email && newUser.role) {
      const user = { id: Date.now().toString(), ...newUser }
      setUsers([...users, user])
      setNewUser({ name: "", email: "", role: "", status: "Active" })
      setDialogOpen(false)
      addNotification(
        "User Created",
        `${user.name} (${user.role}) added successfully`,
        "success",
      )
    }
  }

  // 6. Updated Function to delete a User
  const deleteUser = (id: string) => {
    const user = users.find((u) => u.id === id)
    setUsers(users.filter((u) => u.id !== id))
    addNotification("User Deleted", `${user?.name} deleted successfully`, "info")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {/* 7. Updated Page Title */}
            <h1 className="text-3xl font-bold text-foreground">Master Users</h1>
            <p className="text-muted-foreground mt-1">Manage platform administrators and key accounts.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              {/* 8. Updated Button Text */}
              <Button className="bg-primary hover:bg-primary/90">Add New Master User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                {/* 9. Updated Dialog Title */}
                <DialogTitle>Create New Master User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* 10. Updated Input fields for User data */}
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
                <Input
                  placeholder="User Role (e.g., Admin, Superuser)"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                />
                <Input
                  placeholder="Status (e.g., Active, Pending)"
                  value={newUser.status}
                  onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                />
                {/* 11. Updated Action Button */}
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
            {/* 12. Updated Card Titles */}
            <CardTitle>Master User List</CardTitle>
            <CardDescription>View, edit, and manage all users with elevated permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    {/* 13. Updated Table Headers */}
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* 14. Iterating over 'users' state */}
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      {/* 15. Displaying User Data */}
                      <TableCell className="text-foreground font-medium">{user.name}</TableCell>
                      <TableCell className="text-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.role}</TableCell>
                      <TableCell className={`font-semibold ${user.status === 'Active' ? 'text-green-500' : 'text-yellow-500'}`}>{user.status}</TableCell>
                      <TableCell>
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
    </DashboardLayout>
  )
}