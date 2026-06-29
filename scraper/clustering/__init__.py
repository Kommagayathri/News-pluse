"""
Option A keyword-overlap clustering for News Pulse.
No TF-IDF, no HDBSCAN, no Gemini, no machine learning.

Approach:
1. Combine title + summary + small body text.
2. Lowercase and extract simple words.
3. Remove stop words.
4. Compare articles using shared meaningful words.
5. Put related articles into the same cluster when overlap >= threshold.
"""

import re
from collections import Counter

# STOP_WORDS = {
#     "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
#     "with", "by", "from", "is", "are", "was", "were", "be", "been", "being",
#     "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
#     "may", "might", "can", "this", "that", "these", "those", "it", "its", "as",
#     "about", "after", "before", "over", "under", "into", "than", "then", "also",
#     "new", "said", "says", "say", "more", "most", "some", "such", "not", "no",
#     "up", "out", "off", "so", "just", "one", "two", "first", "last", "live",
#     "news", "video", "watch", "latest", "breaking", "update", "updates", "bbc",
#     "npr", "reuters", "times", "india", "hindu"  # source/common broad words
# }

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "can", "this", "that", "these", "those", "it", "its", "as",
    "about", "after", "before", "over", "under", "into", "than", "then", "also",
    "new", "said", "says", "say", "more", "most", "some", "such", "not", "no",
    "up", "out", "off", "so", "just", "one", "two", "first", "last", "live",
    "news", "video", "watch", "latest", "breaking", "update", "updates",

    # source/common broad words
    "bbc", "npr", "reuters", "times", "india", "hindu", "jazeera", "al",

    # date/time words causing wrong giant clusters
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "june", "july", "august",
    "september", "october", "november", "december",
    "year", "years", "today", "yesterday", "tomorrow",

    # weak pronoun/reporting words
    "his", "her", "their", "they", "them", "he", "she", "him",
    "according", "reported", "report", "reports", "claimed", "claims",
}

MIN_SHARED_WORDS = 4
MIN_CLUSTER_ARTICLES = 1


def prepare_text(article):
    """Combine useful article fields into one text string."""
    return " ".join([
        article.get("title") or "",
        article.get("summary") or "",
        (article.get("body") or "")[:500],
    ])


def get_keywords(text):
    """Return meaningful keywords from text as a set."""
    text = (text or "").lower()
    words = re.findall(r"[a-zA-Z]{3,}", text)
    return {word for word in words if word not in STOP_WORDS}


def overlap_score(words_a, words_b):
    """Count common keywords between two articles."""
    return len(words_a.intersection(words_b))


def make_label(articles):
    """Generate a simple cluster label using the most repeated keywords."""
    counter = Counter()
    for article in articles:
        counter.update(get_keywords(prepare_text(article)))

    top_words = [word.title() for word, _count in counter.most_common(4)]
    if top_words:
        return " ".join(top_words)

    # Fallback: use first article title
    title = articles[0].get("title") or "General News"
    return " ".join(title.split()[:5])


def cluster_articles(articles):
    """
    Group articles using simple keyword overlap.

    Returns list of:
    {
      "label": "Cluster Label",
      "article_ids": [1, 2, 3],
      "articles": [article_dicts]
    }
    """
    if not articles:
        print("[Cluster] No articles to cluster.")
        return []

    print(f"[Cluster] Option A keyword-overlap clustering on {len(articles)} articles...")

    article_keywords = {
        article["id"]: get_keywords(prepare_text(article))
        for article in articles
    }

    clusters = []

    for article in articles:
        current_words = article_keywords[article["id"]]
        added = False

        for cluster in clusters:
            # Compare with all articles already inside this cluster.
            # If it is related to any one article in the cluster, add it.
            for existing_article in cluster["articles"]:
                existing_words = article_keywords[existing_article["id"]]
                if overlap_score(current_words, existing_words) >= MIN_SHARED_WORDS:
                    cluster["articles"].append(article)
                    cluster["article_ids"].append(article["id"])
                    added = True
                    break
            if added:
                break

        if not added:
            clusters.append({
                "articles": [article],
                "article_ids": [article["id"]],
            })

    # Generate readable labels
    final_clusters = []
    for cluster in clusters:
        if len(cluster["articles"]) >= MIN_CLUSTER_ARTICLES:
            final_clusters.append({
                "label": make_label(cluster["articles"]),
                "article_ids": cluster["article_ids"],
                "articles": cluster["articles"],
            })

    print(f"[Cluster] Created {len(final_clusters)} keyword-overlap clusters.")
    return final_clusters


def group_stories(clusters):
    """
    Stretch-goal story grouping is intentionally skipped.
    The assignment does not require cross-source macro-story merging.
    """
    print("[Story Group] Skipped. Option A clustering only.")
    return []
