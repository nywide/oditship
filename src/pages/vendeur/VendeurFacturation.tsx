import { Card, CardContent } from "@/components/ui/card";
import { Receipt } from "lucide-react";

const VendeurFacturation = () => (
  <Card>
    <CardContent className="p-12 text-center">
      <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Page Facturation</h2>
      <p className="text-muted-foreground">à venir</p>
    </CardContent>
  </Card>
);

export default VendeurFacturation;
