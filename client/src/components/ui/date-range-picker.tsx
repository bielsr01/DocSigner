import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DatePickerRangeProps {
  value: { from?: Date; to?: Date };
  onChange: (value: { from?: Date; to?: Date }) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerRange({
  value,
  onChange,
  placeholder = "Selecionar período",
  className
}: DatePickerRangeProps) {
  const formatRange = () => {
    if (value.from) {
      if (value.to) {
        return `${format(value.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(value.to, "dd/MM/yyyy", { locale: ptBR })}`;
      } else {
        return format(value.from, "dd/MM/yyyy", { locale: ptBR });
      }
    }
    return placeholder;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value.from}
          selected={{ from: value.from, to: value.to }}
          onSelect={(range) => onChange(range || {})}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}