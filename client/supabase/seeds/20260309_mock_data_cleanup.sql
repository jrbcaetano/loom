-- Cleanup for Loom mock data seed
-- Removes only the dedicated mock family and dependents.

do $$
declare
  v_family_id uuid := '8d44a9fe-4e3b-4ece-a453-0d253ec7d8f2';
begin
  delete from public.families where id = v_family_id;
end
$$;

