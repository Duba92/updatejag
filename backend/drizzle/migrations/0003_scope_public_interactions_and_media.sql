ALTER POLICY "Likes public" ON public.likes USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = likes.post_id AND p.status = 'published'));
ALTER POLICY "Comments public" ON public.comments USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id AND p.status = 'published'));
ALTER POLICY "JAG media readable" ON storage.objects USING (
  bucket_id IN ('avatars','post-images','post-audio') AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (bucket_id = 'avatars' AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.avatar_url = 'storage:' || bucket_id || '/' || name
    ))
    OR (bucket_id IN ('post-images','post-audio') AND EXISTS (
      SELECT 1 FROM public.post_media m JOIN public.posts p ON p.id = m.post_id
      WHERE m.url = 'storage:' || bucket_id || '/' || name AND p.status = 'published'
    ))
  )
);