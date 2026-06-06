import os
import re
import json
import markdown
import frontmatter
from jinja2 import Environment, FileSystemLoader
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote
from datetime import datetime
from typing import Dict, List, Any

# --- Configuration Constants ---
SITE_URL = 'https://asbpub.vercel.app'

CATEGORY_TITLES: Dict[str, str] = {
    'flashfictions': 'داستان برق‌آسا',
    'shortstories': 'داستان کوتاه',
    'novels': 'رمان',
    'articles': 'جستار',
    'about': 'درباره‌ی ما'
}

MAIN_DIR = Path('main')
TAGS_DIR = MAIN_DIR / 'tags'
BASE_TEMPLATE_NAME = 'template.html'
INDEX_TEMPLATE_NAME = 'index_template.html'
HOME_TEMPLATE_NAME = 'home_template.html'

env = Environment(loader=FileSystemLoader('.'))
template = env.get_template(BASE_TEMPLATE_NAME)
index_template = env.get_template(INDEX_TEMPLATE_NAME)
home_template = env.get_template(HOME_TEMPLATE_NAME)

md_processor = markdown.Markdown(extensions=['extra', 'tables'])

def is_english(text: str) -> bool:
    return bool(re.search(r'[a-zA-Z]', text))

def build_site() -> None:
    print("Starting build process for ASB Publishing...")
    
    categories: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    tags_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    all_posts: List[Dict[str, Any]] = [] 
    search_index: List[Dict[str, Any]] = [] 
    sitemap_urls: List[str] = [''] # Initialize sitemap with root URL
    
    root_abs = Path('.').resolve()
    
    for md_path in MAIN_DIR.rglob('*.md'):
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
            
            md_processor.reset()
            html_content = md_processor.convert(post.content)
            
            title = post.get('title', 'بدون عنوان')
            author = post.get('author', '')
            translator = post.get('translator', '')
            cover = post.get('cover', '')
            date = post.get('date', '') 
            
            tags = post.get('tags', [])
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(',')]
                
            tags_en = [t for t in tags if is_english(t)]
            tags_fa = [t for t in tags if not is_english(t)]
                
            parts = md_path.parts
            folder_category = parts[1] if len(parts) >= 2 else ''
            category = post.get('category', folder_category)
            
            depth = len(parts) - 1
            base_path = '../' * depth
            
            final_html = template.render(
                title=title,
                author=author,
                translator=translator,
                cover=cover,
                tags_fa=tags_fa,
                tags_en=tags_en,
                category=category,
                content=html_content,
                base_path=base_path
            )
            
            html_path = md_path.with_suffix('.html')
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            html_abs = html_path.resolve()
            
            # --- Homepage, Search & Sitemap Logic ---
            rel_path_to_post_from_root = os.path.relpath(html_abs, root_abs).replace('\\', '/')
            sitemap_urls.append(rel_path_to_post_from_root)
            
            rel_path_to_cover_from_root = ''
            if cover:
                cover_abs = (md_path.parent / cover).resolve()
                rel_path_to_cover_from_root = os.path.relpath(cover_abs, root_abs).replace('\\', '/')
                
            post_data = {
                'title': title,
                'author': author,
                'url': rel_path_to_post_from_root,
                'cover': rel_path_to_cover_from_root,
                'date': date,
                'category': category 
            }
            
            all_posts.append(post_data)
            
            search_index.append({
                'title': title,
                'author': author,
                'tags': tags,
                'category': CATEGORY_TITLES.get(category, category),
                'url': rel_path_to_post_from_root
            })
            
            # --- Categorization Logic ---
            if category:
                category_dir = MAIN_DIR / category
                cat_dir_abs = category_dir.resolve()
                
                rel_path_to_post = os.path.relpath(html_abs, cat_dir_abs).replace('\\', '/')
                rel_path_to_cover = ''
                
                if cover:
                    rel_path_to_cover = os.path.relpath(cover_abs, cat_dir_abs).replace('\\', '/')
                    
                categories[category].append({
                    'title': title,
                    'author': author,
                    'url': rel_path_to_post,
                    'cover': rel_path_to_cover,
                    'date': date,
                    'category': category
                })
                
            # --- Tagging Logic ---
            for tag in tags:
                tag_dir = TAGS_DIR / tag
                tag_dir_abs = tag_dir.resolve()
                
                tag_rel_url = os.path.relpath(html_abs, tag_dir_abs).replace('\\', '/')
                tag_rel_cover = ''
                
                if cover:
                    tag_rel_cover = os.path.relpath(cover_abs, tag_dir_abs).replace('\\', '/')
                
                tags_map[tag].append({
                    'title': title,
                    'author': author,
                    'url': tag_rel_url,
                    'cover': tag_rel_cover,
                    'date': date,
                    'category': category 
                })
                    
        except Exception as e:
            print(f"Error processing {md_path}: {e}")

    # --- Generate Homepage ---
    try:
        all_posts.sort(key=lambda x: x['date'], reverse=True)
        latest_posts = all_posts[:6]
        
        final_home = home_template.render(latest_posts=latest_posts, base_path='')
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(final_home)
    except Exception as e:
        print(f"Error generating homepage: {e}")

    # --- Generate Search JSON ---
    try:
        with open('search.json', 'w', encoding='utf-8') as f:
            json.dump(search_index, f, ensure_ascii=False)
        print("Successfully generated search.json")
    except Exception as e:
        print(f"Error generating search JSON: {e}")

    # --- Generate Category Index Pages ---
    for cat, section_title in CATEGORY_TITLES.items():
        try:
            cat_dir = MAIN_DIR / cat
            cat_dir.mkdir(parents=True, exist_ok=True)
            
            index_path = cat_dir / 'index.html'
            sitemap_urls.append(f"main/{cat}/index.html")
            
            posts = categories.get(cat, [])
            posts.sort(key=lambda x: x['date'], reverse=True)
            
            final_index = index_template.render(
                section_title=section_title,
                category=cat,
                posts=posts,
                base_path='../../',
                is_tag_page=False 
            )
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(final_index)
        except Exception as e:
            print(f"Error generating index for {cat}: {e}")

    # --- Generate Tag Index Pages ---
    for tag, posts in tags_map.items():
        try:
            tag_dir = TAGS_DIR / tag
            tag_dir.mkdir(parents=True, exist_ok=True)
            
            index_path = tag_dir / 'index.html'
            sitemap_urls.append(f"main/tags/{quote(tag)}/index.html")
            
            posts.sort(key=lambda x: x['date'], reverse=True)
            
            final_index = index_template.render(
                section_title=f"هشتگ: {tag}",
                category='tags',
                posts=posts,
                base_path='../../../', 
                is_tag_page=True 
            )
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(final_index)
        except Exception as e:
            print(f"Error generating tag index for {tag}: {e}")

    # --- Generate Sitemap XML ---
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        sitemap_content = ['<?xml version="1.0" encoding="UTF-8"?>']
        sitemap_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        
        for url in sitemap_urls:
            full_url = f"{SITE_URL}/{url}" if url else SITE_URL
            sitemap_content.append(f'  <url>\n    <loc>{full_url}</loc>\n    <lastmod>{today}</lastmod>\n  </url>')
            
        sitemap_content.append('</urlset>')
        
        with open('sitemap.xml', 'w', encoding='utf-8') as f:
            f.write('\n'.join(sitemap_content))
        print("Successfully generated sitemap.xml")
    except Exception as e:
        print(f"Error generating sitemap: {e}")

if __name__ == '__main__':
    build_site()
    print("Build complete!")
