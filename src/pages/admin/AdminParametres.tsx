import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminCities from "./parametres/AdminCities";
import AdminHubs from "./parametres/AdminHubs";
import AdminLivreurs from "./parametres/AdminLivreurs";
import AdminSticker from "./parametres/AdminSticker";

const AdminParametres = () => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">Paramètres</h2>
    <Tabs defaultValue="cities">
      <TabsList>
        <TabsTrigger value="cities">Villes</TabsTrigger>
        <TabsTrigger value="hubs">Hubs</TabsTrigger>
        <TabsTrigger value="livreurs">Livreurs & API</TabsTrigger>
        <TabsTrigger value="sticker">Sticker</TabsTrigger>
      </TabsList>
      <TabsContent value="cities" className="mt-4"><AdminCities /></TabsContent>
      <TabsContent value="hubs" className="mt-4"><AdminHubs /></TabsContent>
      <TabsContent value="livreurs" className="mt-4"><AdminLivreurs /></TabsContent>
      <TabsContent value="sticker" className="mt-4"><AdminSticker /></TabsContent>
    </Tabs>
  </div>
);

export default AdminParametres;
