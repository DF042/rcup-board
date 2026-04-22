import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SeasonSummaryCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Season Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Import Yahoo data to view season analytics.</p>
      </CardContent>
    </Card>
  );
}
