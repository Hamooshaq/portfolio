"use client";

import { type ReactNode, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

interface MagneticButtonProps extends Omit<HTMLMotionProps<"a">, "children"> {
  children: ReactNode;
  subtle?: boolean;
}

export function MagneticButton({
  children,
  className,
  subtle = false,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <motion.a
      ref={ref}
      className={cn(
        "group inline-flex items-center gap-3 overflow-hidden rounded-full border px-5 py-3 text-sm tracking-[0.08em] transition-colors",
        subtle
          ? "border-white/12 bg-white/[0.03] text-white/70 hover:border-white/30 hover:text-white"
          : "border-[color:var(--scene-accent)] text-white [background:color-mix(in_srgb,var(--scene-accent)_9%,transparent)]",
        className
      )}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 190, damping: 18, mass: 0.55 }}
      onMouseMove={(event) => {
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds) {
          return;
        }

        setOffset({
          x: (event.clientX - bounds.left - bounds.width / 2) * 0.16,
          y: (event.clientY - bounds.top - bounds.height / 2) * 0.2
        });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      {...props}
    >
      <span>{children}</span>
      <ArrowUpRight
        aria-hidden
        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
      />
    </motion.a>
  );
}
