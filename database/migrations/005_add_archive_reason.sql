-- 005_add_archive_reason.sql
-- Records why/when a request was archived (from Pending Payment archive flow).
alter table requests
  add column if not exists archive_reason text,
  add column if not exists archived_at    timestamptz;
