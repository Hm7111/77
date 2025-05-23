/*
  # Set up templates storage and permissions

  1. Storage
    - Create templates bucket for storing letter template images
    - Set up storage policies for authenticated users

  2. Security
    - Enable RLS on templates bucket
    - Add policies for authenticated users to read templates
    - Add policies for admin users to manage templates
*/

-- Create storage bucket for templates
insert into storage.buckets (id, name)
values ('templates', 'templates');

-- Set up storage policies
create policy "Authenticated users can view template images"
on storage.objects for select
to authenticated
using (bucket_id = 'templates');

create policy "Only admins can manage template images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'templates' and
  (auth.jwt() ->> 'role')::text = 'admin'
);

create policy "Only admins can update template images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'templates' and
  (auth.jwt() ->> 'role')::text = 'admin'
)
with check (
  bucket_id = 'templates' and
  (auth.jwt() ->> 'role')::text = 'admin'
);

create policy "Only admins can delete template images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'templates' and
  (auth.jwt() ->> 'role')::text = 'admin'
);