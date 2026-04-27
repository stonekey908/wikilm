// WikiLM web-clipper — loaded by the bookmarklet via <script src>.
// All real logic lives here so the bookmarklet stays tiny and immune
// to Safari's URL-field mangling (STO-1960). Update this file to change
// clipper behavior — the bookmarklet busts cache via ?<timestamp>.
(function () {
  var f = document.createElement("form");
  f.method = "POST";
  f.action = "https://localhost:3000/api/clip";
  f.target = "_blank";
  var add = function (name, value) {
    var input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    f.appendChild(input);
  };
  add("url", location.href);
  add("title", document.title);
  add("html", document.documentElement.outerHTML.slice(0, 500000));
  document.body.appendChild(f);
  f.submit();
  document.body.removeChild(f);
})();
