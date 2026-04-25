import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderFormDialog } from "./OrderFormDialog";
import { toast } from "sonner";

const cityRows = Array.from({ length: 40 }, (_, index) => ({
  name: `Ville ${String(index + 1).padStart(2, "0")}`,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: cityRows, error: null })),
      })),
    })),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("OrderFormDialog city dropdown", () => {
  it("stays open and scrollable during mouse hover, scroll, and mouse exit", async () => {
    render(
      <OrderFormDialog
        open
        onOpenChange={vi.fn()}
        vendeurId="vendeur-1"
        agentId={null}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    const searchInput = await screen.findByPlaceholderText("Rechercher une ville...");
    const commandList = document.querySelector("[cmdk-list]") as HTMLElement | null;

    expect(searchInput).toBeInTheDocument();
    expect(commandList).not.toBeNull();
    expect(commandList).toHaveClass("max-h-[260px]", "overflow-y-auto", "overscroll-contain");

    fireEvent.mouseEnter(commandList!);
    fireEvent.scroll(commandList!, { target: { scrollTop: 180 } });
    fireEvent.mouseMove(commandList!);
    fireEvent.mouseLeave(commandList!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Rechercher une ville...")).toBeInTheDocument();
      expect(screen.getByText("Ville 40")).toBeInTheDocument();
    });
  });

  it("keeps the dropdown open when using the mouse wheel inside the city list", async () => {
    render(
      <OrderFormDialog
        open
        onOpenChange={vi.fn()}
        vendeurId="vendeur-1"
        agentId={null}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    const searchInput = await screen.findByPlaceholderText("Rechercher une ville...");
    const commandList = document.querySelector("[cmdk-list]") as HTMLElement;
    fireEvent.wheel(commandList, { deltaY: 120 });

    expect(searchInput).toBeInTheDocument();
    expect(screen.getByText("Ville 40")).toBeInTheDocument();
  });

  it("requires product to contain at least three letters or digits", async () => {
    render(
      <OrderFormDialog
        open
        onOpenChange={vi.fn()}
        vendeurId="vendeur-1"
        agentId={null}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByText("Ville 01"));
    fireEvent.change(screen.getByLabelText("Nom client *"), { target: { value: "Ali" } });
    fireEvent.change(screen.getByLabelText("Téléphone * (10 chiffres)"), { target: { value: "0600000000" } });
    fireEvent.change(screen.getByLabelText("Adresse *"), { target: { value: "Adresse test" } });
    fireEvent.change(screen.getByLabelText("Produit *"), { target: { value: "A1" } });
    fireEvent.change(screen.getByLabelText("Prix (MAD) *"), { target: { value: "100" } });

    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(toast.error).toHaveBeenCalledWith("Le produit doit contenir au moins 3 lettres ou chiffres");
  });
});