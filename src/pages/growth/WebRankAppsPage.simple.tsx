import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Loader2, Search } from 'lucide-react';

const WebRankAppsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-orange-400" />
          <h1 className="text-2xl font-semibold text-foreground">Web Rank (Apps)</h1>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground">Run a Web Rank Scan</CardTitle>
            <CardDescription className="text-zinc-400">Search visibility for an App Store URL by a single keyword</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appUrl">App Store URL</Label>
              <Input
                id="appUrl"
                placeholder="https://apps.apple.com/..."
                className="bg-zinc-900 border-zinc-800 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                placeholder="e.g. tui danmark"
                className="bg-zinc-900 border-zinc-800 text-foreground"
              />
            </div>
            <div className="md:col-span-2">
              <Button className="w-full md:w-auto">
                Run Scan (Demo)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800">
          <CardContent className="py-10 text-center text-zinc-400">
            Testing version - UI components work, but webRankService removed
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default WebRankAppsPage;