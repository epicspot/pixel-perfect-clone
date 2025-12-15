import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Responsive table wrapper with horizontal scroll on mobile
 * and sticky first column for priority data visibility
 */
export const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-x-auto scrollbar-thin",
          // Fade hint for scroll on mobile
          "before:pointer-events-none before:absolute before:right-0 before:top-0 before:bottom-0 before:w-8 before:bg-gradient-to-l before:from-background/80 before:to-transparent before:z-10 before:opacity-0 before:transition-opacity",
          "md:before:hidden",
          // Show fade hint when scrollable
          "[&::-webkit-scrollbar]:h-2",
          "[&::-webkit-scrollbar-track]:bg-muted/50",
          "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveTable.displayName = "ResponsiveTable";

interface ResponsiveTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Make this cell sticky (priority column) */
  sticky?: boolean;
  /** Priority level - lower number = more important (shown first) */
  priority?: 1 | 2 | 3;
  /** Hide on mobile screens */
  hideOnMobile?: boolean;
  /** Hide on tablet and smaller screens */
  hideOnTablet?: boolean;
}

/**
 * Responsive table cell with priority visibility options
 */
export const ResponsiveTableCell = React.forwardRef<HTMLTableCellElement, ResponsiveTableCellProps>(
  ({ className, sticky, priority, hideOnMobile, hideOnTablet, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          "p-3 sm:p-4 align-middle whitespace-nowrap",
          // Sticky positioning for priority columns
          sticky && [
            "sticky left-0 z-20 bg-card",
            // Shadow to indicate scroll
            "after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-border",
          ],
          // Responsive visibility
          hideOnMobile && "hidden sm:table-cell",
          hideOnTablet && "hidden lg:table-cell",
          // Priority-based styling (visual emphasis)
          priority === 1 && "font-medium",
          priority === 2 && "text-muted-foreground",
          priority === 3 && "text-muted-foreground text-xs",
          className
        )}
        {...props}
      >
        {children}
      </td>
    );
  }
);
ResponsiveTableCell.displayName = "ResponsiveTableCell";

interface ResponsiveTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Make this header sticky (priority column) */
  sticky?: boolean;
  /** Hide on mobile screens */
  hideOnMobile?: boolean;
  /** Hide on tablet and smaller screens */
  hideOnTablet?: boolean;
}

/**
 * Responsive table header with priority visibility options
 */
export const ResponsiveTableHead = React.forwardRef<HTMLTableCellElement, ResponsiveTableHeadProps>(
  ({ className, sticky, hideOnMobile, hideOnTablet, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs sm:text-sm whitespace-nowrap",
          // Sticky positioning for priority columns
          sticky && [
            "sticky left-0 z-20 bg-muted/50",
          ],
          // Responsive visibility
          hideOnMobile && "hidden sm:table-cell",
          hideOnTablet && "hidden lg:table-cell",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);
ResponsiveTableHead.displayName = "ResponsiveTableHead";

interface MobileCardViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Card-based alternative view for tables on very small screens
 */
export const MobileCardView = React.forwardRef<HTMLDivElement, MobileCardViewProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "sm:hidden space-y-3",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MobileCardView.displayName = "MobileCardView";

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Individual card for mobile table row representation
 */
export const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card border border-border rounded-xl p-4 space-y-3",
          "transition-all duration-200 hover:shadow-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MobileCard.displayName = "MobileCard";

interface MobileCardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  children: React.ReactNode;
}

/**
 * Label-value row for mobile cards
 */
export const MobileCardRow = React.forwardRef<HTMLDivElement, MobileCardRowProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-2",
          className
        )}
        {...props}
      >
        <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
        <span className="text-sm font-medium text-right">{children}</span>
      </div>
    );
  }
);
MobileCardRow.displayName = "MobileCardRow";
