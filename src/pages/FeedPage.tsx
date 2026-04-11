import { useState, useEffect } from "react";
import { Heart, MessageCircle, Repeat2, Plus, Send, Image, X, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PostItem {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  created_at: string;
  author_name: string;
  author_initial: string;
  liked: boolean;
}

interface StoryItem {
  id: string;
  user_id: string;
  user_name: string;
  user_initial: string;
  isOwn: boolean;
}

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (user) {
      loadFeed();
      loadStories();
    }
  }, [user]);

  const loadFeed = async () => {
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!postsData) { setLoading(false); return; }

      // Get author profiles
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Get user's likes
      const { data: userLikes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user!.id);

      const likedSet = new Set(userLikes?.map((l) => l.post_id) || []);

      const items: PostItem[] = postsData.map((p) => {
        const profile = profileMap.get(p.user_id);
        const name = profile?.display_name || profile?.username || "Пользователь";
        return {
          ...p,
          author_name: name,
          author_initial: name[0],
          liked: likedSet.has(p.id),
        };
      });

      setPosts(items);
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select("id, user_id")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!data) return;

    const userIds = [...new Set(data.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // One story per user
    const seen = new Set<string>();
    const items: StoryItem[] = [];

    // Add "You" first
    items.push({
      id: "add",
      user_id: user!.id,
      user_name: "Вы",
      user_initial: "+",
      isOwn: true,
    });

    for (const s of data) {
      if (seen.has(s.user_id) || s.user_id === user!.id) continue;
      seen.add(s.user_id);
      const profile = profileMap.get(s.user_id);
      const name = profile?.display_name || profile?.username || "?";
      items.push({
        id: s.id,
        user_id: s.user_id,
        user_name: name,
        user_initial: name[0],
        isOwn: false,
      });
    }

    if (items.length === 1) {
      // Only "You" — still show it
    }

    setStories(items);
  };

  const toggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );

    if (post.liked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user!.id });
    }
  };

  const createPost = async () => {
    if (!newPostText.trim()) return;
    setPosting(true);

    const { error } = await supabase.from("posts").insert({
      user_id: user!.id,
      content: newPostText,
      image_url: newPostImage || null,
    });

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      setNewPostText("");
      setNewPostImage("");
      setShowNewPost(false);
      toast({ title: "Пост опубликован! 🎉" });
      loadFeed();
    }
    setPosting(false);
  };

  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast({ title: "Пост удалён" });
  };

  const addStory = async () => {
    const { error } = await supabase.from("stories").insert({
      user_id: user!.id,
      content: "📍 В сети",
    });
    if (!error) {
      toast({ title: "История добавлена!" });
      loadStories();
    }
  };

  return (
    <div className="flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 py-4">
        <h1 className="text-2xl font-black">Лента</h1>
      </div>

      {/* Stories */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {stories.length > 0 ? (
          stories.map((story, i) => (
            <motion.button
              key={story.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={story.isOwn ? addStory : undefined}
              className="flex flex-col items-center gap-1 min-w-[64px]"
            >
              <div className={cn("rounded-full p-0.5", story.isOwn ? "bg-muted" : "gradient-pulse")}>
                <div className="rounded-full border-2 border-background">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className={cn("text-sm font-bold", story.isOwn ? "bg-muted" : "gradient-pulse-glow text-white")}>
                      {story.isOwn ? <Plus className="h-5 w-5" /> : story.user_initial}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-16 text-center">{story.user_name}</span>
            </motion.button>
          ))
        ) : (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={addStory}
            className="flex flex-col items-center gap-1 min-w-[64px]"
          >
            <div className="rounded-full p-0.5 bg-muted">
              <div className="rounded-full border-2 border-background">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-muted text-sm font-bold">
                    <Plus className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">Вы</span>
          </motion.button>
        )}
      </div>

      {/* New Post Form */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 overflow-hidden"
          >
            <div className="rounded-2xl bg-card border border-border p-4">
              <Textarea
                placeholder="Что нового? ✨"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="min-h-[80px] border-0 bg-transparent resize-none p-0 focus-visible:ring-0"
              />
              <div className="relative">
                <input
                  placeholder="Ссылка на изображение (необязательно)"
                  value={newPostImage}
                  onChange={(e) => setNewPostImage(e.target.value)}
                  className="w-full rounded-lg bg-muted px-3 py-2 text-xs outline-none placeholder:text-muted-foreground mt-2"
                />
                <Image className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {newPostImage && (
                <img src={newPostImage} alt="" className="mt-2 w-full rounded-lg aspect-video object-cover" />
              )}
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={() => setShowNewPost(false)}>Отмена</Button>
                <Button
                  size="sm"
                  disabled={!newPostText.trim() || posting}
                  onClick={createPost}
                  className="gradient-pulse text-white border-0"
                >
                  {posting ? "..." : "Опубликовать"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-lg font-semibold">Лента пуста</p>
          <p className="text-sm text-muted-foreground mt-1">Будьте первым — создайте пост!</p>
          <Button className="mt-4 gradient-pulse text-white border-0" onClick={() => setShowNewPost(true)}>
            <Plus className="h-4 w-4 mr-2" /> Создать пост
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-card border border-border overflow-hidden"
            >
              {/* Author */}
              <div className="flex items-center gap-3 p-4 pb-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="gradient-pulse text-white font-bold text-sm">
                    {post.author_initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{post.author_name}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
                </div>
                {post.user_id === user!.id && (
                  <button onClick={() => deletePost(post.id)} className="rounded-full p-1.5 hover:bg-muted">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              <p className="px-4 pb-3 text-sm leading-relaxed">{post.content}</p>

              {post.image_url && (
                <img src={post.image_url} alt="" className="w-full aspect-video object-cover" loading="lazy" />
              )}

              {/* Actions */}
              <div className="flex items-center gap-6 px-4 py-3">
                <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 text-sm">
                  <Heart
                    className={cn(
                      "h-5 w-5 transition-colors",
                      post.liked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )}
                  />
                  <span className={cn(post.liked ? "text-red-500" : "text-muted-foreground")}>{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.comments_count}</span>
                </button>
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Repeat2 className="h-5 w-5" />
                  <span>{post.reposts_count}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB */}
      {!showNewPost && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-pulse shadow-lg shadow-primary/30"
          onClick={() => setShowNewPost(true)}
        >
          <Plus className="h-6 w-6 text-white" />
        </motion.button>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;

  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  if (diff < 172800) return "вчера";
  return date.toLocaleDateString("ru", { day: "numeric", month: "short" });
}
