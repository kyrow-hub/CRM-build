-- Removes service_deliveries (added in 0012_service_delivery.sql).
-- Service delivery is now tracked as a categorised case note instead -
-- every case note is classified into one of the service-delivery
-- categories (1:1 Mentoring, Case Management, Outreach, etc.), so a
-- separate table for the same purpose is no longer needed.
drop table if exists public.service_deliveries;
