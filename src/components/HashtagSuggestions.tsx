import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Hash, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HashtagSuggestionsProps {
  caption: string;
  mediaType: "text" | "image" | "video" | "audio";
  selectedHashtags: string[];
  onToggleHashtag: (tag: string) => void;
}

// Common keywords mapped to relevant hashtags
const keywordHashtagMap: Record<string, string[]> = {
  dance: ["dance", "dancechallenge", "moves", "dancer"],
  music: ["music", "musician", "newmusic", "vibes"],
  food: ["foodie", "food", "yummy", "recipe", "cooking"],
  fashion: ["fashion", "style", "ootd", "outfit"],
  travel: ["travel", "adventure", "explore", "wanderlust"],
  fitness: ["fitness", "workout", "gym", "health"],
  art: ["art", "artist", "creative", "artwork"],
  comedy: ["funny", "comedy", "lol", "humor"],
  beauty: ["beauty", "makeup", "skincare", "glam"],
  tech: ["tech", "technology", "gadgets", "innovation"],
  love: ["love", "couple", "relationship", "romance"],
  nature: ["nature", "outdoors", "scenic", "beautiful"],
  gaming: ["gaming", "gamer", "esports", "videogames"],
  motivation: ["motivation", "inspiration", "mindset", "goals"],
  kenya: ["kenya", "nairobi", "kenyan", "254"],
  africa: ["africa", "african", "afrobeats", "africanculture"],
};

// Media type specific hashtags
const mediaTypeHashtags: Record<string, string[]> = {
  video: ["video", "viral", "fyp", "trending"],
  image: ["photo", "photography", "picoftheday", "instadaily"],
  audio: ["audio", "podcast", "sound", "listen"],
  text: ["thoughts", "quote", "wisdom", "mindset"],
};

const HashtagSuggestions = ({
  caption,
  mediaType,
  selectedHashtags,
  onToggleHashtag,
}: HashtagSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  useEffect(() => {
    fetchTrendingTags();
  }, []);

  useEffect(() => {
    generateSuggestions();
  }, [caption, mediaType, trendingTags]);

  const fetchTrendingTags = async () => {
    try {
      const { data } = await supabase
        .from("posts")
        .select("hashtags")
        .not("hashtags", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) {
        const tagCounts: Record<string, number> = {};
        data.forEach((post) => {
          post.hashtags?.forEach((tag: string) => {
            tagCounts[tag.toLowerCase()] = (tagCounts[tag.toLowerCase()] || 0) + 1;
          });
        });

        const sorted = Object.entries(tagCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([tag]) => tag);

        setTrendingTags(sorted);
      }
    } catch (error) {
      console.error("Error fetching trending tags:", error);
    }
  };

  const generateSuggestions = () => {
    const newSuggestions = new Set<string>();

    // Always add VibeBaze tag
    newSuggestions.add("VibeBaze");

    // Add media type specific tags
    mediaTypeHashtags[mediaType]?.forEach((tag) => newSuggestions.add(tag));

    // Analyze caption for keywords
    const words = caption.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      // Direct word match
      Object.entries(keywordHashtagMap).forEach(([keyword, tags]) => {
        if (word.includes(keyword) || keyword.includes(word)) {
          tags.forEach((tag) => newSuggestions.add(tag));
        }
      });
    });

    // Add some trending tags
    trendingTags.slice(0, 3).forEach((tag) => newSuggestions.add(tag));

    // Filter out already selected tags
    const filteredSuggestions = Array.from(newSuggestions).filter(
      (tag) => !selectedHashtags.includes(tag)
    );

    setSuggestions(filteredSuggestions.slice(0, 12));
  };

  if (suggestions.length === 0 && selectedHashtags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Selected Hashtags */}
      {selectedHashtags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Selected tags (tap to remove)
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="cursor-pointer bg-primary hover:bg-primary/80 text-primary-foreground"
                onClick={() => onToggleHashtag(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Hashtags */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Suggested tags (tap to add)
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
                onClick={() => onToggleHashtag(tag)}
              >
                {tag === "VibeBaze" && <TrendingUp className="h-3 w-3 mr-1" />}
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HashtagSuggestions;
