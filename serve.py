#!/usr/bin/env python3
"""Dev server for SOUL BLADE: http.server with caching disabled,
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
    # A browser may keep one asset connection open; the single-threaded server
    # would then stop accepting every other request and appear to be offline.
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer(('', PORT), NoCacheHandler) as httpd:
        print(f'SOUL BLADE dev server: http://localhost:{PORT}')
        httpd.serve_forever()
