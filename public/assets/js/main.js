
const hide1 = document.getElementById('hide1');
const hide2 = document.getElementById('hide2');
const txt1 = document.getElementById('txt1');
const txt2 = document.getElementById('txt2');
const teamId = document.getElementById('teamId');
const password = document.getElementById('teampassword');
resize(password, txt2, hide2);
resize(teamId, txt1, hide1);
teamId.addEventListener("input", () => resize(teamId, txt1, hide1));
teamId.addEventListener("blur", () => resize(teamId, txt1, hide1));
password.addEventListener("input", () => resize(password, txt2, hide2));
password.addEventListener("blur", () => resize(password, txt2, hide2));
setInterval(() => {
    document.querySelector(".glitch").classList.toggle("active");
    setTimeout(() => {
        document.querySelector(".glitch").classList.toggle("active");
    }, 1000);
}, 10000);
function resize(txt, txt2, hide) {
    hide.textContent = txt.value;
    txt2.style.width = Math.max(50, Math.min(hide.getBoundingClientRect().width, txt.getBoundingClientRect().width)) + 'px';
}