import { VersionRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface VersionHistoryProps<TSnapshot> {
  title: string;
  versions: VersionRecord<TSnapshot>[];
  onRestore?: (version: number) => void;
  onClose: () => void;
  closeLabel?: string;
}

export function VersionHistory<TSnapshot>({
  title,
  versions,
  onRestore,
  onClose,
  closeLabel = 'Close',
}: VersionHistoryProps<TSnapshot>) {
  if (!versions.length) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onClose}>
          {closeLabel}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[320px] overflow-y-auto text-sm">
        {versions.map((version) => (
          <div
            key={version.version}
            className="rounded-md border p-3 bg-muted/50 space-y-2"
          >
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>Version #{version.version}</span>
              <span>{new Date(version.updatedAt).toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {version.changeType}
              {version.changeNotes ? ` • ${version.changeNotes}` : null}
            </div>
            <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
              {JSON.stringify(version.snapshot, null, 2)}
            </pre>
            {onRestore && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRestore(version.version)}
              >
                Restore
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


