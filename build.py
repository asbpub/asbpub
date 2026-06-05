import markdown
import frontmatter
from jinja2 import Environment, FileSystemLoader
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Any

# --- Configuration Constants ---
CATEGORY_TITLES: Dict[str, str] = {
    'flashfictions': 'داستان‌های برق‌آسا',
    'shortstories': 'داستان کوتاه',
    'novels': 'رمان',
    'poems': 'شعر',
    'articles': 'جستار'
}

MAIN_DIR = Path('main')
BASE_TEMPLATE_NAME = 'template.html'
INDEX_TEMPLATE_NAME = 'index_template.html'

# --- Environment Setup ---
env = Environment(loader=FileSystemLoader('.'))
template = env.get_template(BASE_TEMPLATE_NAME)
index_template = env.get_template(INDEX_TEMPLATE_NAME)

md_processor = markdown.Markdown(extensions=['extra', 'tables'])

def build_site() -> None:
    print("Starting build process for ASB Publishing...")
    
    categories: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    
    # --- Process Markdown Files ---
    # rglob systematically finds all .md files in all subdirectories
    for md_path in MAIN_DIR.rglob('*.md'):
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
            
            md_processor.reset()
            html_content = md_processor.convert(post.content)
            
            # Extract metadata with default fallbacks
            title = post.get('title', 'بدون عنوان')
            title_fn = post.get('title_fn', '')
            author = post.get('author', '')
            author_fn = post.get('author_fn', '')
            translator = post.get('translator', '')
            cover = post.get('cover', '')
            
            # Dynamically calculate path depth for relative linking
            depth = len(md_path.parts) - 1
            base_path = '../' * depth
            
            final_html = template.render(
                title=title,
                title_fn=title_fn,
                author=author,
                author_fn=author_fn,
                translator=translator,
                cover=cover,
                content=html_content,
                base_path=base_path
            )
            
            # Generate HTML output path
            html_path = md_path.with_suffix('.html')
            
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            print(f"Successfully compiled: {html_path}")
            
            # --- Categorization Logic ---
            parts = md_path.parts
            if len(parts) >= 2 and parts[0] == MAIN_DIR.name:
                category = parts[1]
                category_dir = MAIN_DIR / category
                
                # as_posix() ensures forward slashes for web URLs regardless of the OS
                rel_path_to_post = html_path.relative_to(category_dir).as_posix()
                
                rel_path_to_cover = ''
                if cover:
                    cover_path = md_path.parent / cover
                    rel_path_to_cover = cover_path.relative_to(category_dir).as_posix()
                    
                categories[category].append({
                    'title': title,
                    'author': author,
                    'url': rel_path_to_post,
                    'cover': rel_path_to_cover
                })
                
        except Exception as e:
            print(f"Error processing {md_path}: {e}")

    # --- Generate Category Index Pages ---
    for category, section_title in CATEGORY_TITLES.items():
        try:
            cat_dir = MAIN_DIR / category
            cat_dir.mkdir(parents=True, exist_ok=True)
            
            index_path = cat_dir / 'index.html'
            posts = categories.get(category, [])
            base_path = '../../'
            
            final_index = index_template.render(
                section_title=section_title,
                category=category,
                posts=posts,
                base_path=base_path
            )
            
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(final_index)
                
            print(f"Successfully generated archive index for: {category}")
            
        except Exception as e:
            print(f"Error generating index for {category}: {e}")

if __name__ == '__main__':
    build_site()
    print("Build complete!")