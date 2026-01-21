-- Create mediator_availability table for storing available time slots
CREATE TABLE public.mediator_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mediator_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  specific_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable Row Level Security
ALTER TABLE public.mediator_availability ENABLE ROW LEVEL SECURITY;

-- Mediators can view their own availability
CREATE POLICY "Mediators can view their own availability"
ON public.mediator_availability
FOR SELECT
USING (auth.uid() = mediator_id);

-- Mediators can insert their own availability
CREATE POLICY "Mediators can insert their own availability"
ON public.mediator_availability
FOR INSERT
WITH CHECK (auth.uid() = mediator_id AND has_role(auth.uid(), 'mediator'));

-- Mediators can update their own availability
CREATE POLICY "Mediators can update their own availability"
ON public.mediator_availability
FOR UPDATE
USING (auth.uid() = mediator_id AND has_role(auth.uid(), 'mediator'));

-- Mediators can delete their own availability
CREATE POLICY "Mediators can delete their own availability"
ON public.mediator_availability
FOR DELETE
USING (auth.uid() = mediator_id AND has_role(auth.uid(), 'mediator'));

-- Admins can view all availability
CREATE POLICY "Admins can view all availability"
ON public.mediator_availability
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can view mediator availability (for scheduling)
CREATE POLICY "Users can view all mediator availability for scheduling"
ON public.mediator_availability
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_mediator_availability_mediator ON public.mediator_availability(mediator_id);
CREATE INDEX idx_mediator_availability_day ON public.mediator_availability(day_of_week);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_mediator_availability_updated_at
BEFORE UPDATE ON public.mediator_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();