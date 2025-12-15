import React from 'react';
import { cn } from '@/lib/utils';
import { User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SeatSelectorProps {
  totalSeats: number;
  occupiedSeats: string[];
  selectedSeats: string[];
  onSelectSeats: (seats: string[]) => void;
  multiSelect?: boolean;
}

export const SeatSelector: React.FC<SeatSelectorProps> = ({
  totalSeats,
  occupiedSeats,
  selectedSeats,
  onSelectSeats,
  multiSelect = false,
}) => {
  // Calculate rows (4 seats per row: 2 left + aisle + 2 right)
  const seatsPerRow = 4;
  const rows = Math.ceil(totalSeats / seatsPerRow);

  const getSeatStatus = (seatNum: string) => {
    if (occupiedSeats.includes(seatNum)) return 'occupied';
    if (selectedSeats.includes(seatNum)) return 'selected';
    return 'available';
  };

  const handleSeatClick = (seatNum: string) => {
    if (multiSelect) {
      if (selectedSeats.includes(seatNum)) {
        onSelectSeats(selectedSeats.filter(s => s !== seatNum));
      } else {
        onSelectSeats([...selectedSeats, seatNum]);
      }
    } else {
      if (selectedSeats.includes(seatNum)) {
        onSelectSeats([]);
      } else {
        onSelectSeats([seatNum]);
      }
    }
  };

  const clearSelection = () => {
    onSelectSeats([]);
  };

  const renderSeat = (seatNumber: number) => {
    if (seatNumber > totalSeats) return <div key={`empty-${seatNumber}`} className="w-10 h-10" />;
    
    const seatNum = seatNumber.toString();
    const status = getSeatStatus(seatNum);
    const selectionIndex = selectedSeats.indexOf(seatNum);
    
    return (
      <button
        key={seatNum}
        type="button"
        disabled={status === 'occupied'}
        onClick={() => handleSeatClick(seatNum)}
        className={cn(
          'w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all relative',
          status === 'available' && 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer',
          status === 'occupied' && 'bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed',
          status === 'selected' && 'bg-primary border-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        title={status === 'occupied' ? `Siège ${seatNum} - Occupé` : `Siège ${seatNum}`}
      >
        {status === 'occupied' ? (
          <User className="w-4 h-4" />
        ) : (
          seatNum
        )}
        {multiSelect && status === 'selected' && selectionIndex >= 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-foreground text-primary text-[10px] rounded-full flex items-center justify-center font-bold border border-primary">
            {selectionIndex + 1}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Multi-select indicator */}
      {multiSelect && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
          <span>Mode groupe activé - Cliquez pour sélectionner plusieurs sièges</span>
          {selectedSeats.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-6 px-2 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <X className="w-3 h-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      )}

      {/* Bus front indicator */}
      <div className="flex justify-center">
        <div className="bg-muted text-muted-foreground text-xs px-4 py-1 rounded-t-xl border border-b-0 border-border">
          AVANT DU BUS
        </div>
      </div>

      {/* Bus body */}
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        {/* Driver area */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/50">
          <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-background border-2 border-muted-foreground/30 flex items-center justify-center">
              <User className="w-3 h-3" />
            </div>
            Chauffeur
          </div>
          <div className="text-xs text-muted-foreground">Porte</div>
        </div>

        {/* Seats grid */}
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, rowIndex) => {
            const rowStart = rowIndex * seatsPerRow;
            return (
              <div key={rowIndex} className="flex items-center justify-center gap-2">
                {/* Left side seats (2) */}
                <div className="flex gap-1">
                  {renderSeat(rowStart + 1)}
                  {renderSeat(rowStart + 2)}
                </div>
                
                {/* Aisle */}
                <div className="w-6 h-10 flex items-center justify-center">
                  <div className="w-[2px] h-full bg-border/50" />
                </div>
                
                {/* Right side seats (2) */}
                <div className="flex gap-1">
                  {renderSeat(rowStart + 3)}
                  {renderSeat(rowStart + 4)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rear indicator */}
        <div className="mt-4 pt-3 border-t border-border/50 text-center">
          <span className="text-xs text-muted-foreground">ARRIÈRE DU BUS</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700" />
          <span className="text-muted-foreground">Libre</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted border border-muted-foreground/30 flex items-center justify-center">
            <User className="w-2.5 h-2.5 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">Occupé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary border border-primary" />
          <span className="text-muted-foreground">Sélectionné</span>
        </div>
      </div>

      {/* Selected seats display */}
      {selectedSeats.length > 0 && (
        <div className="text-center">
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold flex-wrap justify-center">
            {selectedSeats.length === 1 ? 'Siège sélectionné:' : `${selectedSeats.length} sièges sélectionnés:`}
            <span className="flex gap-1 flex-wrap justify-center">
              {selectedSeats.map((seat, idx) => (
                <span key={seat} className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs">
                  {seat}
                </span>
              ))}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
