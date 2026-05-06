// هذا هو المحتوى الجديد الكامل للملف. استبدل كل شيء به.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2, Key, Globe, AlertCircle, Play, Save, X, Copy, Check, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ... (باقي الـ Imports تبقى كما هي، فقط أضف الـ Textarea أعلاه إذا لم يكن موجوداً)
// ... (تأكد من وجود Textarea في الـ Imports من shadcn/ui)

// تعريف Schema لعمليات Extra
const extraOperationSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  url: z.string().url("URL invalide"),
  method: z.string().default("POST"),
  trigger: z.enum(["before_create", "after_create", "on_status_change"]),
  trigger_status: z.string().optional(),
  enabled: z.boolean().default(true),
  headers: z.record(z.string()).default({}),
  payload_mapping: z.record(z.string()).default({}),
  payload_json: z.string().optional(), // <-- NOUVEAU CHAMP: payload_json optionnel
});

type ExtraOperationFormValues = z.infer<typeof extraOperationSchema>;

// Composant pour l'éditeur d'opérations extra (à l'intérieur de la page AdminLivreurs)
// ... (Le reste du code de la page est inchangé, mais assurez-vous que le champ suivant est présent dans le formulaire)

// À l'intérieur du Dialog pour ajouter/modifier une opération, ajoutez ce champ après le champ "Payload mapping (key/value)" ou avant le bouton de sauvegarde.

/*
<FormField
  control={form.control}
  name="payload_json"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Payload JSON (optionnel)</FormLabel>
      <FormControl>
        <Textarea
          placeholder='{ "packages": ["{{create_response.trackingID}}"], "driverEmail": "" }'
          className="font-mono text-sm"
          {...field}
          value={field.value || ''}
        />
      </FormControl>
      <FormDescription>
        Si vous remplissez ce champ, le système ignorera le "Payload mapping" (key/value) et utilisera uniquement ce JSON.
        Utilisez {'{{create_response.trackingID}}'} pour récupérer le numéro de suivi.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
*/
