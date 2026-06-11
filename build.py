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
SITE_URL = 'https://www.asbpub.ir'

CATEGORY_TITLES: Dict[str, str] = {
    'flashfictions': 'داستان برق‌آسا',
    'shortstories': 'داستان کوتاه',
    'novels': 'رمان',
    'articles': 'مجله‌ی اسب',
    'creators': 'پدیدآورندگان',
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

# --- Helper Functions ---
def is_english(text: str) -> bool:
    return bool(re.search(r'[a-zA-Z]', text))

def format_persian_date(date_str: str) -> str:
    """Converts YYYY/MM/DD to beautiful Persian date format with FA digits."""
    if not date_str or '/' not in str(date_str):
        return str(date_str)
    
    months = {
        '01': 'فروردین', '1': 'فروردین', '02': 'اردیبهشت', '2': 'اردیبهشت',
        '03': 'خرداد', '3': 'خرداد', '04': 'تیر', '4': 'تیر',
        '05': 'مرداد', '5': 'مرداد', '06': 'شهریور', '6': 'شهریور',
        '07': 'مهر', '7': 'مهر', '08': 'آبان', '8': 'آبان',
        '09': 'آذر', '9': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند'
    }
    
    # Translate English digits to Persian digits
    en_to_fa = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
    
    parts = str(date_str).split('/')
    if len(parts) == 3:
        year, month, day = parts
        month_name = months.get(month, month)
        return f"{day.translate(en_to_fa)} {month_name} {year.translate(en_to_fa)}"
    
    return str(date_str).translate(en_to_fa)

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
            
            # --- Smart Cover & Author Image Logic ---
            raw_cover = str(post.get('cover', '')).strip()
            raw_image = str(post.get('image', '')).strip()
            
            cover_abs = None
            if raw_cover:
                # Cover is always inside the story folder by default
                cover_abs = (md_path.parent / raw_cover).resolve()
                
            image_abs = None
            if raw_image:
                # Author image is outside the story folder (one level up) by default
                if raw_image.startswith('../'):
                    image_abs = (md_path.parent / raw_image).resolve()
                else:
                    image_abs = (md_path.parent.parent / raw_image).resolve()
                    
            # Fallbacks: if one is missing, fallback to the other gracefully
            if not cover_abs and image_abs:
                cover_abs = image_abs
            if not image_abs and cover_abs:
                image_abs = cover_abs
                
            # Prepare clean relative paths specifically for the Jinja HTML rendering
            template_cover = ''
            if cover_abs:
                template_cover = os.path.relpath(cover_abs, md_path.parent).replace('\\', '/')
                
            template_image = ''
            if image_abs:
                template_image = os.path.relpath(image_abs, md_path.parent).replace('\\', '/')
            
            date = str(post.get('date', ''))
            formatted_date = format_persian_date(date)
            
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
                cover=template_cover,
                image=template_image,
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
            if cover_abs:
                rel_path_to_cover_from_root = os.path.relpath(cover_abs, root_abs).replace('\\', '/')

            rel_path_to_image_from_root = ''
            if image_abs:
                rel_path_to_image_from_root = os.path.relpath(image_abs, root_abs).replace('\\', '/')
                
            post_data = {
                'title': title,
                'author': author,
                'url': rel_path_to_post_from_root,
                'cover': rel_path_to_cover_from_root,
                'image': rel_path_to_image_from_root,
                'date': date,
                'formatted_date': formatted_date,
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
                if cover_abs:
                    rel_path_to_cover = os.path.relpath(cover_abs, cat_dir_abs).replace('\\', '/')
                    
                rel_path_to_image = ''
                if image_abs:
                    rel_path_to_image = os.path.relpath(image_abs, cat_dir_abs).replace('\\', '/')
                    
                categories[category].append({
                    'title': title,
                    'author': author,
                    'url': rel_path_to_post,
                    'cover': rel_path_to_cover,
                    'image': rel_path_to_image,
                    'date': date,
                    'formatted_date': formatted_date,
                    'category': category
                })
                
            # --- Tagging Logic ---
            for tag in tags:
                tag_dir = TAGS_DIR / tag
                tag_dir.mkdir(parents=True, exist_ok=True)
                
                tag_dir_abs = tag_dir.resolve()
                
                tag_rel_url = os.path.relpath(html_abs, tag_dir_abs).replace('\\', '/')
                
                tag_rel_cover = ''
                if cover_abs:
                    tag_rel_cover = os.path.relpath(cover_abs, tag_dir_abs).replace('\\', '/')
                    
                tag_rel_image = ''
                if image_abs:
                    tag_rel_image = os.path.relpath(image_abs, tag_dir_abs).replace('\\', '/')
                
                tags_map[tag].append({
                    'title': title,
                    'author': author,
                    'url': tag_rel_url,
                    'cover': tag_rel_cover,
                    'image': tag_rel_image,
                    'date': date,
                    'formatted_date': formatted_date,
                    'category': category 
                })
                    
        except Exception as e:
            print(f"Error processing {md_path}: {e}")

    # --- Generate Homepage ---
    try:
        all_posts.sort(key=lambda x: x['date'], reverse=True)
        
        # Split stories (Newest) and articles (Magazine) for the homepage
        latest_stories = [p for p in all_posts if p['category'] != 'articles'][:6]
        latest_articles = [p for p in all_posts if p['category'] == 'articles'][:6]
        
        final_home = home_template.render(
            latest_posts=latest_stories, 
            latest_articles=latest_articles,
            base_path=''
        )
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
