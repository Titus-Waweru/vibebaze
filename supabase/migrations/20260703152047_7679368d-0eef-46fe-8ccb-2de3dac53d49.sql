
-- Admin-only functions to inspect storage usage and database health.
-- All are SECURITY DEFINER and check has_role(auth.uid(), 'admin') before returning data.

-- 1) Storage usage: totals + breakdown by media type (from storage.objects metadata)
CREATE OR REPLACE FUNCTION public.admin_storage_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH obj AS (
    SELECT
      COALESCE((metadata->>'size')::bigint, 0) AS size_bytes,
      COALESCE(metadata->>'mimetype', '') AS mime,
      name,
      created_at
    FROM storage.objects
    WHERE bucket_id = 'media'
  ),
  agg AS (
    SELECT
      SUM(size_bytes)::bigint AS total_bytes,
      COUNT(*)::bigint AS total_files,
      SUM(CASE WHEN mime LIKE 'image/%' THEN size_bytes ELSE 0 END)::bigint AS image_bytes,
      SUM(CASE WHEN mime LIKE 'image/%' THEN 1 ELSE 0 END)::bigint AS image_count,
      SUM(CASE WHEN mime LIKE 'video/%' THEN size_bytes ELSE 0 END)::bigint AS video_bytes,
      SUM(CASE WHEN mime LIKE 'video/%' THEN 1 ELSE 0 END)::bigint AS video_count,
      SUM(CASE WHEN mime LIKE 'audio/%' THEN size_bytes ELSE 0 END)::bigint AS audio_bytes,
      SUM(CASE WHEN mime LIKE 'audio/%' THEN 1 ELSE 0 END)::bigint AS audio_count,
      SUM(CASE WHEN mime NOT LIKE 'image/%' AND mime NOT LIKE 'video/%' AND mime NOT LIKE 'audio/%' THEN size_bytes ELSE 0 END)::bigint AS other_bytes,
      SUM(CASE WHEN mime NOT LIKE 'image/%' AND mime NOT LIKE 'video/%' AND mime NOT LIKE 'audio/%' THEN 1 ELSE 0 END)::bigint AS other_count,
      AVG(size_bytes)::bigint AS avg_bytes
    FROM obj
  ),
  largest AS (
    SELECT jsonb_agg(jsonb_build_object('name', name, 'size', size_bytes, 'mime', mime) ORDER BY size_bytes DESC) AS files
    FROM (SELECT name, size_bytes, mime FROM obj ORDER BY size_bytes DESC LIMIT 10) t
  ),
  growth AS (
    SELECT jsonb_agg(jsonb_build_object('day', day, 'bytes', bytes) ORDER BY day) AS series
    FROM (
      SELECT date_trunc('day', created_at)::date AS day, SUM(size_bytes)::bigint AS bytes
      FROM obj
      WHERE created_at > now() - interval '30 days'
      GROUP BY 1
    ) g
  )
  SELECT jsonb_build_object(
    'total_bytes', COALESCE((SELECT total_bytes FROM agg), 0),
    'total_files', COALESCE((SELECT total_files FROM agg), 0),
    'avg_bytes', COALESCE((SELECT avg_bytes FROM agg), 0),
    'image_bytes', COALESCE((SELECT image_bytes FROM agg), 0),
    'image_count', COALESCE((SELECT image_count FROM agg), 0),
    'video_bytes', COALESCE((SELECT video_bytes FROM agg), 0),
    'video_count', COALESCE((SELECT video_count FROM agg), 0),
    'audio_bytes', COALESCE((SELECT audio_bytes FROM agg), 0),
    'audio_count', COALESCE((SELECT audio_count FROM agg), 0),
    'other_bytes', COALESCE((SELECT other_bytes FROM agg), 0),
    'other_count', COALESCE((SELECT other_count FROM agg), 0),
    'largest_files', COALESCE((SELECT files FROM largest), '[]'::jsonb),
    'growth_30d', COALESCE((SELECT series FROM growth), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2) Database size + per-table stats (public schema only)
CREATE OR REPLACE FUNCTION public.admin_db_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_result jsonb;
  v_db_size bigint;
  v_tables jsonb;
  v_connections int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT pg_database_size(current_database())::bigint INTO v_db_size;

  SELECT jsonb_agg(row_to_json(t) ORDER BY (t.total_bytes) DESC) INTO v_tables
  FROM (
    SELECT
      c.relname AS table_name,
      pg_total_relation_size(c.oid)::bigint AS total_bytes,
      pg_relation_size(c.oid)::bigint AS table_bytes,
      pg_indexes_size(c.oid)::bigint AS index_bytes,
      c.reltuples::bigint AS row_estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 25
  ) t;

  SELECT count(*)::int INTO v_connections
  FROM pg_stat_activity
  WHERE datname = current_database();

  v_result := jsonb_build_object(
    'database_bytes', v_db_size,
    'active_connections', v_connections,
    'tables', COALESCE(v_tables, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- 3) Media processing / upload stats (last 24h posts + views)
CREATE OR REPLACE FUNCTION public.admin_media_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'uploads_today', (SELECT count(*) FROM public.posts WHERE created_at > now() - interval '24 hours' AND media_url IS NOT NULL),
    'uploads_7d', (SELECT count(*) FROM public.posts WHERE created_at > now() - interval '7 days' AND media_url IS NOT NULL),
    'videos_total', (SELECT count(*) FROM public.posts WHERE type = 'video'),
    'images_total', (SELECT count(*) FROM public.posts WHERE type = 'image'),
    'audio_total', (SELECT count(*) FROM public.posts WHERE type = 'audio'),
    'text_total', (SELECT count(*) FROM public.posts WHERE type = 'text'),
    'posts_missing_thumbnail', (SELECT count(*) FROM public.posts WHERE type = 'video' AND thumbnail_url IS NULL),
    'views_24h', (SELECT count(*) FROM public.content_views WHERE created_at > now() - interval '24 hours' AND is_counted = true)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_storage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_db_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_media_stats() TO authenticated;
