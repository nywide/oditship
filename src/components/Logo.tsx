import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showTagline?: boolean;
}

export const Logo = ({ className, variant = "default", showTagline = false }: LogoProps) => {
  const isLight = variant === "light";
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-extrabold tracking-tight text-2xl",
            isLight ? "text-white" : "text-primary"
          )}
        >
          OD<span className={isLight ? "text-accent" : "text-accent"}>i</span>T
        </span>
        {showTagline && (
          <span className={cn("text-[0.65rem] font-medium tracking-wider uppercase mt-0.5", isLight ? "text-white/70" : "text-muted-foreground")}>
            only deliver it
          </span>
        )}
      </div>
    </div>
  );
};
