-- Cambia il tipo della colonna data da jsonb a text.
-- Necessario perché @netlify/neon v0.1.2 restituisce colonne jsonb
-- come [object Object] invece che come oggetto JSON parsato.
-- La colonna contiene comunque stringhe JSON valide, il parsing
-- viene gestito lato applicazione con JSON.parse().
ALTER TABLE public_itineraries
  ALTER COLUMN data TYPE text USING data::text;
