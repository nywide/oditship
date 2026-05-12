import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image as ImageIcon } from "lucide-react";

interface Props { path: string | null; size?: "sm" | "md"; }

const cache = new Map<string, string>();

const PaymentProofThumb = ({ path, size = "sm" }: Props) => {
  const [url, setUrl] = useState<string | null>(path ? cache.get(path) ?? null : null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!path) return;
    if (cache.has(path)) { setUrl(cache.get(path)!); return; }
    let cancelled = false;
    supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 30).then(({ data }) => {
      if (cancelled || !data?.signedUrl) return;
      cache.set(path, data.signedUrl);
      setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [path]);

  if (!path) return <span className="text-xs text-muted-foreground">—</span>;
  const dim = size === "sm" ? "h-8 w-8" : "h-12 w-12";

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`${dim} rounded border bg-muted overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary transition`}
        title="Voir preuve de paiement"
      >
        {url ? (
          <img src={url} alt="Preuve de paiement" className="h-full w-full object-cover" onError={() => setUrl(null)} />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-2 bg-background">
          {url ? (
            <img src={url} alt="Preuve de paiement" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          ) : (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentProofThumb;
