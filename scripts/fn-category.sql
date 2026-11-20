-- Função de contagem por categoria (nome antes do " — ")
create or replace function public.count_screens_by_category()
returns table (category text, count bigint)
language sql stable
as $$
  select split_part(name, ' — ', 1) as category, count(*)::bigint
  from public.screens
  group by 1
  order by 2 desc
$$;
