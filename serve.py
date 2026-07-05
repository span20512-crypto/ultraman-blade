#!/usr/bin/env python3
"""Dev server for SOUL FIST: http.server with caching disabled,
so the browser always loads the latest code after edits."""
import http.server
import socketserver
import sys

# 默认 8787; worktree 并行开发时传端口参数错开: python3 serve.py 8788
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
        print(f'SOUL FIST dev server: http://localhost:{PORT}')
        httpd.serve_forever()
