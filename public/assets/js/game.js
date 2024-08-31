
if (document.querySelector("#txt1.input")) {
    const hide1 = document.getElementById('hide1');
    const txt1 = document.getElementById('txt1');
    const teamId = document.getElementById('teamId');
    resize(teamId, txt1, hide1);
    teamId.addEventListener("input", () => resize(teamId, txt1, hide1));
    teamId.addEventListener("blur", () => resize(teamId, txt1, hide1));
    function resize(txt, txt2, hide) {
        hide.textContent = txt.value;
        txt2.style.width = Math.max(50, Math.min(hide.getBoundingClientRect().width, txt.getBoundingClientRect().width)) + 'px';
    }
} else {

}
setInterval(() => {
    document.querySelector(".glitch").classList.toggle("active");
    setTimeout(() => {
        document.querySelector(".glitch").classList.toggle("active");
    }, 1000);
}, 10000);