import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Message envoyé !", { description: "Notre équipe vous répondra sous 24h." });
      (e.target as HTMLFormElement).reset();
    }, 800);
  };

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-2xl mb-12">
        <p className="text-accent text-sm font-bold uppercase tracking-wider mb-3">Contact</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Parlons-en.</h1>
        <p className="text-muted-foreground text-lg">
          Une question, un partenariat, un projet ? Notre équipe vous répond sous 24h.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {[
            { icon: MapPin, title: "Adresse", value: "Casablanca, Maroc" },
            { icon: Phone, title: "Téléphone", value: "+212 5 22 00 00 00" },
            { icon: Mail, title: "Email", value: "contact@odit.ma" },
          ].map((c) => (
            <Card key={c.title}>
              <CardContent className="p-5 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">{c.title}</p>
                  <p className="font-medium mt-0.5">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="lg:col-span-2">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input id="subject" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" rows={6} required className="mt-1.5" />
              </div>
              <Button type="submit" size="lg" disabled={submitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {submitting ? "Envoi..." : <>Envoyer <Send className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;
