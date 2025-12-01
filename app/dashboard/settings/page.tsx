"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    fullName: "Admin User",
    email: "admin@metamask.io",
    phone: "+62812345678",
    company: "Metamask Supply Chain",
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    privacy: {
      shareData: true,
      analytics: true,
    },
  })

  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: "Production API Key", key: "sk_live_***", created: "2024-01-15" },
    { id: 2, name: "Test API Key", key: "sk_test_***", created: "2024-01-10" },
  ])

  const [blockchainAddresses, setBlockchainAddresses] = useState([
    { id: 1, address: "0x742d35Cc6634C0532925a3b844Bc9e7595f123aB", network: "Ethereum", primary: true },
  ])

  const [apiLogs, setApiLogs] = useState([
    { id: 1, action: "QR Code Generated", timestamp: "2024-01-20 14:30", status: "Success" },
    { id: 2, action: "Product Linked", timestamp: "2024-01-20 14:25", status: "Success" },
    { id: 3, action: "Certificate Uploaded", timestamp: "2024-01-20 14:20", status: "Success" },
  ])

  const [blockchainSettings, setBlockchainSettings] = useState({
    network: "ethereum",
    twoFactorAuth: false,
    biometricAuth: false,
  })

  const [newApiKey, setNewApiKey] = useState("")
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [newAddress, setNewAddress] = useState("")
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)

  const handleSettingChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value })
  }

  const handleNotificationToggle = (key: keyof typeof settings.notifications) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    })
  }

  const handlePrivacyToggle = (key: keyof typeof settings.privacy) => {
    setSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: !settings.privacy[key],
      },
    })
  }

  const handleAddApiKey = () => {
    if (newApiKey.trim()) {
      setApiKeys([
        ...apiKeys,
        { id: Date.now(), name: newApiKey, key: "sk_***", created: new Date().toLocaleDateString() },
      ])
      setNewApiKey("")
      setShowNewKeyForm(false)
    }
  }

  const handleDeleteApiKey = (id: number) => {
    setApiKeys(apiKeys.filter((key) => key.id !== id))
  }

  const handleAddAddress = () => {
    if (newAddress.trim()) {
      setBlockchainAddresses([
        ...blockchainAddresses,
        { id: Date.now(), address: newAddress, network: "Ethereum", primary: false },
      ])
      setNewAddress("")
      setShowNewAddressForm(false)
    }
  }

  const handleDeleteAddress = (id: number) => {
    setBlockchainAddresses(blockchainAddresses.filter((addr) => addr.id !== id))
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/30 border-border">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="api">API & Logs</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Update your profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Full Name</label>
                  <Input
                    value={settings.fullName}
                    onChange={(e) => handleSettingChange("fullName", e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleSettingChange("email", e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => handleSettingChange("phone", e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Company</label>
                  <Input
                    value={settings.company}
                    onChange={(e) => handleSettingChange("company", e.target.value)}
                    className="mt-2"
                  />
                </div>
                <Button className="bg-primary hover:bg-primary/90">Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Control how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={settings.notifications.email}
                    onCheckedChange={() => handleNotificationToggle("email")}
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                  </div>
                  <Switch
                    checked={settings.notifications.sms}
                    onCheckedChange={() => handleNotificationToggle("sms")}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive push notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.push}
                    onCheckedChange={() => handleNotificationToggle("push")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Protect your account with security measures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                  </div>
                  <Switch
                    checked={blockchainSettings.twoFactorAuth}
                    onCheckedChange={() =>
                      setBlockchainSettings({ ...blockchainSettings, twoFactorAuth: !blockchainSettings.twoFactorAuth })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Biometric Authentication</p>
                    <p className="text-sm text-muted-foreground">Use fingerprint or face recognition</p>
                  </div>
                  <Switch
                    checked={blockchainSettings.biometricAuth}
                    onCheckedChange={() =>
                      setBlockchainSettings({ ...blockchainSettings, biometricAuth: !blockchainSettings.biometricAuth })
                    }
                  />
                </div>
                <div className="pt-4">
                  <Button variant="outline">Change Password</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blockchain Tab */}
          <TabsContent value="blockchain" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Blockchain Network</CardTitle>
                <CardDescription>Configure blockchain settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Network</label>
                  <select
                    value={blockchainSettings.network}
                    onChange={(e) => setBlockchainSettings({ ...blockchainSettings, network: e.target.value })}
                    className="w-full mt-2 bg-input border border-border rounded-md px-3 py-2 text-foreground"
                  >
                    <option value="ethereum">Ethereum Mainnet</option>
                    <option value="polygon">Polygon</option>
                    <option value="bsc">Binance Smart Chain</option>
                    <option value="avalanche">Avalanche</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Blockchain Addresses</CardTitle>
                <CardDescription>Manage your wallet addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {blockchainAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{addr.network}</p>
                      <p className="text-sm text-muted-foreground font-mono">{addr.address}</p>
                      {addr.primary && <p className="text-xs text-primary mt-1">Primary Address</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(addr.address)}>
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAddress(addr.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {!showNewAddressForm ? (
                  <Button
                    variant="outline"
                    className="w-full mt-4 bg-transparent"
                    onClick={() => setShowNewAddressForm(true)}
                  >
                    Add Address
                  </Button>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <Input placeholder="0x..." value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
                    <Button onClick={handleAddAddress} className="bg-primary hover:bg-primary/90">
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewAddressForm(false)
                        setNewAddress("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API & Logs Tab */}
          <TabsContent value="api" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your API keys for blockchain integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{key.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{key.key}</p>
                      <p className="text-xs text-muted-foreground mt-1">Created: {key.created}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(key.key)}>
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteApiKey(key.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {!showNewKeyForm ? (
                  <Button
                    variant="outline"
                    className="w-full mt-4 bg-transparent"
                    onClick={() => setShowNewKeyForm(true)}
                  >
                    Create New Key
                  </Button>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <Input placeholder="Key name" value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} />
                    <Button onClick={handleAddApiKey} className="bg-primary hover:bg-primary/90">
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewKeyForm(false)
                        setNewApiKey("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>API Activity Logs</CardTitle>
                <CardDescription>Recent API calls and blockchain interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apiLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === "Success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Manage your data and privacy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Share Anonymous Data</p>
                    <p className="text-sm text-muted-foreground">Help us improve with usage data</p>
                  </div>
                  <Switch
                    checked={settings.privacy.shareData}
                    onCheckedChange={() => handlePrivacyToggle("shareData")}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">Analytics</p>
                    <p className="text-sm text-muted-foreground">Allow analytics tracking</p>
                  </div>
                  <Switch
                    checked={settings.privacy.analytics}
                    onCheckedChange={() => handlePrivacyToggle("analytics")}
                  />
                </div>
                <div className="pt-4">
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
