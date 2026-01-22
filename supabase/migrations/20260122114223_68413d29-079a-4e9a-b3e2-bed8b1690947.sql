-- Create mediator_blocked_dates table for vacations, holidays, etc.
CREATE TABLE public.mediator_blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mediator_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mediator_blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Mediators can view their own blocked dates"
ON public.mediator_blocked_dates FOR SELECT
USING (auth.uid() = mediator_id);

CREATE POLICY "Mediators can insert their own blocked dates"
ON public.mediator_blocked_dates FOR INSERT
WITH CHECK (auth.uid() = mediator_id AND has_role(auth.uid(), 'mediator'::app_role));

CREATE POLICY "Mediators can update their own blocked dates"
ON public.mediator_blocked_dates FOR UPDATE
USING (auth.uid() = mediator_id AND has_role(auth.uid(), 'mediator'::app_role));

CREATE POLICY "Mediators can delete their own blocked dates"
ON public.mediator_blocked_dates FOR DELETE
USING (auth.uid() = mediator_id AND has_role(auth.uid(), 'mediator'::app_role));

CREATE POLICY "Users can view mediator blocked dates for scheduling"
ON public.mediator_blocked_dates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all blocked dates"
ON public.mediator_blocked_dates FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_mediator_blocked_dates_updated_at
BEFORE UPDATE ON public.mediator_blocked_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add room_url column to mediator_requests for video calls
ALTER TABLE public.mediator_requests 
ADD COLUMN room_url TEXT,
ADD COLUMN room_name TEXT;