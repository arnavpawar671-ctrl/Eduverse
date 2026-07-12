CREATE OR REPLACE FUNCTION public.gen_join_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;