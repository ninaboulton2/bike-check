"use client";

import * as React from "react";
import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { DayPicker } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

interface DatePickerProps {
  value: string; // ISO date string "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;

  const displayValue =
    selected && isValid(selected)
      ? format(selected, "d MMMM yyyy")
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            id={id}
            type="button"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "hover:bg-muted/40",
              !displayValue && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>{displayValue ?? placeholder}</span>
      </DialogTrigger>
      <DialogContent className="w-auto p-0 overflow-hidden" aria-describedby={undefined}>
        <DayPicker
          mode="single"
          selected={selected && isValid(selected) ? selected : undefined}
          onSelect={(day) => {
            if (day) {
              onChange(format(day, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          defaultMonth={selected && isValid(selected) ? selected : new Date()}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={new Date().getFullYear() + 1}
          className="p-4 pt-10"
        />
      </DialogContent>
    </Dialog>
  );
}
