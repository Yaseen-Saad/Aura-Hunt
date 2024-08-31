
document.getElementById("submit").addEventListener("click", function () {
    fetch('/teamlogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: teamId.value, password: password.value })
    }).then((response) => response.json())
      .then(data => {
        if (data.message === "Team logged in successfully") {
          localStorage.setItem("teamToken", data.token)
          localStorage.setItem("teamId", teamId.value)
          document.getElementById("modal-toggle").click()
          document.querySelector(".modal-content p").innerText = "Ready to Hunt Aura ?"
          document.querySelector("#alert-button").onclick = () => {
            location.href += "instructions"
          }
          setTimeout(() => location.href += "instructions", 2000)
        } else if (data.message === "Wrong password") {
          document.getElementById("modal-toggle").click()
          document.querySelector(".modal-content p").innerText = "Wrong password"
        } else {
          document.getElementById("modal-toggle").click()
          document.querySelector(".modal-content p").innerText = "Wrong Credentials"
        }
      }
      ).catch(error => console.log(error))
  })