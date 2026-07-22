import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';

const categories = ['match_day', 'practice', 'tournament', 'celebration', 'training_camp', 'general_post'];

export default function TeamGalleryPostsPage() {
  const [posts, setPosts] = useState([]);
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('general_post');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/team/gallery-posts');
      setPosts(response.data.data.posts || []);
    } catch (error) {
      setMessage(error.userMessage || 'Unable to load gallery posts.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!files.length) return setMessage('Choose at least one image.');
    const form = new FormData();
    [...files].forEach((file) => form.append('images', file));
    form.append('caption', caption);
    form.append('category', category);
    try {
      await api.post('/team/gallery-posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCaption('');
      setFiles([]);
      setMessage('Gallery post uploaded.');
      await load();
    } catch (error) {
      setMessage(error.userMessage || 'Unable to upload gallery post.');
    }
  };

  const remove = async (post) => {
    if (!window.confirm('Delete this gallery post?')) return;
    await api.delete(`/team/gallery-posts/${post.id}`);
    setPosts((current) => current.filter((item) => item.id !== post.id));
  };

  return (
    <>
      <header><p className="eyebrow">Team gallery</p><h1 className="page-title">Community Posts</h1><p className="page-copy">Upload public team moments that are not tied to a match.</p></header>
      {message && <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">{message}</p>}
      <form onSubmit={submit} className="panel mt-7 grid gap-4 lg:grid-cols-[1fr_220px]">
        <label className="field-label">Caption<textarea className="field-input mt-2 min-h-24" value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
        <div className="space-y-4">
          <label className="field-label">Category<select className="field-input mt-2" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="field-label">Images<input className="field-input mt-2" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(event.target.files)} /></label>
          <button className="primary-button w-full"><ImagePlus size={16} /> Upload post</button>
        </div>
      </form>
      <section className="mt-7">{loading ? <div className="skeleton h-80" /> : posts.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <article key={post.id} className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025]">{post.images?.[0]?.imageUrl && <img src={post.images[0].imageUrl} alt={post.caption || 'Team gallery post'} className="aspect-[4/3] w-full object-cover" />}<div className="p-4"><span className="status-badge status-neutral">{post.category.replaceAll('_', ' ')}</span><p className="mt-3 text-sm text-white/60">{post.caption || 'No caption'}</p><button className="secondary-button mt-4 border-red-300/20 text-red-100" type="button" onClick={() => remove(post)}><Trash2 size={15} /> Delete</button></div></article>)}</div> : <EmptyState title="No gallery posts" message="Upload the first independent team gallery post." />}</section>
    </>
  );
}
