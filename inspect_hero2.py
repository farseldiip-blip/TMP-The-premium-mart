with open("D:/code/TMP-The premium mart/site/index.html", "r") as f:
    html = f.read()
import re
for m in re.finditer(r'<section class="tpm-hero"', html):
    start = m.start()
    end = html.find("</section>", start) + len("</section>")
    print(html[start:end])