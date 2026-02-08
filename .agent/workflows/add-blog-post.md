---
description: How to add a new blog post to the website
---

1. Open `client/src/data/blog-posts.ts`.
2. Add a new object to the `BLOG_POSTS` array with the following structure:
   ```typescript
   {
       slug: "your-post-slug", // URL-friendly string (e.g., "new-ai-trends-2026")
       title: "Your Post Title",
       excerpt: "A short summary for the card view.",
       content: `
           <p class="mb-4">Your HTML content here...</p>
           <h2 class="text-2xl font-bold mt-8 mb-4">Section Title</h2>
           <p class="mb-4">More content...</p>
       `,
       category: "Category Name", // e.g., "Clinical AI", "Healthcare Technology"
       author: "Author Name",
       authorRole: "Author Role",
       date: "Month Day, Year",
       readTime: "X min read",
       featured: false, // Set to true to show in the "Featured" section
   }
   ```
3. Save the file.
4. Run `npm run dev` to preview locally at `http://localhost:5000/blog`.
5. If satisfied, commit and push to deploy:
   ```bash
   git add client/src/data/blog-posts.ts
   git commit -m "content: Add new blog post: [Title]"
   git push origin main
   ```
