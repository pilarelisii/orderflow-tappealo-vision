-- Enable REPLICA IDENTITY FULL for complete row data in realtime events
ALTER TABLE public.orders REPLICA IDENTITY FULL;