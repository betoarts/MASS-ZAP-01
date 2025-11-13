"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur border border-purple-100/70 dark:border-white/10 px-4 sm:px-6 py-4 shadow-[0_2px_12px_rgba(89,63,255,0.08)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-purple-700/80 dark:text-purple-200/80">
              {subtitle}
            </p>
          )}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
};

export default PageHeader;