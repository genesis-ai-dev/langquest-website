'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/auth-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import { createBlueprint } from '@/lib/blueprint/rpc';
import { BLUEPRINT_FORMAT_VERSION } from '@/lib/blueprint/types';
import { toast } from 'sonner';

export default function NewBlueprintPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createBrowserClient();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [shared, setShared] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!user) {
    router.push('/login?redirectTo=/portal/templates/new');
    return null;
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreating(true);
    try {
      const result = await createBlueprint(supabase, {
        name: name.trim(),
        icon: icon || undefined,
        shared,
        structure: {
          format_version: BLUEPRINT_FORMAT_VERSION,
          root: {
            id: 'root',
            name: name.trim(),
            node_type: 'root',
            children: []
          }
        }
      });

      if (result.ok) {
        toast.success('Blueprint created');
        router.push(`/portal/templates/${result.blueprint_id}`);
      } else {
        toast.error(result.reason);
      }
    } catch (err) {
      toast.error('Failed to create blueprint');
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/portal/templates')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Blueprint</h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="e.g., Protestant Bible, FIA Pericopes"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon">Icon (lucide icon name)</Label>
          <Input
            id="icon"
            placeholder="e.g., book, scroll-text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="shared" checked={shared} onCheckedChange={setShared} />
          <Label htmlFor="shared">Share publicly</Label>
        </div>

        <Button
          className="w-full"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
        >
          {creating ? 'Creating...' : 'Create Blueprint'}
        </Button>
      </div>
    </div>
  );
}
