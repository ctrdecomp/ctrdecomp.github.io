fetch("/worm/bar.html")
.then(response => response.text())
.then(html => {
                document.getElementById("bar").innerHTML = html;
            });
