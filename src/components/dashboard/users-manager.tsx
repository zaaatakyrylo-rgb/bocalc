'use client';

import { useEffect, useState } from 'react';
import { Loader2, Edit3, Trash2, History } from 'lucide-react';
import { useTranslations } from '@/lib/i18n-provider';
import { VersionRecord } from '@/types';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VersionHistory } from './version-history';

interface UserFormState {
  email: string;
  password: string;
  role: 'admin' | 'vendor' | 'viewer';
  vendorId: string;
  active: boolean;
}

export function UsersManager() {
  const t = useTranslations();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState<UserFormState>({
    email: '',
    password: '',
    role: 'viewer',
    vendorId: '',
    active: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [versionsTarget, setVersionsTarget] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionRecord<any>[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    apiClient.vendors.list().then((res) => {
      if (res.success && res.data) {
        setVendorOptions(
          (res.data as any[]).map((vendor) => ({
            id: vendor.id,
            name: vendor.name,
          }))
        );
      }
    });
  }, [isAdmin]);

  const loadUsers = async () => {
    setIsLoading(true);
    const response = await apiClient.users.list();
    if (response.success && response.data) {
      setUsers(response.data as any[]);
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload: any = {
      email: form.email,
      password: form.password || undefined,
      role: form.role,
      vendorId: form.vendorId || undefined,
      active: form.active,
    };

    const response = editingId
      ? await apiClient.users.update(editingId, payload)
      : await apiClient.users.create(payload);

    if (response.success) {
      toast({
        title: editingId ? t('users.userUpdated') : t('users.userCreated'),
      });
      setEditingId(null);
      setForm({
        email: '',
        password: '',
        role: 'viewer',
        vendorId: '',
        active: true,
      });
      await loadUsers();
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }

    setIsSubmitting(false);
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: '',
      role: user.role,
      vendorId: user.vendorId || '',
      active: user.active,
    });
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm(t('vendors.deactivate'))) return;
    const response = await apiClient.users.delete(id);
    if (response.success) {
      toast({ title: t('users.userDeleted') });
      await loadUsers();
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const openVersions = async (id: string) => {
    const response = await apiClient.users.versions(id);
    if (response.success && response.data) {
      setVersionsTarget(id);
      setVersions(response.data as VersionRecord<any>[]);
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const restoreVersion = async (version: number) => {
    if (!versionsTarget) return;
    const response = await apiClient.users.restoreVersion(versionsTarget, version);
    if (response.success) {
      toast({ title: t('users.userUpdated') });
      setVersionsTarget(null);
      setVersions([]);
      await loadUsers();
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('users.title')}</CardTitle>
          <CardDescription>{t('errors.forbidden')}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You need administrator permissions to manage users.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('users.title')}</CardTitle>
          <CardDescription>Manage platform access and vendor assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2">{t('users.userEmail')}</th>
                    <th className="px-3 py-2">{t('users.userRole')}</th>
                    <th className="px-3 py-2">{t('users.userVendor')}</th>
                    <th className="px-3 py-2">{t('common.active')}</th>
                    <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-3 py-2 capitalize">{t(`users.roles.${user.role}`)}</td>
                      <td className="px-3 py-2">{user.vendorName || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {user.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openVersions(user.id)}>
                            <History className="mr-2 h-4 w-4" />
                            {t('common.versions')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(user.id)}
                            disabled={!user.active}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('vendors.deactivate')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? t('users.editUser') : t('users.createUser')}</CardTitle>
          <CardDescription>Invite team members or update their permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('users.userEmail')}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={editingId ? 'Leave blank to keep current' : undefined}
                  required={!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.userRole')}</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as UserFormState['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                    <SelectItem value="vendor">{t('users.roles.vendor')}</SelectItem>
                    <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('users.userVendor')}</Label>
                <Select
                  value={form.vendorId}
                  onValueChange={(value) => setForm({ ...form, vendorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {vendorOptions.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.active')}</Label>
                <Select
                  value={form.active ? 'true' : 'false'}
                  onValueChange={(value) => setForm({ ...form, active: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('common.active')}</SelectItem>
                    <SelectItem value="false">{t('common.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? t('common.update') : t('common.create')}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      email: '',
                      password: '',
                      role: 'viewer',
                      vendorId: '',
                      active: true,
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {versionsTarget && (
        <VersionHistory
          title={`User versions (${versionsTarget})`}
          versions={versions}
          onRestore={restoreVersion}
          onClose={() => {
            setVersionsTarget(null);
            setVersions([]);
          }}
          closeLabel={t('common.close')}
        />
      )}
    </div>
  );
}


