import { useMemo } from "react";
import {
  buildMainRowData,
  renderCanvasTemplate,
  sanitizeCanvasHtml,
  type MainRowSource,
} from "@/lib/colisCanvas";
import { useCanvasSurface } from "@/lib/useColisCanvas";

/**
 * Render the order "client" cell using the admin-defined main-row template.
 * Renders an isolated <style> block scoped to a unique class so its CSS
 * cannot bleed into the rest of the dashboard.
 */
export const ColisMainRowCell = ({ order }: { order: MainRowSource }) => {
  const template = useCanvasSurface("mainRow");
  const data = useMemo(() => buildMainRowData(order), [order]);
  const scopeClass = `canvas-row-${order.id}`;

  const html = useMemo(
    () => sanitizeCanvasHtml(renderCanvasTemplate(template.html, data)),
    [template.html, data]
  );
  const css = useMemo(() => {
    const rendered = renderCanvasTemplate(template.css, data);
    return rendered.replace(/(^|\})\s*([^{}@]+)\{/g, (_match, prefix, selectors) => {
      const scoped = selectors
        .split(",")
        .map((sel: string) => {
          const trimmed = sel.trim();
          if (!trimmed) return trimmed;
          return `.${scopeClass} ${trimmed}`;
        })
        .join(", ");
      return `${prefix} ${scoped}{`;
    });
  }, [template.css, data, scopeClass]);

  return (
    <div className={scopeClass}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
