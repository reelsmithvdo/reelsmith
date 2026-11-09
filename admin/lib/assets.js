// Posts store public addresses (/assets/blog/x.webp). Inside the admin, show them through the admin's
// own asset route, which reads blog images from MongoDB and other files from the website folder.
export const adminSrc = (src) => (typeof src === 'string' && src.startsWith('/assets/') ? '/admin/api' + src.replace('/assets/', '/asset/') : src);
export const toEditorHtml = (html) => String(html || '').replace(/(src=")\/assets\//g, '$1/admin/api/asset/');
export const fromEditorHtml = (html) => String(html || '').replace(/(src=")\/admin\/api\/asset\//g, '$1/assets/');
