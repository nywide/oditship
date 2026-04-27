import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderFormDialog } from "./OrderFormDialog";

const { cityRows, cityNames, invokeMock } = vi.hoisted(() => {
  const rows = Array.from({ length: 40 }, (_, index) => ({
    name: `Ville ${String(index + 1).padStart(2, "0")}`,
  }));
  return {
    cityRows: rows,
    cityNames: rows.map((city) => city.name),
    invokeMock: vi.fn(),
  };
});
invokeMock.mockImplementation((_name, { body } = {}) => {
  if (body?.action === "list_cities") return Promise.resolve({ data: { ok: true, cities: cityNames }, error: null });
  if (body?.order?.product_name === "A1") return Promise.resolve({ data: { error: "Produit: minimum 3 lettres ou chiffres", code: "VALIDATION_ERROR", field: "product_name" }, error: null });
  return Promise.resolve({ data: { ok: true, livreur_name: "Livreur test" }, error: null });
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
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
    const { container } = render(
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
    const { container } = render(
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

  it("shows one validation rule error under the field returned by the preflight check", async () => {
    const { container } = render(
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
    const inputs = document.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "Ali" } });
    fireEvent.change(inputs[1], { target: { value: "0600000000" } });
    fireEvent.change(inputs[2], { target: { value: "Adresse test" } });
    fireEvent.change(inputs[3], { target: { value: "A1" } });
    fireEvent.change(inputs[4], { target: { value: "100" } });

    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("minimum 3 lettres ou chiffres")).toBeInTheDocument();
    });
  });
});