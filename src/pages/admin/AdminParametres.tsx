import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminCities from "./parametres/AdminCities";
import AdminHubs from "./parametres/AdminHubs";
import AdminLivreurs from "./parametres/AdminLivreurs";

const AdminParametres = () => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">Paramètres</h2>
    <Tabs defaultValue="cities">
      <TabsList>
        <TabsTrigger value="cities">Villes</TabsTrigger>
        <TabsTrigger value="hubs">Hubs</TabsTrigger>
        <TabsTrigger value="livreurs">Livreurs & API</TabsTrigger>
      </TabsList>
      <TabsContent value="cities" className="mt-4"><AdminCities /></TabsContent>
      <TabsContent value="hubs" className="mt-4"><AdminHubs /></TabsContent>
      <TabsContent value="livreurs" className="mt-4"><AdminLivreurs /></TabsContent>
    </Tabs>
  </div>
);

export default AdminParametres;
