import * as React from "react";
import { cn } from "@/lib/utils";

interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns on desktop (default: 2) */
  cols?: 1 | 2 | 3 | 4;
  /** Gap size (default: 4) */
  gap?: 2 | 3 | 4 | 6;
}

/**
 * Responsive form grid that adapts to screen size
 * - Mobile: 1 column
 * - Tablet/Desktop: specified columns
 */
export const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(
  ({ className, cols = 2, gap = 4, children, ...props }, ref) => {
    const colsClass = {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    }[cols];

    const gapClass = {
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      6: "gap-6",
    }[gap];

    return (
      <div
        ref={ref}
        className={cn("grid", colsClass, gapClass, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FormGrid.displayName = "FormGrid";

interface FormFieldWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Span full width on all screen sizes */
  fullWidth?: boolean;
  /** Span 2 columns on larger screens */
  span2?: boolean;
}

/**
 * Form field wrapper with responsive spanning
 */
export const FormFieldWrapper = React.forwardRef<HTMLDivElement, FormFieldWrapperProps>(
  ({ className, fullWidth, span2, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          fullWidth && "col-span-full",
          span2 && "sm:col-span-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FormFieldWrapper.displayName = "FormFieldWrapper";

interface ResponsiveDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width (default: md) */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

/**
 * Responsive container for dialog/modal content
 */
export const ResponsiveDialogContent = React.forwardRef<HTMLDivElement, ResponsiveDialogContentProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizeClass = {
      sm: "sm:max-w-sm",
      md: "sm:max-w-md",
      lg: "sm:max-w-lg",
      xl: "sm:max-w-xl",
      "2xl": "sm:max-w-2xl",
      full: "sm:max-w-[calc(100vw-2rem)]",
    }[size];

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-h-[85vh] overflow-y-auto",
          sizeClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

/**
 * Form section with optional title and description
 */
export const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h3 className="text-sm font-medium text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    );
  }
);
FormSection.displayName = "FormSection";

interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Align actions (default: end) */
  align?: "start" | "center" | "end" | "between";
}

/**
 * Form actions container (buttons)
 */
export const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, align = "end", children, ...props }, ref) => {
    const alignClass = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    }[align];

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col-reverse sm:flex-row gap-2 pt-4",
          alignClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FormActions.displayName = "FormActions";

interface ResponsiveInputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Group inputs horizontally on desktop, vertically on mobile
 */
export const ResponsiveInputGroup = React.forwardRef<HTMLDivElement, ResponsiveInputGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col sm:flex-row gap-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveInputGroup.displayName = "ResponsiveInputGroup";
