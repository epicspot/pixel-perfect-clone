-- Add session_id to tickets table to link sales to counter sessions
ALTER TABLE public.tickets 
ADD COLUMN session_id INTEGER REFERENCES public.counter_sessions(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_tickets_session_id ON public.tickets(session_id);