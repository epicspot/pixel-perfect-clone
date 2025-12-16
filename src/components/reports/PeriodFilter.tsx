import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  subMonths, subQuarters, subYears, format
} from 'date-fns';
import { fr } from 'date-fns/locale';

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

interface PeriodFilterProps {
  value: PeriodRange;
  onChange: (period: PeriodRange) => void;
  className?: string;
}

const presetPeriods = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'this_week', label: 'Cette semaine' },
  { id: 'this_month', label: 'Ce mois' },
  { id: 'last_month', label: 'Mois dernier' },
  { id: 'this_quarter', label: 'Ce trimestre' },
  { id: 'last_quarter', label: 'Trimestre dernier' },
  { id: 'this_year', label: 'Cette année' },
  { id: 'last_year', label: 'Année dernière' },
  { id: 'custom', label: 'Personnalisée' },
];

export const getPeriodFromPreset = (presetId: string): PeriodRange => {
  const now = new Date();
  
  switch (presetId) {
    case 'today':
      return { start: now, end: now, label: "Aujourd'hui" };
    case 'this_week':
      return { 
        start: startOfWeek(now, { weekStartsOn: 1 }), 
        end: endOfWeek(now, { weekStartsOn: 1 }), 
        label: 'Cette semaine' 
      };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'Ce mois' };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: 'Mois dernier' };
    case 'this_quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now), label: 'Ce trimestre' };
    case 'last_quarter':
      const lastQuarter = subQuarters(now, 1);
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter), label: 'Trimestre dernier' };
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now), label: 'Cette année' };
    case 'last_year':
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear), label: 'Année dernière' };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'Ce mois' };
  }
};

export const PeriodFilter = ({ value, onChange, className }: PeriodFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('this_month');
  const [customStart, setCustomStart] = useState(format(value.start, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(value.end, 'yyyy-MM-dd'));

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId !== 'custom') {
      const period = getPeriodFromPreset(presetId);
      onChange(period);
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    onChange({
      start,
      end,
      label: `${format(start, 'dd/MM/yy')} - ${format(end, 'dd/MM/yy')}`,
    });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className}>
          <Calendar className="w-4 h-4 mr-2" />
          <span className="truncate max-w-[150px]">{value.label}</span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Période prédéfinie</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetPeriods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPreset === 'custom' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Du</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Au</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={handleCustomApply} className="w-full">
                Appliquer
              </Button>
            </>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            {format(value.start, 'dd MMM yyyy', { locale: fr })} — {format(value.end, 'dd MMM yyyy', { locale: fr })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
