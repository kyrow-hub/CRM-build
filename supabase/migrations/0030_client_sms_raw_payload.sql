-- SMS Everyone's inbound webhook payload shape isn't confirmed by their
-- public docs (only described in prose - "mobile number, date/time, and
-- message text in either JSON or CSV"), unlike Twilio/Resend which have
-- precisely documented fields. receive-sms does best-effort extraction
-- from a handful of likely field-name candidates, but keeps the untouched
-- raw payload here too so nothing is lost if a real inbound message uses
-- field names the extraction logic doesn't recognise yet - that can be
-- fixed after seeing one real payload, without losing any data in the
-- meantime.

alter table public.client_sms add column raw_payload jsonb;
