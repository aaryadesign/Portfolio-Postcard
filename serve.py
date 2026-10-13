# Static dev server with caching disabled, so edits show up on a plain reload.
import http.server
import os
import sys
from functools import partial


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # behave like GitHub Pages: /page serves page.html
    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and os.path.exists(p + ".html"):
            return p + ".html"
        return p

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 5188
root = sys.argv[2] if len(sys.argv) > 2 else "."
http.server.ThreadingHTTPServer(("", port), partial(NoCacheHandler, directory=root)).serve_forever()
